import {BindingScope, injectable} from '@loopback/core';
import {repository, Where} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  CONTENT_ASSET_STATUSES,
  CONTENT_ASSET_TYPES,
  ContentAsset,
  ContentAssetStatus,
  ContentAssetType,
} from '../models';
import {
  ContentAssetRepository,
  CourseRepository,
  GradeLevelsRepository,
  SubjectsRepository,
} from '../repositories';
import {LmsUserProfile} from '../types';

export type CreateContentAssetInput = {
  title: string;
  assetType: string;
  subjectId: string;
  gradeLevelId: string;
  content: string;
  topic?: string;
  objectives?: string;
  courseId?: string | null;
  status?: string;
};

export type UpdateContentAssetInput = {
  title?: string;
  content?: string;
  status?: string;
  courseId?: string | null;
};

export type ListContentAssetsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  assetType?: string;
};

const MAX_TITLE = 300;
const MAX_CONTENT = 200_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * BUG-048: AI Content Engine asset library.
 * Content authors only see/modify their own assets; admins see all.
 */
@injectable({scope: BindingScope.TRANSIENT})
export class ContentAssetService {
  constructor(
    @repository(ContentAssetRepository)
    public contentAssetRepo: ContentAssetRepository,
    @repository(SubjectsRepository)
    public subjectsRepo: SubjectsRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
  ) {}

  // ── helpers ────────────────────────────────────────────────────────────────

  private isAdmin(user: LmsUserProfile): boolean {
    return (user.roles || []).includes('admin');
  }

  private userId(user: LmsUserProfile): string {
    const id = String(user.id || '');
    if (!id) throw new HttpErrors.Unauthorized('Invalid user session');
    return id;
  }

  /** Base filter: not deleted + owned by the caller unless admin. */
  private scope(user: LmsUserProfile): Where<ContentAsset> {
    return this.isAdmin(user)
      ? {isDeleted: false}
      : {isDeleted: false, createdById: this.userId(user)};
  }

  private requireText(value: unknown, field: string, max: number): string {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) throw new HttpErrors.BadRequest(`${field} is required`);
    if (text.length > max) {
      throw new HttpErrors.BadRequest(`${field} must be at most ${max} characters`);
    }
    return text;
  }

  private validateType(value: unknown): ContentAssetType {
    if (!CONTENT_ASSET_TYPES.includes(value as ContentAssetType)) {
      throw new HttpErrors.BadRequest(
        `Invalid assetType '${value}'. Allowed: ${CONTENT_ASSET_TYPES.join(', ')}`,
      );
    }
    return value as ContentAssetType;
  }

  private validateStatus(value: unknown): ContentAssetStatus {
    if (!CONTENT_ASSET_STATUSES.includes(value as ContentAssetStatus)) {
      throw new HttpErrors.BadRequest(
        `Invalid status '${value}'. Allowed: ${CONTENT_ASSET_STATUSES.join(', ')}`,
      );
    }
    return value as ContentAssetStatus;
  }

  private assertUuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !UUID_RE.test(value)) {
      throw new HttpErrors.BadRequest(`${field} must be a valid UUID`);
    }
    return value;
  }

  private async assertSubject(id: unknown) {
    const subjectId = this.assertUuid(id, 'subjectId');
    const found = await this.subjectsRepo.findOne({where: {id: subjectId, isDeleted: false}});
    if (!found) throw new HttpErrors.BadRequest(`Invalid subjectId '${subjectId}'`);
    return subjectId;
  }

  private async assertGradeLevel(id: unknown) {
    const gradeLevelId = this.assertUuid(id, 'gradeLevelId');
    const found = await this.gradeLevelsRepo.findOne({
      where: {id: gradeLevelId, isDeleted: false},
    });
    if (!found) throw new HttpErrors.BadRequest(`Invalid gradeLevelId '${gradeLevelId}'`);
    return gradeLevelId;
  }

  private async assertCourse(id: unknown) {
    const courseId = this.assertUuid(id, 'courseId');
    const found = await this.courseRepo.findOne({where: {id: courseId, isDeleted: false}});
    if (!found) throw new HttpErrors.BadRequest(`Invalid courseId '${courseId}'`);
    return courseId;
  }

  private readonly include = [
    {relation: 'subject', scope: {fields: {id: true, label: true, value: true}}},
    {relation: 'gradeLevel', scope: {fields: {id: true, label: true, value: true, category: true}}},
    {relation: 'course', scope: {fields: {id: true, title: true}}},
    {relation: 'createdBy', scope: {fields: {id: true, fullName: true, email: true}}},
  ];

  // ── operations ─────────────────────────────────────────────────────────────

  async create(user: LmsUserProfile, input: CreateContentAssetInput) {
    // Fail fast: validate everything before writing.
    const title = this.requireText(input.title, 'title', MAX_TITLE);
    const content = this.requireText(input.content, 'content', MAX_CONTENT);
    const assetType = this.validateType(input.assetType);
    const status = input.status === undefined ? 'ready' : this.validateStatus(input.status);
    const subjectId = await this.assertSubject(input.subjectId);
    const gradeLevelId = await this.assertGradeLevel(input.gradeLevelId);
    const courseId =
      input.courseId === undefined || input.courseId === null || input.courseId === ''
        ? undefined
        : await this.assertCourse(input.courseId);

    const created = await this.contentAssetRepo.create({
      title,
      content,
      assetType,
      status,
      subjectId,
      gradeLevelId,
      courseId,
      topic: typeof input.topic === 'string' ? input.topic.trim() || undefined : undefined,
      objectives:
        typeof input.objectives === 'string' ? input.objectives.trim() || undefined : undefined,
      createdById: this.userId(user),
      isDeleted: false,
    });
    return this.getById(user, created.id!);
  }

  async list(user: LmsUserProfile, query: ListContentAssetsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

    const and: Where<ContentAsset>[] = [this.scope(user)];
    if (query.assetType && query.assetType !== 'All') {
      and.push({assetType: this.validateType(query.assetType)});
    }
    const search = query.search?.trim();
    if (search) {
      const like = `%${search.replace(/[%_\\]/g, ch => `\\${ch}`)}%`;
      and.push({or: [{title: {ilike: like}}, {topic: {ilike: like}}]} as Where<ContentAsset>);
    }
    const where: Where<ContentAsset> = and.length === 1 ? and[0] : {and};

    const {count: total} = await this.contentAssetRepo.count(where);
    const items = await this.contentAssetRepo.find({
      where,
      include: this.include,
      order: ['createdAt DESC'],
      limit,
      skip: (page - 1) * limit,
    });
    return {total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), items};
  }

  async getById(user: LmsUserProfile, id: string) {
    const asset = await this.contentAssetRepo.findOne({
      where: {and: [this.scope(user), {id: this.assertUuidOr404(id)}]},
      include: this.include,
    });
    // Same 404 for "missing" and "someone else's" so ownership is not leaked.
    if (!asset) throw new HttpErrors.NotFound(`Content asset '${id}' not found`);
    return asset;
  }

  async update(user: LmsUserProfile, id: string, input: UpdateContentAssetInput) {
    await this.getById(user, id);

    const patch: Partial<ContentAsset> = {};
    if (input.title !== undefined) patch.title = this.requireText(input.title, 'title', MAX_TITLE);
    if (input.content !== undefined) {
      patch.content = this.requireText(input.content, 'content', MAX_CONTENT);
    }
    if (input.status !== undefined) patch.status = this.validateStatus(input.status);
    if (input.courseId !== undefined) {
      patch.courseId =
        input.courseId === null || input.courseId === ''
          ? (null as unknown as undefined)
          : await this.assertCourse(input.courseId);
    }
    if (Object.keys(patch).length === 0) {
      throw new HttpErrors.BadRequest('No updatable fields provided');
    }

    await this.contentAssetRepo.updateById(id, patch);
    return this.getById(user, id);
  }

  async remove(user: LmsUserProfile, id: string) {
    await this.getById(user, id);
    await this.contentAssetRepo.updateById(id, {isDeleted: true, deletedAt: new Date()});
    return {id, deleted: true};
  }

  /** Non-UUID ids can never match a row; answer 404 instead of a DB cast error (500). */
  private assertUuidOr404(id: string): string {
    if (!UUID_RE.test(id)) throw new HttpErrors.NotFound(`Content asset '${id}' not found`);
    return id;
  }
}
