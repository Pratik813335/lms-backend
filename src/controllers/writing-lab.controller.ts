import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param, post, requestBody} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {SubmitEssayPayload, WritingLabService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class WritingLabController {
  constructor(
    @inject('services.writingLab')
    public writingLabService: WritingLabService,
  ) {}

  /**
   * Get list of active writing prompts
   */
  @authenticate('jwt')
  @get('/writing-lab/prompts')
  async getPrompts(@param.query.string('subjectId') subjectId?: string) {
    const prompts = await this.writingLabService.getPrompts(subjectId);
    return formatSuccessResponse(prompts, 'Writing prompts retrieved successfully');
  }

  /**
   * Submit essay for instant AI rubric scoring & grammar analysis
   */
  @authenticate('jwt')
  @post('/writing-lab/submit')
  async submitEssay(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['promptId', 'essayText'],
            properties: {
              promptId: {type: 'string'},
              essayText: {type: 'string'},
              attachmentMediaId: {type: 'string'},
            },
          },
        },
      },
    })
    body: SubmitEssayPayload,
  ) {
    const result = await this.writingLabService.submitAndEvaluate(currentUser.id, body);
    return formatSuccessResponse(result, 'Essay evaluated and submitted successfully');
  }

  /**
   * Get student's past writing lab submissions
   */
  @authenticate('jwt')
  @get('/student/me/writing-submissions')
  async getMySubmissions(@inject(SecurityBindings.USER) currentUser: LmsUserProfile) {
    const submissions = await this.writingLabService.getStudentSubmissions(currentUser.id);
    return formatSuccessResponse(submissions, 'Writing submissions retrieved successfully');
  }
}
