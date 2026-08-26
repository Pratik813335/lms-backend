import {HttpErrors} from '@loopback/rest';

/**
 * Validates strong password policy:
 * - At least 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special character (!@#$%^&*...)
 */
export function validateStrongPassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new HttpErrors.BadRequest('Password is required');
  }

  if (password.length < 8) {
    throw new HttpErrors.BadRequest('Password must be at least 8 characters long');
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    throw new HttpErrors.BadRequest(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#$%^&*).',
    );
  }
}
