import {Entity, hasMany, model, property} from '@loopback/repository';
import {UserBadge} from './user-badge.model';

@model({
  settings: {
    postgresql: {
      table: 'badges',
      schema: 'public',
    },
  },
})
export class Badge extends Entity {
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
    postgresql: {
      columnName: 'title',
      dataType: 'character varying',
      dataLength: 100,
    },
  })
  title: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'description',
      dataType: 'text',
    },
  })
  description?: string;

  @property({
    type: 'string',
    default: 'Star',
    postgresql: {
      columnName: 'icon',
      dataType: 'character varying',
      dataLength: 100,
    },
  })
  icon?: string;

  @property({
    type: 'string',
    default: 'Academic',
    postgresql: {
      columnName: 'category',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  category?: string; // 'Academic' | 'Engagement' | 'Literacy' | 'Writing'

  @property({
    type: 'string',
    default: 'common',
    postgresql: {
      columnName: 'rarity',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  rarity?: string; // 'common' | 'rare' | 'epic' | 'legendary'

  @property({
    type: 'string',
    postgresql: {
      columnName: 'milestone_type',
      dataType: 'character varying',
      dataLength: 50,
    },
  })
  milestoneType?: string; // 'completed_lessons' | 'streak_days' | 'quiz_score' | 'credits'

  @property({
    type: 'number',
    default: 1,
    postgresql: {
      columnName: 'milestone_count',
      dataType: 'integer',
    },
  })
  milestoneCount?: number;

  @property({
    type: 'number',
    default: 100,
    postgresql: {
      columnName: 'xp_reward',
      dataType: 'integer',
    },
  })
  xpReward?: number;

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

  @hasMany(() => UserBadge, {keyTo: 'badgeId'})
  userBadges?: UserBadge[];

  constructor(data?: Partial<Badge>) {
    super(data);
  }
}

export interface BadgeRelations {
  userBadges?: UserBadge[];
}

export type BadgeWithRelations = Badge & BadgeRelations;
