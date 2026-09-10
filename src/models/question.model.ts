import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Assessment} from './assessment.model';

@model({
  settings: {
    postgresql: {
      table: 'questions',
      schema: 'public',
    },
  },
})
export class Question extends Entity {
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
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'type',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  type: string; // 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'scenario'

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'text',
      dataType: 'text',
    },
  })
  text: string;

  @property({
    type: 'array',
    itemType: 'string',
    postgresql: {
      columnName: 'options',
      dataType: 'jsonb',
    },
  })
  options?: string[];

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'correct_answer',
      dataType: 'text',
    },
  })
  correctAnswer: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'explanation',
      dataType: 'text',
    },
  })
  explanation?: string;

  @property({
    type: 'number',
    default: 10,
    postgresql: {
      columnName: 'points',
      dataType: 'integer',
    },
  })
  points?: number;

  @property({
    type: 'number',
    default: 1,
    postgresql: {
      columnName: 'order_index',
      dataType: 'integer',
    },
  })
  orderIndex?: number;

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

  constructor(data?: Partial<Question>) {
    super(data);
  }
}

export interface QuestionRelations {
  assessment?: Assessment;
}

export type QuestionWithRelations = Question & QuestionRelations;
