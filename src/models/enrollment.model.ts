import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'enrollments',
      schema: 'public',
    },
  },
})
export class Enrollment extends Entity {
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
    {name: 'user'},
    {
      type: 'string',
      postgresql: {
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
        dataType: 'uuid',
      },
    },
  )
  courseId: string;

  @property({
    type: 'string',
    default: 'active', // 'active' | 'completed' | 'dropped'
  })
  status?: string;

  @property({
    type: 'number',
    default: 0.0,
    postgresql: {dataType: 'double precision'},
  })
  progressRate?: number;

  @property({
    type: 'number',
    default: 0,
  })
  completedLessonsCount?: number;

  @property({
    type: 'number',
    default: 0,
  })
  totalLessonsCount?: number;

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
  enrolledAt?: Date;

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

  constructor(data?: Partial<Enrollment>) {
    super(data);
  }
}

export type EnrollmentWithRelations = Enrollment;
