import {belongsTo, Entity, hasMany, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {Lesson} from './lesson.model';

@model({
  settings: {
    postgresql: {
      table: 'modules',
      schema: 'public',
    },
  },
})
export class Module extends Entity {
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
        dataType: 'uuid',
      },
    },
  )
  courseId: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
    postgresql: {dataType: 'text'},
  })
  description?: string;

  @property({
    type: 'string',
  })
  weekRange?: string;

  @property({
    type: 'number',
    default: 1,
  })
  orderIndex?: number;

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

  @hasMany(() => Lesson, {keyTo: 'moduleId'})
  lessons: Lesson[];

  constructor(data?: Partial<Module>) {
    super(data);
  }
}

export type ModuleWithRelations = Module;
