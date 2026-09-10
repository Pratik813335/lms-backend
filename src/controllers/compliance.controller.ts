import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param, post, requestBody} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {AuditCoursePayload, ComplianceService, RbacService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class ComplianceController {
  constructor(
    @inject('services.compliance')
    public complianceService: ComplianceService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) {}

  /**
   * Get academic compliance audits
   */
  @authenticate('jwt')
  @get('/academic/compliance-audits')
  async getComplianceAudits(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.query.string('courseId') courseId?: string,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'academic', 'content', 'operations']);
    const audits = await this.complianceService.getAudits(courseId);
    return formatSuccessResponse(audits, 'Compliance audits retrieved successfully');
  }

  /**
   * Perform/record a course compliance and NCAA audit
   */
  @authenticate('jwt')
  @post('/academic/compliance-audits')
  async recordAudit(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['courseId'],
            properties: {
              courseId: {type: 'string'},
              ncaaApproved: {type: 'boolean'},
              syllabusApproved: {type: 'boolean'},
              academicIntegrityScore: {type: 'number'},
              status: {type: 'string'},
              notes: {type: 'string'},
            },
          },
        },
      },
    })
    body: AuditCoursePayload,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'academic']);
    const audit = await this.complianceService.auditCourse(currentUser.id, body);
    return formatSuccessResponse(audit, 'Course compliance audit recorded successfully');
  }
}
