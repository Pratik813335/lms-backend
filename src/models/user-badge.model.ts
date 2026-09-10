import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Badge} from './badge.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'user_badges',
      schema: 'public',
    },
  },
})
export class UserBadge extends Entity {
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
    () => Badge,
    {name: 'badge'},
    {
      type: 'string',
      postgresql: {
        columnName: 'badge_id',
        dataType: 'uuid',
      },
    },
  )
  badgeId: string;

  @property({
    type: 'date',
    postgresql: {
      columnName: 'unlocked_at',
      dataType: 'timestamp with time zone',
    },
  })
  unlockedAt?: Date;

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

  constructor(data?: Partial<UserBadge>) {
    super(data);
  }
}

export interface UserBadgeRelations {
  users?: Users;
  badge?: Badge;
}

export type UserBadgeWithRelations = UserBadge & UserBadgeRelations;
