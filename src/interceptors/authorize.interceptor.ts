import {AuthenticationBindings} from '@loopback/authentication';
import {
  Getter,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  globalInterceptor,
  inject,
} from '@loopback/core';
import {MetadataInspector} from '@loopback/metadata';
import {HttpErrors} from '@loopback/rest';
import {AUTHORIZE_KEY, AuthorizeMetadata} from '../authorization/authorize.decorator';
import {LmsUserProfile} from '../types';

@globalInterceptor('authorization', {tags: {name: 'authorize'}})
export class AuthorizeInterceptor implements Provider<Interceptor> {
  constructor(
    @inject.getter(AuthenticationBindings.CURRENT_USER)
    private getCurrentUser: Getter<LmsUserProfile>,
  ) {}

  value(): Interceptor {
    return this.intercept.bind(this);
  }

  async intercept(
    context: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    const authMeta: AuthorizeMetadata | undefined = MetadataInspector.getMethodMetadata(
      AUTHORIZE_KEY,
      context.target!.constructor.prototype,
      context.methodName,
    );

    if (!authMeta) {
      return next();
    }

    const requiredRoles = authMeta.allowedRoles ?? [];
    const requiredPermissions = authMeta.permissions ?? [];

    if (!requiredRoles.length && !requiredPermissions.length) {
      return next();
    }

    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new HttpErrors.Unauthorized('User not authenticated');
    }

    // ADMIN BYPASS
    if (currentUser.roles?.includes('admin')) {
      return next();
    }

    // ROLE CHECK
    if (requiredRoles.length > 0) {
      const hasRole = currentUser.roles?.some(r => requiredRoles.includes(r as any));
      if (!hasRole) {
        throw new HttpErrors.Forbidden(
          `Forbidden: Required role [${requiredRoles.join(', ')}], user has [${currentUser.roles?.join(', ')}]`,
        );
      }
    }

    // PERMISSION CHECK
    if (requiredPermissions.length > 0) {
      const hasPermission = currentUser.permissions?.some(p => requiredPermissions.includes(p));
      if (!hasPermission) {
        throw new HttpErrors.Forbidden(
          `Forbidden: Required permission [${requiredPermissions.join(', ')}]`,
        );
      }
    }

    return next();
  }
}
