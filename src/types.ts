import {UserProfile} from '@loopback/security';

export interface Credentials {
  email: string;
  password: string;
}

export type LmsUserRole =
  | 'student_junior'
  | 'student_senior'
  | 'admin'
  | 'academic'
  | 'content'
  | 'operations';

export interface LmsUserProfile extends UserProfile {
  id: string;
  email: string;
  roles: string[];
  permissions?: string[];
  gradeLevel?: string;
  fullName?: string;
}

export interface AuthorizeMetadata {
  roles?: string[];
  permissions?: string[];
}
