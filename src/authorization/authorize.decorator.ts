import {MethodDecoratorFactory} from '@loopback/core';
import {LmsUserRole} from '../types';

export const AUTHORIZE_KEY = 'authorization.metadata';

export interface AuthorizeMetadata {
  allowedRoles?: LmsUserRole[];
  permissions?: string[];
}

export function authorize(metadata: AuthorizeMetadata) {
  return MethodDecoratorFactory.createDecorator<AuthorizeMetadata>(
    AUTHORIZE_KEY,
    metadata,
  );
}
