import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Course} from './course.model';
import {GradeLevels} from './grade-levels.model';
import {Subjects} from './subjects.model';
import {Users} from './users.model';

/** Content types produced by the AI Content Engine (validated in ContentAssetService). */
export const CONTENT_ASSET_TYPES = [
  'Lesson Plan',
  'Video Script',
  'Study Guide',
  'Assessment',
] as const;
export type ContentAssetType = (typeof CONTENT_ASSET_TYPES)[number];

export const CONTENT_ASSET_STATUSES = ['draft', 'ready'] as const;
export type ContentAssetStatus = (typeof CONTENT_ASSET_STATUSES)[number];

/**
 * BUG-048: AI Content Engine asset library ("Save to Library").
 * One row per saved generated asset, owned by the content author who saved it.
 */
@model({
  settings: {
    postgresql: {
      table: 'content_assets',
      schema: 'public',
    },
    indexes: {
      idxContentAssetCreatedBy: {keys: {createdById: 1}},
      idxContentAssetType: {keys: {assetType: 1}},
    },
  },
})
export class ContentAsset extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {dataType: 'uuid'},
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {dataType: 'text'},
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'asset_type', dataType: 'varchar(30)'},
  })
  assetType: ContentAssetType;

  @property({
    type: 'string',
    postgresql: {dataType: 'text'},
  })
  topic?: string;

  @property({
    type: 'string',
    postgresql: {dataType: 'text'},
  })
  objectives?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {dataType: 'text'},
  })
  content: string;

  @property({
    type: 'string',
    default: 'ready',
    postgresql: {dataType: 'varchar(20)'},
  })
  status?: ContentAssetStatus;

  @belongsTo(
    () => Subjects,
    {name: 'subject'},
    {required: true, postgresql: {columnName: 'subject_id', dataType: 'uuid', nullable: 'NO'}},
  )
  subjectId: string;

  @belongsTo(
    () => GradeLevels,
    {name: 'gradeLevel'},
    {required: true, postgresql: {columnName: 'grade_level_id', dataType: 'uuid', nullable: 'NO'}},
  )
  gradeLevelId: string;

  /** Optional course the asset is linked/exported to. */
  @belongsTo(
    () => Course,
    {name: 'course'},
    {postgresql: {columnName: 'course_id', dataType: 'uuid'}},
  )
  courseId?: string;

  @belongsTo(
    () => Users,
    {name: 'createdBy'},
    {required: true, postgresql: {columnName: 'created_by_id', dataType: 'uuid', nullable: 'NO'}},
  )
  createdById: string;

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'is_deleted'},
  })
  isDeleted?: boolean;

  @property({
    type: 'date',
    postgresql: {columnName: 'deleted_at', dataType: 'timestamptz'},
  })
  deletedAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'created_at', dataType: 'timestamptz'},
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'updated_at', dataType: 'timestamptz'},
  })
  updatedAt?: Date;

  constructor(data?: Partial<ContentAsset>) {
    super(data);
  }
}

export interface ContentAssetRelations {
  subject?: Subjects;
  gradeLevel?: GradeLevels;
  course?: Course;
  createdBy?: Users;
}

export type ContentAssetWithRelations = ContentAsset & ContentAssetRelations;
