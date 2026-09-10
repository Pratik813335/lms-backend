import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {TestPrepService} from '../services/test-prep.service';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class TestPrepController {
  constructor(
    @inject('services.testPrep')
    public testPrepService: TestPrepService,
  ) {}

  /**
   * Get 3 core test prep subjects (Math, ELA, Science) with practice sets
   */
  @get('/test-prep/subjects')
  async getTestPrepSubjects(@param.query.string('gradeLevelId') gradeLevelId?: string) {
    const subjects = await this.testPrepService.getTestPrepSubjects(gradeLevelId);
    return formatSuccessResponse(subjects, 'Test prep subjects retrieved successfully');
  }

  /**
   * Get practice tests & diagnostic assessments for a specific subject
   */
  @get('/test-prep/subjects/{id}/assessments')
  async getTestPrepAssessments(
    @param.path.string('id') subjectId: string,
    @param.query.string('gradeLevelId') gradeLevelId?: string,
  ) {
    const assessments = await this.testPrepService.getTestPrepAssessments(subjectId, gradeLevelId);
    return formatSuccessResponse(assessments, 'Test prep assessments retrieved successfully');
  }

  /**
   * Get authenticated student test prep dashboard metrics
   */
  @authenticate('jwt')
  @get('/student/me/test-prep')
  async getStudentTestPrepDashboard(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
  ) {
    const dashboard = await this.testPrepService.getStudentTestPrepDashboard(currentUser.id);
    return formatSuccessResponse(dashboard, 'Student test prep dashboard retrieved successfully');
  }
}
