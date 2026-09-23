import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {post, requestBody} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {AiTutorChatPayload, AiTutorService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class AiTutorController {
  constructor(
    @inject('services.aiTutor')
    public aiTutorService: AiTutorService,
  ) {}

  /**
   * 1-on-1 Socratic AI Learning Companion Chat
   */
  @authenticate('jwt')
  @post('/ai/tutor/chat')
  async chatWithTutor(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['courseId', 'message'],
            properties: {
              courseId: {type: 'string'},
              lessonId: {type: 'string'},
              message: {type: 'string'},
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    role: {type: 'string'},
                    content: {type: 'string'},
                  },
                },
              },
            },
          },
        },
      },
    })
    body: AiTutorChatPayload,
  ) {
    const result = await this.aiTutorService.getTutorReply(currentUser.id, body);
    return formatSuccessResponse(result, 'AI Tutor response generated successfully');
  }
}
