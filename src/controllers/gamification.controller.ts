import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {GamificationService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class GamificationController {
  constructor(
    @inject('services.gamification')
    public gamificationService: GamificationService,
  ) {}

  /**
   * Get all badges platform catalog
   */
  @authenticate('jwt')
  @get('/gamification/badges')
  async getAllBadges() {
    const badges = await this.gamificationService.getAllBadges();
    return formatSuccessResponse(badges, 'Platform badges retrieved successfully');
  }

  /**
   * Get student's badges, unlock status, and level progress
   */
  @authenticate('jwt')
  @get('/student/me/badges')
  async getStudentBadges(@inject(SecurityBindings.USER) currentUser: LmsUserProfile) {
    const result = await this.gamificationService.getStudentBadges(currentUser.id);
    return formatSuccessResponse(result, 'Student badges and gamification progress retrieved successfully');
  }
}
