import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {AnalyticsService} from '../services/analytics.service';
import {RbacService} from '../services/rbac.service';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class AnalyticsController {
  constructor(
    @inject('services.analytics')
    public analyticsService: AnalyticsService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) {}

  /**
   * Get Platform-wide Overview KPIs (Executive Analytics)
   * Optional query: from, to (YYYY-MM-DD or ISO datetime)
   */
  @authenticate('jwt')
  @get('/admin/analytics/overview')
  async getOverviewKpis(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.query.string('from') from?: string,
    @param.query.string('to') to?: string,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'academic', 'operations']);
    const kpis = await this.analyticsService.getOverviewKpis(from, to);
    return formatSuccessResponse(kpis, 'Platform analytics overview retrieved successfully');
  }

  /**
   * Get Letter Grade Distribution across student cohort (A, B, C, D, F)
   * Optional query: from, to (YYYY-MM-DD or ISO datetime) — filters by submission date (BUG-052)
   */
  @authenticate('jwt')
  @get('/admin/reports/grade-distribution')
  async getGradeDistribution(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.query.string('from') from?: string,
    @param.query.string('to') to?: string,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'academic', 'operations']);
    const distribution = await this.analyticsService.getGradeDistribution(from, to);
    return formatSuccessResponse(distribution, 'Grade distribution report retrieved successfully');
  }
}
