import {UserService} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {PasswordHasherBindings} from '../keys';
import {Credentials, LmsUserProfile} from '../types';
import {BcryptHasher} from './hash.password.bcrypt';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  roles: string[];
  permissions?: string[];
  fullName?: string;
  gradeLevel?: string;
  isActive?: boolean;
}

export class MyUserService implements UserService<UserAccount, Credentials> {
  constructor(
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public hasher: BcryptHasher,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<UserAccount> {
    if (!credentials.email || !credentials.password) {
      throw new HttpErrors.BadRequest('Email and password are required');
    }

    // Temporary user account lookup abstraction (will connect to UserRepository)
    const user: UserAccount = {
      id: 'usr_mock_1',
      email: credentials.email,
      password: await this.hasher.hashPassword('password123'), // Default mock for initial setup
      roles: ['student_senior'],
      fullName: 'Demo Student',
      gradeLevel: 'Grade 10',
      isActive: true,
    };

    if (!user.password) {
      throw new HttpErrors.Unauthorized('Password not set for user account');
    }

    const isPasswordValid = await this.hasher.comparePassword(
      credentials.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new HttpErrors.Unauthorized('Invalid password credentials');
    }

    return user;
  }

  convertToUserProfile(user: UserAccount): UserProfile {
    const profile: LmsUserProfile = {
      [securityId]: user.id,
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions || [],
      fullName: user.fullName,
      gradeLevel: user.gradeLevel,
    };
    return profile;
  }
}
