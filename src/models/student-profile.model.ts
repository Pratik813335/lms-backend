import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'student_profiles',
      schema: 'public',
    },
  },
})
export class StudentProfile extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id?: string;

  @belongsTo(() => Users)
  usersId: string;

  @property({
    type: 'string',
    default: 'Grade 10',
  })
  gradeLevel?: string;

  @property({
    type: 'string',
    default: 'senior',
  })
  tier?: 'junior' | 'senior';

  @property({
    type: 'number',
    default: 0,
  })
  xp?: number;

  @property({
    type: 'number',
    default: 1,
  })
  level?: number;

  @property({
    type: 'number',
    default: 0,
  })
  streakDays?: number;

  @property({
    type: 'number',
    default: 0.0,
    postgresql: {
      dataType: 'double precision',
    },
  })
  gpa?: number;

  @property({
    type: 'number',
    default: 0,
  })
  completedLessons?: number;

  @property({
    type: 'number',
    default: 0,
  })
  enrolledCoursesCount?: number;

  @property({
    type: 'string',
    default: 'Welcome to LucidPrep LMS! Complete your first lesson to unlock personalized AI learning insights.',
  })
  aiInsights?: string;

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

  constructor(data?: Partial<StudentProfile>) {
    super(data);
  }
}

export type StudentProfileWithRelations = StudentProfile;
