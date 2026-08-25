import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Module} from './module.model';
import {Media} from './media.model';

@model({
  settings: {
    postgresql: {
      table: 'lessons',
      schema: 'public',
    },
  },
})
export class Lesson extends Entity {
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
    () => Module,
    {name: 'module'},
    {
      type: 'string',
      postgresql: {
        dataType: 'uuid',
      },
    },
  )
  moduleId: string;

  @belongsTo(
    () => Course,
    {name: 'course'},
    {
      type: 'string',
      postgresql: {
        dataType: 'uuid',
      },
    },
  )
  courseId: string;

  @belongsTo(
    () => Media,
    {name: 'media'},
    {
      type: 'string',
      postgresql: {
        dataType: 'uuid',
      },
    },
  )
  mediaId?: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
    default: 'video', // 'video' | 'warmup' | 'reading' | 'assessment'
  })
  type?: string;

  @property({
    type: 'string',
  })
  duration?: string;

  @property({
    type: 'string',
    postgresql: {dataType: 'text'},
  })
  externalUrl?: string;

  @property({
    type: 'number',
    default: 1,
  })
  orderIndex?: number;

  @property({
    type: 'number',
    default: 50, // XP points rewarded on completion
  })
  xpReward?: number;

  @property({
    type: 'boolean',
    default: true,
  })
  isActive?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted?: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {
      dataType: 'timestamptz',
    },
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {
      dataType: 'timestamptz',
    },
  })
  updatedAt?: Date;

  constructor(data?: Partial<Lesson>) {
    super(data);
  }
}

export interface LessonRelations {
  module?: Module;
  course?: Course;
  media?: Media;
}

export type LessonWithRelations = Lesson & LessonRelations;
