import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Assessment} from './assessment.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'assessment_submissions',
      schema: 'public',
    },
  },
})
export class AssessmentSubmission extends Entity {
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
    () => Assessment,
    {name: 'assessment'},
    {
      type: 'string',
      postgresql: {
        columnName: 'assessment_id',
        dataType: 'uuid',
      },
    },
  )
  assessmentId: string;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      columnName: 'answers',
      dataType: 'jsonb',
    },
  })
  answers: Record<string, string>;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      columnName: 'score',
      dataType: 'double precision',
    },
  })
  score: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'points_earned',
      dataType: 'integer',
    },
  })
  pointsEarned?: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'total_points',
      dataType: 'integer',
    },
  })
  totalPoints?: number;

  @property({
    type: 'boolean',
    required: true,
    postgresql: {
      columnName: 'is_passed',
      dataType: 'boolean',
    },
  })
  isPassed: boolean;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'xp_awarded',
      dataType: 'integer',
    },
  })
  xpAwarded?: number;

  @property({
    type: 'object',
    postgresql: {
      columnName: 'ai_feedback',
      dataType: 'jsonb',
    },
  })
  aiFeedback?: {
    headline: string;
    body: string;
    suggestions: string[];
  };

  @property({
    type: 'date',
    postgresql: {
      columnName: 'submitted_at',
      dataType: 'timestamp with time zone',
    },
  })
  submittedAt?: Date;

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

  constructor(data?: Partial<AssessmentSubmission>) {
    super(data);
  }
}

export interface AssessmentSubmissionRelations {
  users?: Users;
  assessment?: Assessment;
}

export type AssessmentSubmissionWithRelations = AssessmentSubmission & AssessmentSubmissionRelations;
