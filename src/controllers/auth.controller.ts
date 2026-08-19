import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import {
  post,
  get,
  requestBody,
  HttpErrors,
  ResponseObject,
} from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import {
  GradeLevelsRepository,
  RolesRepository,
  StudentProfileRepository,
  UsersRepository,
} from '../repositories';
import {
  BcryptHasher,
  JWTService,
  MyUserService,
  OtpService,
  RbacService,
} from '../services';
import { Credentials, LmsUserProfile } from '../types';

const LOGIN_RESPONSE: ResponseObject = {
  description: 'JWT Authentication Token Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              roles: { type: 'array', items: { type: 'string' } },
              fullName: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export class AuthController {
  constructor(
    @inject('service.jwt.service')
    public jwtService: JWTService,
    @inject('service.user.service')
    public userService: MyUserService,
    @inject('service.hasher')
    public hasher: BcryptHasher,
    @inject('services.rbac')
    public rbacService: RbacService,
    @inject('services.otp')
    public otpService: OtpService,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(RolesRepository)
    public rolesRepo: RolesRepository,
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
  ) {}

  @post('/auth/login', {
    responses: {
      '200': LOGIN_RESPONSE,
    },
  })
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          },
        },
      },
    })
    credentials: Credentials,
  ): Promise<{ token: string; user: UserProfile }> {
    const user = await this.userService.verifyCredentials(credentials);
    const userProfile = this.userService.convertToUserProfile(user);
    const token = await this.jwtService.generateToken(userProfile);

    return {
      token,
      user: userProfile,
    };
  }

  @post('/auth/signup', {
    responses: {
      '200': {
        description: 'User registration response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                token: { type: 'string' },
                user: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  async signup(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              roleId: { type: 'string' },
              fullName: { type: 'string' },
              gradeLevelId: { type: 'string' },
            },
          },
        },
      },
    })
    userData: {
      email: string;
      password: string;
      roleId?: string;
      fullName?: string;
      gradeLevelId?: string;
    },
  ): Promise<{ message: string; token: string; user: UserProfile }> {
    try {
      // 1. Validate password minimum length & complexity (Security Enhancement)
      if (!userData.password || userData.password.length < 8) {
        throw new HttpErrors.BadRequest('Password must be at least 8 characters long');
      }

      // 2. Validate that requested roleId exists in system roles table BEFORE creating anything
      let targetRole: any = null;
      if (userData.roleId) {
        targetRole = await this.rolesRepo.findOne({
          where: { id: userData.roleId, isActive: true, isDeleted: false },
        });
        if (!targetRole) {
          throw new HttpErrors.BadRequest(
            `Invalid roleId '${userData.roleId}'. Role does not exist in master data.`,
          );
        }
      } else {
        // Default to student_senior master role
        targetRole = await this.rolesRepo.findOne({
          where: { value: 'student_senior', isActive: true, isDeleted: false },
        });
      }

      if (!targetRole) {
        throw new HttpErrors.BadRequest('Default student_senior role not found in master data.');
      }

      // 3. Check if user already exists
      const existingUser = await this.usersRepo.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new HttpErrors.Conflict(`User with email ${userData.email} already exists`);
      }

      // 4. Hash password with bcrypt
      const hashedPassword = await this.hasher.hashPassword(userData.password);

      // 5. Create user in PostgreSQL users table
      const savedUser = await this.usersRepo.create({
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName || userData.email.split('@')[0],
        isActive: true,
      });

      // 6. Assign user role in PostgreSQL user_roles table using RbacService
      await this.rbacService.assignUserRole(savedUser.id!, targetRole.id!);

      // 7. If student, create initial clean student profile in student_profiles table (zero stats)
      const isStudentRole = targetRole.value.startsWith('student_');
      let resolvedGradeDisplay = 'Grade 10';
      if (isStudentRole) {
        const tier = targetRole.value === 'student_junior' ? 'junior' : 'senior';
        let gradeMaster: any = null;

        if (userData.gradeLevelId) {
          gradeMaster = await this.gradeLevelsRepo.findOne({
            where: { id: userData.gradeLevelId, isActive: true, isDeleted: false },
          });
          if (!gradeMaster) {
            throw new HttpErrors.BadRequest(
              `Invalid gradeLevelId '${userData.gradeLevelId}'. Grade level does not exist in master data.`,
            );
          }
        } else {
          const defaultTarget = tier === 'junior' ? 'Grade 6' : 'Grade 10';
          gradeMaster = await this.gradeLevelsRepo.findOne({
            where: { or: [{ value: defaultTarget }, { label: defaultTarget }], isDeleted: false },
          });
        }

        resolvedGradeDisplay = gradeMaster?.value || (tier === 'junior' ? 'Grade 6' : 'Grade 10');

        await this.studentProfileRepo.create({
          usersId: savedUser.id,
          gradeLevelId: gradeMaster?.id,
          tier: tier,
          xp: 0,
          level: 1,
          streakDays: 0,
          gpa: 0.0,
          completedLessons: 0,
          enrolledCoursesCount: 0,
          aiInsights: 'Welcome to LucidPrep LMS! Complete your first lesson to unlock personalized AI learning insights.',
        });
      }

      // 8. Build authenticated user profile & JWT token (gradeLevel is ONLY for student roles, null for staff)
      const userProfile: LmsUserProfile = {
        [securityId]: savedUser.id!,
        id: savedUser.id!,
        email: savedUser.email,
        roles: [targetRole.value as any],
        fullName: savedUser.fullName,
        gradeLevel: isStudentRole ? resolvedGradeDisplay : (null as any),
      };

      const token = await this.jwtService.generateToken(userProfile);

      return {
        message: 'User registered successfully',
        token,
        user: userProfile,
      };
    } catch (error) {
      console.error('SIGNUP ERROR:', error);
      throw error;
    }
  }

  @post('/auth/send-otp', {
    responses: {
      '200': {
        description: 'Send 6-Digit Email OTP Response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                expiresAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async sendOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' },
            },
          },
        },
      },
    })
    payload: { email: string },
  ): Promise<{ message: string; expiresAt: Date }> {
    return this.otpService.generateAndSendOtp(payload.email);
  }

  @post('/auth/verify-otp', {
    responses: {
      '200': {
        description: 'Verify 6-Digit Email OTP Response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async verifyOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'otp'],
            properties: {
              email: { type: 'string', format: 'email' },
              otp: { type: 'string' },
            },
          },
        },
      },
    })
    payload: { email: string; otp: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.otpService.verifyOtp(payload.email, payload.otp);
  }

  @authenticate('jwt')
  @get('/auth/me', {
    responses: {
      '200': {
        description: 'Authenticated User Profile',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  })
  async getCurrentUser(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<UserProfile> {
    return currentUserProfile;
  }

  @get('/auth/roles', {
    responses: {
      '200': {
        description: 'Supported System User Roles',
      },
    },
  })
  async getSupportedRoles(): Promise<{ roles: Array<{ key: string; label: string; description?: string }> }> {
    const roles = await this.rbacService.getAllActiveRoles();
    return { roles };
  }

  @authenticate('jwt')
  @post('/auth/change-password', {
    responses: {
      '200': {
        description: 'Password update confirmation',
      },
    },
  })
  async changePassword(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['oldPassword', 'newPassword'],
            properties: {
              oldPassword: { type: 'string' },
              newPassword: { type: 'string' },
            },
          },
        },
      },
    })
    passwordData: { oldPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    if (passwordData.newPassword.length < 8) {
      throw new HttpErrors.BadRequest('New password must be at least 8 characters long');
    }

    const user = await this.usersRepo.findById(currentUser.id);
    if (!user || !user.password) {
      throw new HttpErrors.NotFound('User record not found');
    }

    const isOldValid = await this.hasher.comparePassword(
      passwordData.oldPassword,
      user.password,
    );

    if (!isOldValid) {
      throw new HttpErrors.BadRequest('Current password is incorrect');
    }

    const newHashed = await this.hasher.hashPassword(passwordData.newPassword);
    await this.usersRepo.updateById(user.id, {
      password: newHashed,
      updatedAt: new Date(),
    });

    return {
      message: 'Password updated successfully',
    };
  }
}
