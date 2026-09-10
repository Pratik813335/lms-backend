import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'certificates',
      schema: 'public',
    },
  },
})
export class Certificate extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id?: string;

  @belongsTo(
    () => Users,
    {name: 'users'},
    {
      type: 'string',
      postgresql: {
        columnName: 'users_id',
        dataType: 'uuid',
      },
    },
  )
  usersId: string;

  @belongsTo(
    () => Course,
    {name: 'course'},
    {
      type: 'string',
      postgresql: {
        columnName: 'course_id',
        dataType: 'uuid',
      },
    },
  )
  courseId: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'certificate_number',
      dataType: 'character varying',
      dataLength: 100,
    },
  })
  certificateNumber: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'student_name',
      dataType: 'character varying',
      dataLength: 255,
    },
  })
  studentName: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'course_name',
      dataType: 'character varying',
      dataLength: 255,
    },
  })
  courseName: string;

  @property({
    type: 'number',
    default: 1.0,
    postgresql: {
      columnName: 'credits',
      dataType: 'double precision',
    },
  })
  credits?: number;

  @property({
    type: 'string',
    default: 'LucidPrep Accredited Academy',
    postgresql: {
      columnName: 'accreditation_body',
      dataType: 'character varying',
      dataLength: 255,
    },
  })
  accreditationBody?: string;

  @property({
    type: 'string',
    default: 'issued',
    postgresql: {
      columnName: 'status',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  status?: string; // 'issued' | 'pending'

  @property({
    type: 'string',
    default: 'course_completion',
    postgresql: {
      columnName: 'type',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  type?: string; // 'course_completion' | 'academic_award' | 'scholarship'

  @property({
    type: 'date',
    postgresql: {
      columnName: 'issue_date',
      dataType: 'timestamp with time zone',
    },
  })
  issueDate?: Date;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'verification_hash',
      dataType: 'character varying',
      dataLength: 255,
    },
  })
  verificationHash?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'pdf_url',
      dataType: 'text',
    },
  })
  pdfUrl?: string;

  @property({
    type: 'boolean',
    default: true,
    postgresql: {
      columnName: 'is_active',
      dataType: 'boolean',
    },
  })
  isActive?: boolean;

  @property({
    type: 'boolean',
    default: false,
    postgresql: {
      columnName: 'is_deleted',
      dataType: 'boolean',
    },
  })
  isDeleted?: boolean;

  @property({
    type: 'date',
    postgresql: {
      columnName: 'created_at',
      dataType: 'timestamp with time zone',
    },
  })
  createdAt?: Date;

  @property({
    type: 'date',
    postgresql: {
      columnName: 'updated_at',
      dataType: 'timestamp with time zone',
    },
  })
  updatedAt?: Date;

  constructor(data?: Partial<Certificate>) {
    super(data);
  }
}

export interface CertificateRelations {
  users?: Users;
  course?: Course;
}

export type CertificateWithRelations = Certificate & CertificateRelations;
