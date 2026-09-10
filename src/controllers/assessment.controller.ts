import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  param,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {
  AssessmentRepository,
  AssessmentSubmissionRepository,
  CourseRepository,
  EnrollmentRepository,
  ModuleRepository,
  QuestionRepository,
} from '../repositories';
import {AssessmentService, RbacService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class AssessmentController {
  constructor(
    @repository(AssessmentRepository)
    public assessmentRepo: AssessmentRepository,
    @repository(QuestionRepository)
    public questionRepo: QuestionRepository,
    @repository(AssessmentSubmissionRepository)
    public submissionRepo: AssessmentSubmissionRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(ModuleRepository)
    public moduleRepo: ModuleRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @inject('services.assessment')
    public assessmentService: AssessmentService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) {}

  /**
   * Create an assessment (quiz, test, module exam) with questions
   */
  @authenticate('jwt')
  @post('/courses/{id}/assessments')
  async createCourseAssessment(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') courseId: string,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'type'],
            properties: {
              title: {type: 'string'},
              type: {type: 'string'},
              moduleId: {type: 'string'},
              description: {type: 'string'},
              passingPercentage: {type: 'number'},
              timeLimitMinutes: {type: 'number'},
              xpReward: {type: 'number'},
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['type', 'text', 'correctAnswer'],
                  properties: {
                    type: {type: 'string'},
                    text: {type: 'string'},
                    options: {type: 'array', items: {type: 'string'}},
                    correctAnswer: {type: 'string'},
                    explanation: {type: 'string'},
                    points: {type: 'number'},
                    orderIndex: {type: 'number'},
                  },
                },
              },
            },
          },
        },
      },
    })
    body: {
      title: string;
      type: string;
      moduleId?: string;
      description?: string;
      passingPercentage?: number;
      timeLimitMinutes?: number;
      xpReward?: number;
      questions?: any[];
    },
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content', 'academic']);

    const course = await this.courseRepo.findOne({
      where: {id: courseId, isActive: true, isDeleted: false},
    });
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found.`);
    }

    if (body.moduleId) {
      const mod = await this.moduleRepo.findOne({
        where: {id: body.moduleId, courseId, isActive: true, isDeleted: false},
      });
      if (!mod) {
        throw new HttpErrors.BadRequest(`Module '${body.moduleId}' does not belong to course '${courseId}'.`);
      }
    }

    const assessment = await this.assessmentRepo.create({
      courseId,
      moduleId: body.moduleId,
      title: body.title,
      type: body.type,
      description: body.description,
      passingPercentage: body.passingPercentage || 80.0,
      timeLimitMinutes: body.timeLimitMinutes || 20,
      xpReward: body.xpReward || 100,
      isActive: true,
      isDeleted: false,
    });

    if (Array.isArray(body.questions) && body.questions.length > 0) {
      for (let i = 0; i < body.questions.length; i++) {
        const q = body.questions[i];
        await this.questionRepo.create({
          assessmentId: assessment.id!,
          type: q.type || 'mcq',
          text: q.text,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: q.orderIndex || (i + 1),
          isActive: true,
          isDeleted: false,
        });
      }
    }

    const created = await this.assessmentRepo.findOne({
      where: {id: assessment.id},
      include: [
        {
          relation: 'questions',
          scope: {order: ['orderIndex ASC']},
        },
      ],
    });

    return formatSuccessResponse(created, 'Assessment created successfully');
  }

  /**
   * List all assessments for a course
   */
  @authenticate('jwt')
  @get('/courses/{id}/assessments')
  async getAssessmentsByCourse(
    @param.path.string('id') courseId: string,
    @param.query.string('type') type?: string,
  ) {
    const filter: any = {where: {courseId, isActive: true, isDeleted: false}};
    if (type) {
      filter.where.type = type;
    }
    const assessments = await this.assessmentRepo.find({
      ...filter,
      include: [
        {
          relation: 'questions',
          scope: {fields: {id: true, assessmentId: true, type: true, text: true, options: true, points: true, orderIndex: true}},
        },
      ],
      order: ['createdAt ASC'],
    });

    return formatSuccessResponse(assessments, 'Assessments retrieved successfully');
  }

  /**
   * Get single assessment with sanitized questions (without answers) for taking
   */
  @authenticate('jwt')
  @get('/assessments/{id}')
  async getAssessmentById(@param.path.string('id') id: string) {
    const assessment = await this.assessmentService.getAssessmentForStudent(id);
    return formatSuccessResponse(assessment, 'Assessment retrieved successfully');
  }

  /**
   * Submit student answers for auto-grading & XP award
   */
  @authenticate('jwt')
  @post('/assessments/{id}/submit')
  async submitAssessment(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['answers'],
            properties: {
              answers: {type: 'object'},
            },
          },
        },
      },
    })
    body: {answers: Record<string, string>},
  ) {
    const result = await this.assessmentService.submitAndGrade(currentUser.id, id, body);
    return formatSuccessResponse(result, 'Assessment submitted and graded successfully');
  }

  /**
   * Review mode: Get student's past submission with step-by-step explanations
   */
  @authenticate('jwt')
  @get('/assessments/{id}/submissions/latest')
  async getLatestSubmission(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') id: string,
  ) {
    const review = await this.assessmentService.getLatestSubmissionReview(currentUser.id, id);
    return formatSuccessResponse(review, 'Assessment review retrieved successfully');
  }

  /**
   * Get student's pending and completed assessments across all enrolled courses
   */
  @authenticate('jwt')
  @get('/student/me/assessments')
  async getStudentAssessments(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.query.string('status') status?: string, // 'pending' | 'completed'
  ) {
    // 1. Find all courses student is enrolled in
    const enrollments = await this.enrollmentRepo.find({
      where: {usersId: currentUser.id, isDeleted: false},
      include: ['course'],
    });

    const enrolledCourseIds = enrollments.map(e => e.courseId);
    if (enrolledCourseIds.length === 0) {
      return formatSuccessResponse({pending: [], completed: []}, 'Student assessments retrieved');
    }

    // 2. Fetch all assessments for those courses
    const allAssessments: any[] = await this.assessmentRepo.find({
      where: {courseId: {inq: enrolledCourseIds}, isActive: true, isDeleted: false},
      include: ['course', 'questions'],
    });

    // 3. Fetch student submissions
    const submissions = await this.submissionRepo.find({
      where: {usersId: currentUser.id, isDeleted: false},
    });
    const submissionMap = new Map(submissions.map(s => [s.assessmentId, s]));

    const pending: any[] = [];
    const completed: any[] = [];

    for (const a of allAssessments) {
      const sub = submissionMap.get(a.id!);
      const item = {
        id: a.id,
        courseId: a.courseId,
        courseTitle: a.course?.title || 'Course',
        title: a.title,
        type: a.type,
        questionCount: a.questions?.length || 0,
        passingPercentage: a.passingPercentage,
        timeLimitMinutes: a.timeLimitMinutes,
        score: sub ? sub.score : null,
        isPassed: sub ? sub.isPassed : null,
        submittedAt: sub ? sub.submittedAt : null,
        status: sub ? 'completed' : 'pending',
      };

      if (sub) {
        completed.push(item);
      } else {
        pending.push(item);
      }
    }

    if (status === 'pending') {
      return formatSuccessResponse(pending, 'Pending assessments retrieved');
    }
    if (status === 'completed') {
      return formatSuccessResponse(completed, 'Completed assessments retrieved');
    }

    return formatSuccessResponse({pending, completed}, 'Student assessments retrieved');
  }
}
