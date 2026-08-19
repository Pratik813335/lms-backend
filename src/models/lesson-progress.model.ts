import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Lesson} from './lesson.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'lesson_progress',
      schema: 'public',
    },
  },
})
export class LessonProgress extends Entity {
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
    () => Lesson,
    {name: 'lesson'},
    {
      type: 'string',
      postgresql: {
        dataType: 'uuid',
      },
    },
  )
  lessonId: string;

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
    type: 'boolean',
    default: true,
  })
  isCompleted?: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  completedAt?: Date;

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

  constructor(data?: Partial<LessonProgress>) {
    super(data);
  }
}

export type LessonProgressWithRelations = LessonProgress;
