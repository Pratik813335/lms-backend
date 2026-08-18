import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, param, patch, post, requestBody, HttpErrors} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {RbacServiceBindings} from '../keys';
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
import {RbacService} from '../services';
import {formatSuccessResponse} from '../utils';

export class MasterController {
  constructor(
    @inject(RbacServiceBindings.RBAC_SERVICE)
    public rbacService: RbacService,
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

  @authenticate('jwt')
  @post('/masters/grade-levels', {
    responses: {
      '200': {
        description: 'GradeLevels Model Instance',
        content: {'application/json': {schema: getModelSchemaRef(GradeLevels)}},
      },
    },
  })
  async createGradeLevel(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(GradeLevels, {
            title: 'NewGradeLevel',
            exclude: ['id', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<GradeLevels, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const created = await this.gradeLevelsRepo.create(data);
    return formatSuccessResponse(created, 'Grade level created successfully');
  }

  @authenticate('jwt')
  @patch('/masters/grade-levels/{id}', {
    responses: {
      '200': {
        description: 'GradeLevels PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(GradeLevels)}},
      },
    },
  })
  async updateGradeLevel(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(GradeLevels, {
            title: 'UpdateGradeLevel',
            partial: true,
            exclude: ['id', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<GradeLevels>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const record = await this.gradeLevelsRepo.findOne({where: {id, isDeleted: false}});
    if (!record) {
      throw new HttpErrors.NotFound(`Grade level with ID '${id}' not found`);
    }
    await this.gradeLevelsRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.gradeLevelsRepo.findById(id);
    return formatSuccessResponse(updated, 'Grade level updated successfully');
  }

  // ── Subjects Master ─────────────────────────────────────────────────────
  @get('/masters/subjects')
  async getSubjects() {
    const list = await this.subjectsRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Subjects retrieved successfully');
  }

  @authenticate('jwt')
  @post('/masters/subjects', {
    responses: {
      '200': {
        description: 'Subjects Model Instance',
        content: {'application/json': {schema: getModelSchemaRef(Subjects)}},
      },
    },
  })
  async createSubject(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Subjects, {
            title: 'NewSubject',
            exclude: ['id', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<Subjects, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const created = await this.subjectsRepo.create(data);
    return formatSuccessResponse(created, 'Subject created successfully');
  }

  @authenticate('jwt')
  @patch('/masters/subjects/{id}', {
    responses: {
      '200': {
        description: 'Subjects PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(Subjects)}},
      },
    },
  })
  async updateSubject(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Subjects, {
            title: 'UpdateSubject',
            partial: true,
            exclude: ['id', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<Subjects>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const record = await this.subjectsRepo.findOne({where: {id, isDeleted: false}});
    if (!record) {
      throw new HttpErrors.NotFound(`Subject with ID '${id}' not found`);
    }
    await this.subjectsRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.subjectsRepo.findById(id);
    return formatSuccessResponse(updated, 'Subject updated successfully');
  }

  // ── Tiers Master ────────────────────────────────────────────────────────
  @get('/masters/tiers')
  async getTiers() {
    const list = await this.tiersRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Tiers retrieved successfully');
  }

  @authenticate('jwt')
  @post('/masters/tiers', {
    responses: {
      '200': {
        description: 'Tiers Model Instance',
        content: {'application/json': {schema: getModelSchemaRef(Tiers)}},
      },
    },
  })
  async createTier(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tiers, {
            title: 'NewTier',
            exclude: ['id', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<Tiers, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const created = await this.tiersRepo.create(data);
    return formatSuccessResponse(created, 'Tier created successfully');
  }

  @authenticate('jwt')
  @patch('/masters/tiers/{id}', {
    responses: {
      '200': {
        description: 'Tiers PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(Tiers)}},
      },
    },
  })
  async updateTier(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tiers, {
            title: 'UpdateTier',
            partial: true,
            exclude: ['id', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<Tiers>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const record = await this.tiersRepo.findOne({where: {id, isDeleted: false}});
    if (!record) {
      throw new HttpErrors.NotFound(`Tier with ID '${id}' not found`);
    }
    await this.tiersRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.tiersRepo.findById(id);
    return formatSuccessResponse(updated, 'Tier updated successfully');
  }

  // ── Asset Types Master ──────────────────────────────────────────────────
  @get('/masters/asset-types')
  async getAssetTypes() {
    const list = await this.assetTypesRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Asset types retrieved successfully');
  }

  @authenticate('jwt')
  @post('/masters/asset-types', {
    responses: {
      '200': {
        description: 'AssetTypes Model Instance',
        content: {'application/json': {schema: getModelSchemaRef(AssetTypes)}},
      },
    },
  })
  async createAssetType(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AssetTypes, {
            title: 'NewAssetType',
            exclude: ['id', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<AssetTypes, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const created = await this.assetTypesRepo.create(data);
    return formatSuccessResponse(created, 'Asset type created successfully');
  }

  @authenticate('jwt')
  @patch('/masters/asset-types/{id}', {
    responses: {
      '200': {
        description: 'AssetTypes PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(AssetTypes)}},
      },
    },
  })
  async updateAssetType(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AssetTypes, {
            title: 'UpdateAssetType',
            partial: true,
            exclude: ['id', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<AssetTypes>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const record = await this.assetTypesRepo.findOne({where: {id, isDeleted: false}});
    if (!record) {
      throw new HttpErrors.NotFound(`Asset type with ID '${id}' not found`);
    }
    await this.assetTypesRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.assetTypesRepo.findById(id);
    return formatSuccessResponse(updated, 'Asset type updated successfully');
  }

  // ── Compliance Statuses Master ──────────────────────────────────────────
  @get('/masters/compliance-statuses')
  async getComplianceStatuses() {
    const list = await this.complianceStatusesRepo.find({
      where: {isDeleted: false, isActive: true},
    });
    return formatSuccessResponse(list, 'Compliance statuses retrieved successfully');
  }

  @authenticate('jwt')
  @post('/masters/compliance-statuses', {
    responses: {
      '200': {
        description: 'ComplianceStatuses Model Instance',
        content: {'application/json': {schema: getModelSchemaRef(ComplianceStatuses)}},
      },
    },
  })
  async createComplianceStatus(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ComplianceStatuses, {
            title: 'NewComplianceStatus',
            exclude: ['id', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<ComplianceStatuses, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const created = await this.complianceStatusesRepo.create(data);
    return formatSuccessResponse(created, 'Compliance status created successfully');
  }

  @authenticate('jwt')
  @patch('/masters/compliance-statuses/{id}', {
    responses: {
      '200': {
        description: 'ComplianceStatuses PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(ComplianceStatuses)}},
      },
    },
  })
  async updateComplianceStatus(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ComplianceStatuses, {
            title: 'UpdateComplianceStatus',
            partial: true,
            exclude: ['id', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<ComplianceStatuses>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);
    const record = await this.complianceStatusesRepo.findOne({where: {id, isDeleted: false}});
    if (!record) {
      throw new HttpErrors.NotFound(`Compliance status with ID '${id}' not found`);
    }
    await this.complianceStatusesRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.complianceStatusesRepo.findById(id);
    return formatSuccessResponse(updated, 'Compliance status updated successfully');
  }
}
