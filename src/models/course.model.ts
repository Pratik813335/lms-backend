import {Entity, hasMany, model, property} from '@loopback/repository';
import {Module} from './module.model';
import {Lesson} from './lesson.model';

@model({
  settings: {
    postgresql: {
      table: 'courses',
      schema: 'public',
    },
  },
})
export class Course extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
  })
  subtitle?: string;

  @property({
    type: 'string',
    postgresql: {dataType: 'text'},
  })
  description?: string;

  @property({
    type: 'string',
    required: true,
  })
  subject: string;

  @property({
    type: 'string',
    required: true,
  })
  gradeLevel: string;

  @property({
    type: 'string',
    required: true,
    default: 'senior', // 'junior' | 'senior'
  })
  tier: string;

  @property({
    type: 'string',
  })
  instructor?: string;

  @property({
    type: 'string',
  })
  duration?: string;

  @property({
    type: 'number',
    default: 1.0,
    postgresql: {dataType: 'double precision'},
  })
  credits?: number;

  @property({
    type: 'string',
  })
  emoji?: string;

  @property({
    type: 'string',
  })
  color?: string;

  @property({
    type: 'string',
  })
  bg?: string;

  @property({
    type: 'string',
  })
  border?: string;

  @property({
    type: 'boolean',
    default: true,
  })
  ncaaApproved?: boolean;

  @property({
    type: 'string',
    default: 'published', // 'draft' | 'published' | 'archived'
  })
  status?: string;

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
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt?: Date;

  @hasMany(() => Module, {keyTo: 'courseId'})
  modules: Module[];

  @hasMany(() => Lesson, {keyTo: 'courseId'})
  lessons: Lesson[];

  constructor(data?: Partial<Course>) {
    super(data);
  }
}

export type CourseWithRelations = Course;
