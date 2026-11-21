import {UserProfile} from '@loopback/security';
import {Request, Response} from '@loopback/rest';

export type FileUploadHandler = (
  request: Request,
  response: Response,
  cb: (err: unknown) => void,
) => void;

export interface Credentials {
  email: string;
  password: string;
}

export type LmsUserRole =
  | 'student_junior'
  | 'student_senior'
  | 'open_learner'
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
  /** Grade master id — needed so FE can resolve class number after login (BUG-032) */
  gradeLevelId?: string;
  fullName?: string;
  isOnboarding?: boolean;
}

export interface AuthorizeMetadata {
  roles?: string[];
  permissions?: string[];
}
