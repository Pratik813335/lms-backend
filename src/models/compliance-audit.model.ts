import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'compliance_audits',
      schema: 'public',
    },
  },
})
export class ComplianceAudit extends Entity {
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

  @belongsTo(
    () => Users,
    {name: 'auditor'},
    {
      type: 'string',
      postgresql: {
        columnName: 'auditor_id',
        dataType: 'uuid',
      },
    },
  )
  auditorId: string;

  @property({
    type: 'boolean',
    default: true,
    postgresql: {
      columnName: 'ncaa_approved',
      dataType: 'boolean',
    },
  })
  ncaaApproved?: boolean;

  @property({
    type: 'boolean',
    default: true,
    postgresql: {
      columnName: 'syllabus_approved',
      dataType: 'boolean',
    },
  })
  syllabusApproved?: boolean;

  @property({
    type: 'number',
    default: 100.0,
    postgresql: {
      columnName: 'academic_integrity_score',
      dataType: 'double precision',
    },
  })
  academicIntegrityScore?: number;

  @property({
    type: 'string',
    default: 'approved',
    postgresql: {
      columnName: 'status',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  status?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'notes',
      dataType: 'text',
    },
  })
  notes?: string;

  @property({
    type: 'date',
    postgresql: {
      columnName: 'audited_at',
      dataType: 'timestamp with time zone',
    },
  })
  auditedAt?: Date;

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

  constructor(data?: Partial<ComplianceAudit>) {
    super(data);
  }
}

export interface ComplianceAuditRelations {
  course?: Course;
  auditor?: Users;
}

export type ComplianceAuditWithRelations = ComplianceAudit & ComplianceAuditRelations;
