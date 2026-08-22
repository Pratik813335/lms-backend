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
  ) { }

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

  @post('/auth/student/signup', {
    responses: {
      '200': {
        description: 'Student registration with automatic role mapping from gradeLevelId',
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
  async studentSignup(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password', 'gradeLevelId'],
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
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
      fullName?: string;
      gradeLevelId: string;
    },
  ): Promise<{ message: string; token: string; user: UserProfile }> {
    try {
      if (!userData.password || userData.password.length < 8) {
        throw new HttpErrors.BadRequest('Password must be at least 8 characters long');
      }

      if (!userData.gradeLevelId) {
        throw new HttpErrors.BadRequest('gradeLevelId is required for student registration');
      }

      // 1. Validate gradeLevelId against master data
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: { id: userData.gradeLevelId, isActive: true, isDeleted: false },
      });

      if (!gradeMaster) {
        throw new HttpErrors.BadRequest(
          `Invalid gradeLevelId '${userData.gradeLevelId}'. Grade level does not exist in master data.`,
        );
      }

      // 2. Automatically map to student_junior or student_senior role based on gradeLevel.category
      const roleKey = gradeMaster.category === 'junior' ? 'student_junior' : 'student_senior';
      const targetRole = await this.rolesRepo.findOne({
        where: { value: roleKey, isActive: true, isDeleted: false },
      });

      if (!targetRole) {
        throw new HttpErrors.BadRequest(`System role '${roleKey}' not found in master data.`);
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

      // 6. Assign student role in PostgreSQL user_roles table
      await this.rbacService.assignUserRole(savedUser.id!, targetRole.id!);

      // 7. Create initial student profile in student_profiles table
      await this.studentProfileRepo.create({
        usersId: savedUser.id,
        gradeLevelId: gradeMaster.id,
        xp: 0,
        level: 1,
        streakDays: 0,
        gpa: 0.0,
        completedLessons: 0,
        enrolledCoursesCount: 0,
        aiInsights: 'Welcome to LucidPrep LMS! Complete your first lesson to unlock personalized AI learning insights.',
      });

      // 8. Build authenticated user profile & JWT token
      const userProfile: LmsUserProfile = {
        [securityId]: savedUser.id!,
        id: savedUser.id!,
        email: savedUser.email,
        roles: [targetRole.value as any],
        fullName: savedUser.fullName,
        gradeLevel: gradeMaster.value || gradeMaster.label,
      };

      const token = await this.jwtService.generateToken(userProfile);

      return {
        message: 'Student registered successfully',
        token,
        user: userProfile,
      };
    } catch (err) {
      console.error('STUDENT SIGNUP ERROR:', err);
      throw err;
    }
  }

  @post('/auth/signup', {
    responses: {
      '200': {
        description: 'Staff & Admin user registration with explicit roleId',
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
            required: ['email', 'password', 'roleId'],
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              roleId: { type: 'string' },
              fullName: { type: 'string' },
            },
          },
        },
      },
    })
    userData: {
      email: string;
      password: string;
      roleId: string;
      fullName?: string;
    },
  ): Promise<{ message: string; token: string; user: UserProfile }> {
    try {
      // 1. Validate password minimum length
      if (!userData.password || userData.password.length < 8) {
        throw new HttpErrors.BadRequest('Password must be at least 8 characters long');
      }

      if (!userData.roleId) {
        throw new HttpErrors.BadRequest('roleId is required for staff registration');
      }

      // 2. Validate that requested roleId exists in system roles table
      const targetRole = await this.rolesRepo.findOne({
        where: { id: userData.roleId, isActive: true, isDeleted: false },
      });

      if (!targetRole) {
        throw new HttpErrors.BadRequest(
          `Invalid roleId '${userData.roleId}'. Role does not exist in master data.`,
        );
      }

      // 3. Prevent student roles on staff signup endpoint
      if (targetRole.value.startsWith('student_')) {
        throw new HttpErrors.BadRequest(
          'Student registration must use the /auth/student/signup endpoint with gradeLevelId.',
        );
      }

      // 4. Check if user already exists
      const existingUser = await this.usersRepo.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new HttpErrors.Conflict(`User with email ${userData.email} already exists`);
      }

      // 5. Hash password with bcrypt
      const hashedPassword = await this.hasher.hashPassword(userData.password);

      // 6. Create user in PostgreSQL users table
      const savedUser = await this.usersRepo.create({
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName || userData.email.split('@')[0],
        isActive: true,
      });

      // 7. Assign staff role in PostgreSQL user_roles table
      await this.rbacService.assignUserRole(savedUser.id!, targetRole.id!);

      // 8. Build authenticated user profile & JWT token
      const userProfile: LmsUserProfile = {
        [securityId]: savedUser.id!,
        id: savedUser.id!,
        email: savedUser.email,
        roles: [targetRole.value as any],
        fullName: savedUser.fullName,
      };

      const token = await this.jwtService.generateToken(userProfile);

      return {
        message: 'Staff user registered successfully',
        token,
        user: userProfile,
      };
    } catch (err) {
      console.error('SIGNUP ERROR:', err);
      throw err;
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
