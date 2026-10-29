import { belongsTo, Entity, hasMany, model, property } from '@loopback/repository';
import { GradeLevels } from './grade-levels.model';
import { Lesson } from './lesson.model';
import { Module } from './module.model';
import { Subjects } from './subjects.model';
import { Users } from './users.model';

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
    postgresql: { dataType: 'text' },
  })
  description?: string;

  @belongsTo(() => Subjects)
  subjectId: string;

  /**
   * Required for curriculum courses; null for open (workforce) courses.
   */
  @belongsTo(() => GradeLevels)
  gradeLevelId?: string;

  @belongsTo(() => Users, { name: 'instructor' })
  instructorId?: string;

  @belongsTo(() => Users, { name: 'author' })
  authorId?: string;

  /**
   * 'curriculum' = grade-based K-12 courses (default, existing behavior)
   * 'open' = workforce / certification courses with no grade
   */
  @property({
    type: 'string',
    default: 'curriculum',
    postgresql: {
      columnName: 'course_type',
      dataType: 'text',
    },
  })
  courseType?: 'curriculum' | 'open';

  @property({
    type: 'string',
  })
  duration?: string;

  @property({
    type: 'number',
    postgresql: {
      columnName: 'duration_weeks',
      dataType: 'integer',
    },
  })
  durationWeeks?: number;

  @property({
    type: 'string',
  })
  tagline?: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  certifications?: string[];

  @property({
    type: 'number',
    default: 1.0,
    postgresql: { dataType: 'double precision' },
  })
  credits?: number;

  @property({
    type: 'string',
  })
  emoji?: string;

  @property({
    type: 'string',
    default: 'published', // 'draft' | 'published' | 'archived'
  })
  status?: string;

  @property({
    type: 'boolean',
    default: false,
  })
  ncaaApproved?: boolean;

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

  @property({
    type: 'date',
  })
  deletedAt?: Date;

  @hasMany(() => Module, { keyTo: 'courseId' })
  modules?: Module[];

  @hasMany(() => Lesson, { keyTo: 'courseId' })
  lessons?: Lesson[];

  constructor(data?: Partial<Course>) {
    super(data);
  }
}

export type CourseWithRelations = Course;
