import {belongsTo, Entity, hasMany, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Module} from './module.model';
import {Question} from './question.model';
import {AssessmentSubmission} from './assessment-submission.model';
import {GradeLevels} from './grade-levels.model';
import {Subjects} from './subjects.model';

@model({
  settings: {
    postgresql: {
      table: 'assessments',
      schema: 'public',
    },
  },
})
export class Assessment extends Entity {
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
  courseId?: string;

  @belongsTo(
    () => Module,
    {name: 'module'},
    {
      type: 'string',
      postgresql: {
        columnName: 'module_id',
        dataType: 'uuid',
      },
    },
  )
  moduleId?: string;

  @belongsTo(
    () => GradeLevels,
    {name: 'gradeLevel'},
    {
      type: 'string',
      postgresql: {
        columnName: 'grade_level_id',
        dataType: 'uuid',
      },
    },
  )
  gradeLevelId?: string;

  @belongsTo(
    () => Subjects,
    {name: 'subject'},
    {
      type: 'string',
      postgresql: {
        columnName: 'subject_id',
        dataType: 'uuid',
      },
    },
  )
  subjectId?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'paper_code',
      dataType: 'character varying',
      dataLength: 100,
    },
  })
  paperCode?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'type',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  type: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'title',
      dataType: 'character varying',
      dataLength: 255,
    },
  })
  title: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'description',
      dataType: 'text',
    },
  })
  description?: string;

  @property({
    type: 'number',
    default: 80.0,
    postgresql: {
      columnName: 'passing_percentage',
      dataType: 'double precision',
    },
  })
  passingPercentage?: number;

  @property({
    type: 'number',
    default: 20,
    postgresql: {
      columnName: 'time_limit_minutes',
      dataType: 'integer',
    },
  })
  timeLimitMinutes?: number;

  @property({
    type: 'number',
    default: 100,
    postgresql: {
      columnName: 'xp_reward',
      dataType: 'integer',
    },
  })
  xpReward?: number;

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

  @hasMany(() => Question, {keyTo: 'assessmentId'})
  questions?: Question[];

  @hasMany(() => AssessmentSubmission, {keyTo: 'assessmentId'})
  submissions?: AssessmentSubmission[];

  constructor(data?: Partial<Assessment>) {
    super(data);
  }
}

export interface AssessmentRelations {
  course?: Course;
  module?: Module;
  gradeLevel?: GradeLevels;
  subject?: Subjects;
  questions?: Question[];
  submissions?: AssessmentSubmission[];
}

export type AssessmentWithRelations = Assessment & AssessmentRelations;

