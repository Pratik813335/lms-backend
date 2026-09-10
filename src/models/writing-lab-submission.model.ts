import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Media} from './media.model';
import {Users} from './users.model';
import {WritingPrompt} from './writing-prompt.model';

@model({
  settings: {
    postgresql: {
      table: 'writing_lab_submissions',
      schema: 'public',
    },
  },
})
export class WritingLabSubmission extends Entity {
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
    () => WritingPrompt,
    {name: 'prompt'},
    {
      type: 'string',
      postgresql: {
        columnName: 'prompt_id',
        dataType: 'uuid',
      },
    },
  )
  promptId: string;

  @belongsTo(
    () => Media,
    {name: 'attachmentMedia'},
    {
      type: 'string',
      postgresql: {
        columnName: 'attachment_media_id',
        dataType: 'uuid',
      },
    },
  )
  attachmentMediaId?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'essay_text',
      dataType: 'text',
    },
  })
  essayText: string;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'word_count',
      dataType: 'integer',
    },
  })
  wordCount?: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'overall_score',
      dataType: 'double precision',
    },
  })
  overallScore?: number;

  @property({
    type: 'string',
    default: 'Proficient',
    postgresql: {
      columnName: 'overall_label',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  overallLabel?: string; // 'Advanced' | 'Proficient' | 'Developing' | 'Emerging'

  @property({
    type: 'object',
    postgresql: {
      columnName: 'dimension_scores',
      dataType: 'jsonb',
    },
  })
  dimensionScores?: {
    ideasAndAnalysis: number;
    developmentAndSupport: number;
    organization: number;
    languageUse: number;
  };

  @property({
    type: 'object',
    postgresql: {
      columnName: 'ai_feedback',
      dataType: 'jsonb',
    },
  })
  aiFeedback?: {
    headline: string;
    grammarFeedback: string[];
    suggestions: string[];
  };

  @property({
    type: 'string',
    default: 'evaluated',
    postgresql: {
      columnName: 'status',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  status?: string;

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

  constructor(data?: Partial<WritingLabSubmission>) {
    super(data);
  }
}

export interface WritingLabSubmissionRelations {
  users?: Users;
  prompt?: WritingPrompt;
  attachmentMedia?: Media;
}

export type WritingLabSubmissionWithRelations = WritingLabSubmission & WritingLabSubmissionRelations;
