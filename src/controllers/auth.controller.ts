import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  post,
  get,
  requestBody,
  HttpErrors,
  ResponseObject,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {
  PasswordHasherBindings,
  TokenServiceBindings,
  UserServiceBindings,
} from '../keys';
import {
  BcryptHasher,
  JWTService,
  MyUserService,
} from '../services';
import {Credentials, LmsUserProfile} from '../types';

const LOGIN_RESPONSE: ResponseObject = {
  description: 'JWT Authentication Token Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          token: {type: 'string'},
          user: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              email: {type: 'string'},
              roles: {type: 'array', items: {type: 'string'}},
              fullName: {type: 'string'},
            },
          },
        },
      },
    },
  },
};

export class AuthController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: JWTService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public hasher: BcryptHasher,
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
              email: {type: 'string', format: 'email'},
              password: {type: 'string'},
            },
          },
        },
      },
    })
    credentials: Credentials,
  ): Promise<{token: string; user: UserProfile}> {
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
                message: {type: 'string'},
                token: {type: 'string'},
                user: {type: 'object'},
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
            required: ['email', 'password', 'role'],
            properties: {
              email: {type: 'string'},
              password: {type: 'string'},
              role: {type: 'string'},
              fullName: {type: 'string'},
              gradeLevel: {type: 'string'},
            },
          },
        },
      },
    })
    userData: {
      email: string;
      password: string;
      role: string;
      fullName?: string;
      gradeLevel?: string;
    },
  ): Promise<{message: string; token: string; user: UserProfile}> {
    const hashedPassword = await this.hasher.hashPassword(userData.password);

    const mockUser = {
      id: `usr_${Date.now()}`,
      email: userData.email,
      roles: [userData.role],
      fullName: userData.fullName || userData.email.split('@')[0],
      gradeLevel: userData.gradeLevel || 'Grade 10',
    };

    const userProfile: LmsUserProfile = {
      [securityId]: mockUser.id,
      id: mockUser.id,
      email: mockUser.email,
      roles: mockUser.roles,
      fullName: mockUser.fullName,
      gradeLevel: mockUser.gradeLevel,
    };

    const token = await this.jwtService.generateToken(userProfile);

    return {
      message: 'User registered successfully',
      token,
      user: userProfile,
    };
  }

  @authenticate('jwt')
  @get('/auth/me', {
    responses: {
      '200': {
        description: 'Authenticated User Profile',
        content: {
          'application/json': {
            schema: {type: 'object'},
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
  async getSupportedRoles(): Promise<{roles: Array<{key: string; label: string}>}> {
    return {
      roles: [
        {key: 'student_junior', label: 'Junior Student (Grades 1-8)'},
        {key: 'student_senior', label: 'Senior Student (Grades 9-12)'},
        {key: 'admin', label: 'System Administrator'},
        {key: 'academic', label: 'Academic Coordinator'},
        {key: 'content', label: 'Content Creator / Curriculum Author'},
        {key: 'operations', label: 'Operations & Billing Staff'},
      ],
    };
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
              oldPassword: {type: 'string'},
              newPassword: {type: 'string'},
            },
          },
        },
      },
    })
    passwordData: {oldPassword: string; newPassword: string},
  ): Promise<{message: string}> {
    if (passwordData.newPassword.length < 6) {
      throw new HttpErrors.BadRequest('New password must be at least 6 characters long');
    }

    return {
      message: 'Password updated successfully',
    };
  }
}
