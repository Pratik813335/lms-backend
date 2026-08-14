import { BindingKey } from '@loopback/core';
import { TokenService, UserService } from '@loopback/authentication';
import { BcryptHasher } from './services/hash.password.bcrypt';
import type { EmailService } from './services/email.service';
import type { OtpService } from './services/otp.service';
import { RbacService } from './services/rbac.service';
import { Credentials } from './types';

export namespace TokenServiceConstants {
  export const TOKEN_SECRET_VALUE = process.env.JWT_SECRET || 'lms_super_secret_jwt_key_2026_velocrafts';
  export const TOKEN_EXPIRES_IN_VALUE = process.env.JWT_EXPIRES_IN || '24h';
}

export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>('jwt.secret');
  export const TOKEN_EXPIRES_IN = BindingKey.create<string>('jwt.expiresIn');
  export const TOKEN_SERVICE = BindingKey.create<TokenService>('services.jwt.service');
}

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<BcryptHasher>('services.hasher');
}

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<any, Credentials>>('services.user.service');
}

export namespace RbacServiceBindings {
  export const RBAC_SERVICE = BindingKey.create<RbacService>('services.rbac.service');
}

export namespace EmailServiceBindings {
  export const EMAIL_SERVICE = BindingKey.create<EmailService>('services.email.service');
}

export namespace OtpServiceBindings {
  export const OTP_SERVICE = BindingKey.create<OtpService>('services.otp.service');
}
