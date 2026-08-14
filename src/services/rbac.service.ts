import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {RolesRepository, UserRolesRepository, UsersRepository} from '../repositories';
import {LmsUserRole, LmsUserProfile} from '../types';

@injectable({scope: BindingScope.TRANSIENT})
export class RbacService {
  constructor(
    @repository(UsersRepository)
    private usersRepo: UsersRepository,
    @repository(RolesRepository)
    private rolesRepo: RolesRepository,
    @repository(UserRolesRepository)
    private userRolesRepo: UserRolesRepository,
  ) {}

  /**
   * Fetch all active non-deleted system roles directly from PostgreSQL database
   */
  async getAllActiveRoles() {
    const roles = await this.rolesRepo.find({
      where: {isActive: true, isDeleted: false},
    });

    return roles.map(r => ({
      key: r.value,
      label: r.label,
      description: r.description,
    }));
  }

  /**
   * Assign role to user in user_roles table matching Amplio pattern.
   * Throws 400 Bad Request if roleValue does not exist in system roles.
   */
  async assignUserRole(userId: string, roleValue: string) {
    const role = await this.rolesRepo.findOne({
      where: {value: roleValue, isActive: true, isDeleted: false},
    });

    if (!role) {
      const activeRoles = await this.getAllActiveRoles();
      const validKeys = activeRoles.map(r => r.key).join(', ');
      throw new HttpErrors.BadRequest(
        `Invalid role '${roleValue}'. Allowed system roles are: ${validKeys}`,
      );
    }

    const existingUserRole = await this.userRolesRepo.findOne({
      where: {usersId: userId, rolesId: role.id},
    });

    if (existingUserRole) {
      if (!existingUserRole.isActive) {
        await this.userRolesRepo.updateById(existingUserRole.id, {isActive: true});
      }
      return existingUserRole;
    }

    return this.userRolesRepo.create({
      usersId: userId,
      rolesId: role.id,
      isActive: true,
      isDeleted: false,
    });
  }

  /**
   * Validate that the current user profile has at least one of the required roles
   */
  validateRole(userProfile: LmsUserProfile, allowedRoles: LmsUserRole[]): void {
    if (!userProfile || !userProfile.roles) {
      throw new HttpErrors.Forbidden('Access Denied: No roles associated with user');
    }

    const hasRole = userProfile.roles.some(role =>
      allowedRoles.includes(role as LmsUserRole) || role === 'admin'
    );

    if (!hasRole) {
      throw new HttpErrors.Forbidden(
        `Access Denied: Required role [${allowedRoles.join(', ')}], but user has [${userProfile.roles.join(', ')}]`,
      );
    }
  }

  /**
   * Validate specific granular permission
   */
  validatePermission(userProfile: LmsUserProfile, requiredPermission: string): void {
    if (!userProfile || !userProfile.permissions) {
      throw new HttpErrors.Forbidden('Access Denied: No permissions associated with user');
    }

    if (!userProfile.permissions.includes(requiredPermission) && !userProfile.roles?.includes('admin')) {
      throw new HttpErrors.Forbidden(`Access Denied: Missing permission '${requiredPermission}'`);
    }
  }
}
