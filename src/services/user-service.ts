import { UserService } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { securityId, UserProfile } from '@loopback/security';
import {
  RolesRepository,
  StudentProfileRepository,
  UserRolesRepository,
  UsersRepository,
} from '../repositories';
import { Credentials, LmsUserProfile } from '../types';
import { BcryptHasher } from './hash.password.bcrypt';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  roles: string[];
  permissions?: string[];
  fullName?: string;
  gradeLevel?: string | null;
  isActive?: boolean;
  isOnboarding?: boolean;
}

export class MyUserService implements UserService<UserAccount, Credentials> {
  constructor(
    @inject('service.hasher')
    public hasher: BcryptHasher,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(UserRolesRepository)
    public userRolesRepo: UserRolesRepository,
    @repository(RolesRepository)
    public rolesRepo: RolesRepository,
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
  ) { }

  async verifyCredentials(credentials: Credentials): Promise<UserAccount> {
    if (!credentials.email || !credentials.password) {
      throw new HttpErrors.BadRequest('Email and password are required');
    }

    const email = credentials.email.trim();
    // Prefer exact match, then case-insensitive (BUG-012 login mismatches)
    let userEntity = await this.usersRepo.findOne({
      where: {email},
    });
    if (!userEntity) {
      userEntity = await this.usersRepo.findOne({
        where: {email: {ilike: email} as any},
      });
    }

    if (!userEntity) {
      throw new HttpErrors.Unauthorized('User account not found');
    }

    // BUG-015: soft-deleted accounts must not authenticate
    if (userEntity.isDeleted) {
      throw new HttpErrors.Unauthorized('User account not found');
    }

    if (userEntity.isActive === false) {
      throw new HttpErrors.Unauthorized('User account is inactive');
    }

    if (!userEntity.password) {
      throw new HttpErrors.Unauthorized('Password not set for user account');
    }

    const isPasswordValid = await this.hasher.comparePassword(
      credentials.password,
      userEntity.password,
    );

    if (!isPasswordValid) {
      throw new HttpErrors.Unauthorized('Invalid password credentials');
    }

    // Fetch user roles via hasManyThrough relation inclusion
    const userWithRoles = await this.usersRepo.findById(userEntity.id, {
      include: ['roles'],
    });
    const roles = (userWithRoles.roles || [])
      .filter(r => r.isActive !== false && r.isDeleted !== true)
      .map(r => r.value);

    // gradeLevel is ONLY for student roles; null for staff / open learners without a grade
    const isStudentRole = roles.some(r => r.startsWith('student_'));
    const profile = isStudentRole
      ? await this.studentProfileRepo.findOne({
          where: {usersId: userEntity.id, isDeleted: false},
          include: ['gradeLevel'],
        })
      : null;
    const plainProf: any = profile
      ? typeof profile.toJSON === 'function'
        ? profile.toJSON()
        : profile
      : null;
    // BUG-019: never invent "Grade 10" — return the stored grade or null
    const gradeLevelVal =
      plainProf?.gradeLevel?.label ||
      plainProf?.gradeLevel?.value ||
      null;

    return {
      id: userEntity.id!,
      email: userEntity.email,
      password: userEntity.password,
      roles: roles.length ? roles : ['student_senior'],
      fullName: userEntity.fullName || userEntity.email.split('@')[0],
      gradeLevel: isStudentRole ? gradeLevelVal : null,
      isActive: userEntity.isActive,
      isOnboarding: userEntity.isOnboarding ?? false,
    };
  }

  convertToUserProfile(user: UserAccount): UserProfile {
    const profile: LmsUserProfile = {
      [securityId]: user.id,
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions || [],
      fullName: user.fullName,
      gradeLevel: user.gradeLevel as any,
      isOnboarding: user.isOnboarding ?? false,
    };
    return profile;
  }
}
