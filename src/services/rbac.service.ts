import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {LmsUserRole, LmsUserProfile} from '../types';

@injectable({scope: BindingScope.SINGLETON})
export class RbacService {
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
