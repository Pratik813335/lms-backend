import {repository} from '@loopback/repository';
import {get, post, requestBody} from '@loopback/rest';
import {
  AssetTypes,
  ComplianceStatuses,
  GradeLevels,
  Subjects,
  Tiers,
} from '../models';
import {
  AssetTypesRepository,
  ComplianceStatusesRepository,
  GradeLevelsRepository,
  SubjectsRepository,
  TiersRepository,
} from '../repositories';
import {formatSuccessResponse} from '../utils';

export class MasterController {
  constructor(
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(SubjectsRepository)
    public subjectsRepo: SubjectsRepository,
    @repository(TiersRepository)
    public tiersRepo: TiersRepository,
    @repository(AssetTypesRepository)
    public assetTypesRepo: AssetTypesRepository,
    @repository(ComplianceStatusesRepository)
    public complianceStatusesRepo: ComplianceStatusesRepository,
  ) {}

  // ── Grade Levels Master ──────────────────────────────────────────────────
  @get('/masters/grade-levels')
  async getGradeLevels() {
    const list = await this.gradeLevelsRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Grade levels retrieved successfully');
  }

  @post('/masters/grade-levels')
  async createGradeLevel(
    @requestBody() data: Partial<GradeLevels>,
  ) {
    const created = await this.gradeLevelsRepo.create(data);
    return formatSuccessResponse(created, 'Grade level created successfully');
  }

  // ── Subjects Master ─────────────────────────────────────────────────────
  @get('/masters/subjects')
  async getSubjects() {
    const list = await this.subjectsRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Subjects retrieved successfully');
  }

  @post('/masters/subjects')
  async createSubject(
    @requestBody() data: Partial<Subjects>,
  ) {
    const created = await this.subjectsRepo.create(data);
    return formatSuccessResponse(created, 'Subject created successfully');
  }

  // ── Tiers Master ────────────────────────────────────────────────────────
  @get('/masters/tiers')
  async getTiers() {
    const list = await this.tiersRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Tiers retrieved successfully');
  }

  @post('/masters/tiers')
  async createTier(
    @requestBody() data: Partial<Tiers>,
  ) {
    const created = await this.tiersRepo.create(data);
    return formatSuccessResponse(created, 'Tier created successfully');
  }

  // ── Asset Types Master ──────────────────────────────────────────────────
  @get('/masters/asset-types')
  async getAssetTypes() {
    const list = await this.assetTypesRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Asset types retrieved successfully');
  }

  @post('/masters/asset-types')
  async createAssetType(
    @requestBody() data: Partial<AssetTypes>,
  ) {
    const created = await this.assetTypesRepo.create(data);
    return formatSuccessResponse(created, 'Asset type created successfully');
  }

  // ── Compliance Statuses Master ──────────────────────────────────────────
  @get('/masters/compliance-statuses')
  async getComplianceStatuses() {
    const list = await this.complianceStatusesRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Compliance statuses retrieved successfully');
  }

  @post('/masters/compliance-statuses')
  async createComplianceStatus(
    @requestBody() data: Partial<ComplianceStatuses>,
  ) {
    const created = await this.complianceStatusesRepo.create(data);
    return formatSuccessResponse(created, 'Compliance status created successfully');
  }
}
