import {UserService} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {
  RolesRepository,
  StudentProfileRepository,
  UserRolesRepository,
  UsersRepository,
} from '../repositories';
import {Credentials, LmsUserProfile} from '../types';
import {BcryptHasher} from './hash.password.bcrypt';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  roles: string[];
  permissions?: string[];
  fullName?: string;
  gradeLevel?: string | null;
  isActive?: boolean;
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
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<UserAccount> {
    if (!credentials.email || !credentials.password) {
      throw new HttpErrors.BadRequest('Email and password are required');
    }

    const userEntity = await this.usersRepo.findOne({
      where: {email: credentials.email},
    });

    if (!userEntity) {
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
    const roles = (userWithRoles.roles || []).map(r => r.value);

    // gradeLevel is ONLY for student roles; null for staff roles (admin, content, academic, operations)
    const isStudentRole = roles.some(r => r.startsWith('student_'));
    const profile = isStudentRole
      ? await this.studentProfileRepo.findOne({where: {usersId: userEntity.id}, include: ['gradeLevel']})
      : null;
    const plainProf: any = profile ? (typeof profile.toJSON === 'function' ? profile.toJSON() : profile) : null;
    const isJunior = roles.includes('student_junior');
    const defaultGrade = isJunior ? 'Grade 6' : 'Grade 10';
    const gradeLevelVal = plainProf?.gradeLevel?.value || plainProf?.gradeLevel?.label || defaultGrade;

    return {
      id: userEntity.id!,
      email: userEntity.email,
      password: userEntity.password,
      roles: roles.length ? roles : ['student_senior'],
      fullName: userEntity.fullName || userEntity.email.split('@')[0],
      gradeLevel: isStudentRole ? gradeLevelVal : null,
      isActive: userEntity.isActive,
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
    };
    return profile;
  }
}
