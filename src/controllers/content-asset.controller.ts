import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {del, get, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {CONTENT_ASSET_STATUSES, CONTENT_ASSET_TYPES} from '../models';
import {
  ContentAssetService,
  CreateContentAssetInput,
  UpdateContentAssetInput,
} from '../services/content-asset.service';
import {RbacService} from '../services/rbac.service';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

const ALLOWED_ROLES = ['content', 'admin'] as const;

/**
 * BUG-048: AI Content Engine asset library ("Save to Library").
 * Routing + response formatting only — rules live in ContentAssetService.
 */
export class ContentAssetController {
  constructor(
    @inject('services.contentAsset')
    public contentAssetService: ContentAssetService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) {}

  @authenticate('jwt')
  @post('/content/assets')
  async create(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'assetType', 'subjectId', 'gradeLevelId', 'content'],
            properties: {
              title: {type: 'string'},
              // Allowed values are validated in the service so bad values fail with 400 (AGENTS.md rule #2), not 422.
              assetType: {type: 'string', description: CONTENT_ASSET_TYPES.join(' | ')},
              subjectId: {type: 'string'},
              gradeLevelId: {type: 'string'},
              courseId: {type: 'string', nullable: true},
              topic: {type: 'string'},
              objectives: {type: 'string'},
              content: {type: 'string'},
              status: {type: 'string', description: CONTENT_ASSET_STATUSES.join(' | ')},
            },
          },
        },
      },
    })
    body: CreateContentAssetInput,
  ) {
    this.rbacService.validateRole(currentUser, [...ALLOWED_ROLES]);
    const asset = await this.contentAssetService.create(currentUser, body);
    return formatSuccessResponse(asset, 'Content asset saved to library');
  }

  @authenticate('jwt')
  @get('/content/assets')
  async list(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.query.number('page') page?: number,
    @param.query.number('limit') limit?: number,
    @param.query.string('search') search?: string,
    @param.query.string('assetType') assetType?: string,
  ) {
    this.rbacService.validateRole(currentUser, [...ALLOWED_ROLES]);
    const result = await this.contentAssetService.list(currentUser, {page, limit, search, assetType});
    return formatSuccessResponse(result, 'Content assets retrieved successfully');
  }

  @authenticate('jwt')
  @get('/content/assets/{id}')
  async findById(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') id: string,
  ) {
    this.rbacService.validateRole(currentUser, [...ALLOWED_ROLES]);
    const asset = await this.contentAssetService.getById(currentUser, id);
    return formatSuccessResponse(asset, 'Content asset retrieved successfully');
  }

  @authenticate('jwt')
  @patch('/content/assets/{id}')
  async update(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: {type: 'string'},
              content: {type: 'string'},
              status: {type: 'string', description: CONTENT_ASSET_STATUSES.join(' | ')},
              courseId: {type: 'string', nullable: true},
            },
          },
        },
      },
    })
    body: UpdateContentAssetInput,
  ) {
    this.rbacService.validateRole(currentUser, [...ALLOWED_ROLES]);
    const asset = await this.contentAssetService.update(currentUser, id, body);
    return formatSuccessResponse(asset, 'Content asset updated successfully');
  }

  @authenticate('jwt')
  @del('/content/assets/{id}')
  async remove(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') id: string,
  ) {
    this.rbacService.validateRole(currentUser, [...ALLOWED_ROLES]);
    const result = await this.contentAssetService.remove(currentUser, id);
    return formatSuccessResponse(result, 'Content asset deleted successfully');
  }
}
