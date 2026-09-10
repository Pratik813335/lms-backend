import {belongsTo, Entity, hasMany, model, property} from '@loopback/repository';
import {Subjects} from './subjects.model';
import {WritingLabSubmission} from './writing-lab-submission.model';

@model({
  settings: {
    postgresql: {
      table: 'writing_prompts',
      schema: 'public',
    },
  },
})
export class WritingPrompt extends Entity {
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
  subjectId: string;

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
      columnName: 'subject_category',
      dataType: 'character varying',
      dataLength: 100,
    },
  })
  subjectCategory?: string; // e.g. 'English — Argumentative'

  @property({
    type: 'string',
    postgresql: {
      columnName: 'grade_level',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  gradeLevel?: string; // '9-12' | '7-10'

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'prompt',
      dataType: 'text',
    },
  })
  prompt: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'target_length',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  targetLength?: string; // e.g. '800-1000 words'

  @property({
    type: 'string',
    postgresql: {
      columnName: 'format',
      dataType: 'character varying',
      dataLength: 100,
    },
  })
  format?: string; // 'ACT / Common Core Argumentative'

  @property({
    type: 'object',
    postgresql: {
      columnName: 'rubric',
      dataType: 'jsonb',
    },
  })
  rubric?: Record<string, {maxScore: number; criteria: string}>;

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

  @hasMany(() => WritingLabSubmission, {keyTo: 'promptId'})
  submissions?: WritingLabSubmission[];

  constructor(data?: Partial<WritingPrompt>) {
    super(data);
  }
}

export interface WritingPromptRelations {
  subject?: Subjects;
  submissions?: WritingLabSubmission[];
}

export type WritingPromptWithRelations = WritingPrompt & WritingPromptRelations;
