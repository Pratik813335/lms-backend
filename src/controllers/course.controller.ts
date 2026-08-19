import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  get,
  del,
  requestBody,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {Course, Lesson, Module} from '../models';
import {CourseRepository} from '../repositories/course.repository';
import {EnrollmentRepository} from '../repositories/enrollment.repository';
import {GradeLevelsRepository} from '../repositories/grade-levels.repository';
import {LessonProgressRepository} from '../repositories/lesson-progress.repository';
import {LessonRepository} from '../repositories/lesson.repository';
import {ModuleRepository} from '../repositories/module.repository';
import {SubjectsRepository} from '../repositories/subjects.repository';
import {UsersRepository} from '../repositories/users.repository';
import {CourseService} from '../services/course.service';
import {RbacService} from '../services/rbac.service';
import {formatSuccessResponse} from '../utils/response.util';

export class CourseController {
  constructor(
    @inject('services.course')
    public courseService: CourseService,
    @inject('services.rbac')
    public rbacService: RbacService,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(ModuleRepository)
    public moduleRepo: ModuleRepository,
    @repository(LessonRepository)
    public lessonRepo: LessonRepository,
    @repository(LessonProgressRepository)
    public lessonProgressRepo: LessonProgressRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(SubjectsRepository)
    public subjectsRepo: SubjectsRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
  ) {}

  // ── Instructors Dropdown List ───────────────────────────────────────────
  @authenticate('jwt')
  @get('/courses/instructors')
  async getInstructors() {
    const instructors = await this.courseService.getInstructors();
    return formatSuccessResponse(instructors, 'Instructors list retrieved successfully');
  }

  // ── Course Catalog & Filter Engine ──────────────────────────────────────
  @get('/courses')
  async getCatalog(
    @param.query.string('tier') tier?: string,
    @param.query.string('subjectId') subjectId?: string,
    @param.query.string('gradeLevelId') gradeLevelId?: string,
    @param.query.string('search') search?: string,
    @param.query.number('page') page?: number,
    @param.query.number('limit') limit?: number,
  ) {
    const result = await this.courseService.getCatalog({
      tier,
      subjectId,
      gradeLevelId,
      search,
      page,
      limit,
    });
    return formatSuccessResponse(result, 'Course catalog retrieved successfully');
  }

  @authenticate('jwt')
  @post('/courses', {
    responses: {
      '200': {
        description: 'Course Model Instance',
        content: {'application/json': {schema: getModelSchemaRef(Course)}},
      },
    },
  })
  async createCourse(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'subjectId', 'gradeLevelId'],
            properties: {
              title: {type: 'string'},
              subtitle: {type: 'string'},
              description: {type: 'string'},
              subjectId: {type: 'string'},
              gradeLevelId: {type: 'string'},
              instructorId: {type: 'string'},
              tier: {type: 'string', enum: ['junior', 'senior']},
              duration: {type: 'string'},
              credits: {type: 'number'},
              emoji: {type: 'string'},
              ncaaApproved: {type: 'boolean'},
              status: {type: 'string', enum: ['draft', 'published', 'archived']},
            },
          },
        },
      },
    })
    data: {
      title: string;
      subjectId: string;
      gradeLevelId: string;
      instructorId?: string;
      subtitle?: string;
      description?: string;
      duration?: string;
      credits?: number;
      emoji?: string;
      ncaaApproved?: boolean;
      status?: string;
    },
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    if (!data.title || !data.title.trim()) {
      throw new HttpErrors.BadRequest('Title is required');
    }

    if (!data.subjectId) {
      throw new HttpErrors.BadRequest('subjectId is required');
    }
    const validSubject = await this.subjectsRepo.findOne({
      where: {id: data.subjectId, isActive: true, isDeleted: false},
    });
    if (!validSubject) {
      throw new HttpErrors.BadRequest(`Invalid subjectId '${data.subjectId}'. Subject does not exist in master data.`);
    }

    if (!data.gradeLevelId) {
      throw new HttpErrors.BadRequest('gradeLevelId is required');
    }
    const validGrade = await this.gradeLevelsRepo.findOne({
      where: {id: data.gradeLevelId, isActive: true, isDeleted: false},
    });
    if (!validGrade) {
      throw new HttpErrors.BadRequest(`Invalid gradeLevelId '${data.gradeLevelId}'. Grade level does not exist in master data.`);
    }

    if (data.instructorId) {
      const instUser = await this.usersRepo.findOne({
        where: {id: data.instructorId, isActive: true, isDeleted: false},
      });
      if (!instUser) {
        throw new HttpErrors.BadRequest(`Invalid instructorId '${data.instructorId}'. Instructor user does not exist.`);
      }
    }

    const courseCredits = data.credits !== undefined ? data.credits : (validGrade.category === 'junior' ? 0.0 : 1.0);

    const created = await this.courseRepo.create({
      title: data.title.trim(),
      subtitle: data.subtitle,
      description: data.description,
      subjectId: data.subjectId,
      gradeLevelId: data.gradeLevelId,
      instructorId: data.instructorId,
      authorId: (currentUser as any).id || (currentUser as any).userId,
      duration: data.duration,
      credits: courseCredits,
      emoji: data.emoji,
      ncaaApproved: data.ncaaApproved || false,
      status: data.status || 'published',
      isActive: true,
      isDeleted: false,
    });

    return formatSuccessResponse(created, 'Course created successfully');
  }

  @get('/courses/{id}')
  async getCourseById(@param.path.string('id') id: string) {
    const course = await this.courseRepo.findOne({
      where: {id, isDeleted: false},
      include: [
        {relation: 'subject', scope: {fields: {id: true, label: true, value: true}}},
        {relation: 'gradeLevel', scope: {fields: {id: true, label: true, value: true}}},
        {relation: 'instructor', scope: {fields: {id: true, fullName: true, email: true}}},
        {relation: 'author', scope: {fields: {id: true, fullName: true, email: true}}},
      ],
    });
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${id}' not found`);
    }
    return formatSuccessResponse(course, 'Course details retrieved successfully');
  }

  @authenticate('jwt')
  @patch('/courses/{id}', {
    responses: {
      '200': {
        description: 'Course PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(Course)}},
      },
    },
  })
  async updateCourse(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: {type: 'string'},
              subtitle: {type: 'string'},
              description: {type: 'string'},
              subjectId: {type: 'string'},
              gradeLevelId: {type: 'string'},
              instructorId: {type: 'string'},
              duration: {type: 'string'},
              credits: {type: 'number'},
              emoji: {type: 'string'},
              ncaaApproved: {type: 'boolean'},
              status: {type: 'string', enum: ['draft', 'published', 'archived']},
            },
          },
        },
      },
    })
    data: {
      title?: string;
      subtitle?: string;
      description?: string;
      subjectId?: string;
      gradeLevelId?: string;
      instructorId?: string;
      duration?: string;
      credits?: number;
      emoji?: string;
      ncaaApproved?: boolean;
      status?: string;
    },
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const course = await this.courseRepo.findOne({where: {id, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${id}' not found`);
    }

    const updatePayload: any = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.subtitle !== undefined) updatePayload.subtitle = data.subtitle;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.duration !== undefined) updatePayload.duration = data.duration;
    if (data.credits !== undefined) updatePayload.credits = data.credits;
    if (data.emoji !== undefined) updatePayload.emoji = data.emoji;
    if (data.ncaaApproved !== undefined) updatePayload.ncaaApproved = data.ncaaApproved;
    if (data.status !== undefined) updatePayload.status = data.status;

    if (data.subjectId) {
      const validSubject = await this.subjectsRepo.findOne({
        where: {id: data.subjectId, isActive: true, isDeleted: false},
      });
      if (!validSubject) {
        throw new HttpErrors.BadRequest(`Invalid subjectId '${data.subjectId}'. Subject does not exist in master data.`);
      }
      updatePayload.subjectId = data.subjectId;
    }

    if (data.gradeLevelId) {
      const validGrade = await this.gradeLevelsRepo.findOne({
        where: {id: data.gradeLevelId, isActive: true, isDeleted: false},
      });
      if (!validGrade) {
        throw new HttpErrors.BadRequest(`Invalid gradeLevelId '${data.gradeLevelId}'. Grade level does not exist in master data.`);
      }
      updatePayload.gradeLevelId = data.gradeLevelId;
    }

    if (data.instructorId) {
      const instUser = await this.usersRepo.findOne({
        where: {id: data.instructorId, isActive: true, isDeleted: false},
      });
      if (!instUser) {
        throw new HttpErrors.BadRequest(`Invalid instructorId '${data.instructorId}'. Instructor user does not exist.`);
      }
      updatePayload.instructorId = data.instructorId;
    }

    await this.courseRepo.updateById(id, {
      ...updatePayload,
      updatedAt: new Date(),
    });

    const updated = await this.courseRepo.findById(id, {
      include: [
        {relation: 'subject', scope: {fields: {id: true, label: true, value: true}}},
        {relation: 'gradeLevel', scope: {fields: {id: true, label: true, value: true}}},
        {relation: 'instructor', scope: {fields: {id: true, fullName: true, email: true}}},
        {relation: 'author', scope: {fields: {id: true, fullName: true, email: true}}},
      ],
    });
    return formatSuccessResponse(updated, 'Course updated successfully');
  }

  @authenticate('jwt')
  @del('/courses/{id}')
  async deleteCourse(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const course = await this.courseRepo.findOne({where: {id, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${id}' not found`);
    }

    await this.courseRepo.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return formatSuccessResponse({id}, 'Course soft deleted successfully');
  }

  // ── Curriculum Modules ──────────────────────────────────────────────────
  @authenticate('jwt')
  @post('/courses/{id}/modules', {
    responses: {
      '200': {
        description: 'Module Instance',
        content: {'application/json': {schema: getModelSchemaRef(Module)}},
      },
    },
  })
  async createModule(
    @param.path.string('id') courseId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Module, {
            title: 'NewModule',
            exclude: ['id', 'courseId', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Omit<Module, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const course = await this.courseRepo.findOne({where: {id: courseId, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found`);
    }

    const created = await this.moduleRepo.create({
      ...data,
      courseId,
      isActive: true,
      isDeleted: false,
    });

    return formatSuccessResponse(created, 'Module created successfully');
  }

  @authenticate('jwt')
  @patch('/modules/{id}')
  async updateModule(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Module, {partial: true}),
        },
      },
    })
    data: Partial<Module>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const mod = await this.moduleRepo.findOne({where: {id, isDeleted: false}});
    if (!mod) {
      throw new HttpErrors.NotFound(`Module with ID '${id}' not found`);
    }

    await this.moduleRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });

    const updated = await this.moduleRepo.findById(id);
    return formatSuccessResponse(updated, 'Module updated successfully');
  }

  @authenticate('jwt')
  @del('/modules/{id}')
  async deleteModule(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const mod = await this.moduleRepo.findOne({where: {id, isDeleted: false}});
    if (!mod) {
      throw new HttpErrors.NotFound(`Module with ID '${id}' not found`);
    }

    await this.moduleRepo.updateById(id, {
      isDeleted: true,
    });

    return formatSuccessResponse({id}, 'Module deleted successfully');
  }

  // ── Curriculum Lessons ──────────────────────────────────────────────────
  @authenticate('jwt')
  @post('/modules/{id}/lessons', {
    responses: {
      '200': {
        description: 'Lesson Instance',
        content: {'application/json': {schema: getModelSchemaRef(Lesson)}},
      },
    },
  })
  async createLesson(
    @param.path.string('id') moduleId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Lesson, {
            title: 'NewLesson',
            exclude: ['id', 'moduleId', 'courseId', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Omit<Lesson, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const moduleRecord = await this.moduleRepo.findOne({where: {id: moduleId, isDeleted: false}});
    if (!moduleRecord) {
      throw new HttpErrors.NotFound(`Module with ID '${moduleId}' not found`);
    }

    const created = await this.lessonRepo.create({
      ...data,
      moduleId,
      courseId: moduleRecord.courseId,
      isActive: true,
      isDeleted: false,
    });

    return formatSuccessResponse(created, 'Lesson created successfully');
  }

  @authenticate('jwt')
  @patch('/lessons/{id}')
  async updateLesson(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Lesson, {partial: true}),
        },
      },
    })
    data: Partial<Lesson>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const lesson = await this.lessonRepo.findOne({where: {id, isDeleted: false}});
    if (!lesson) {
      throw new HttpErrors.NotFound(`Lesson with ID '${id}' not found`);
    }

    await this.lessonRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });

    const updated = await this.lessonRepo.findById(id);
    return formatSuccessResponse(updated, 'Lesson updated successfully');
  }

  @authenticate('jwt')
  @del('/lessons/{id}')
  async deleteLesson(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const lesson = await this.lessonRepo.findOne({where: {id, isDeleted: false}});
    if (!lesson) {
      throw new HttpErrors.NotFound(`Lesson with ID '${id}' not found`);
    }

    await this.lessonRepo.updateById(id, {
      isDeleted: true,
    });

    return formatSuccessResponse({id}, 'Lesson deleted successfully');
  }

  // ── Syllabus Tree ───────────────────────────────────────────────────────
  @get('/courses/{id}/syllabus')
  async getSyllabus(
    @param.path.string('id') courseId: string,
    @param.query.string('userId') userId?: string,
  ) {
    const syllabus = await this.courseService.getSyllabusTree(courseId, userId);
    return formatSuccessResponse(syllabus, 'Course syllabus tree retrieved successfully');
  }

  // ── Enrollment & Lesson Progress Engine ─────────────────────────────────
  @authenticate('jwt')
  @post('/courses/{id}/enroll')
  async enrollStudent(
    @param.path.string('id') courseId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['student_junior', 'student_senior', 'admin']);
    const userId = (currentUser as any).id || (currentUser as any).userId;
    const result = await this.courseService.enrollStudent(userId, courseId);
    return formatSuccessResponse(result, 'Enrollment status updated');
  }

  @authenticate('jwt')
  @post('/lessons/{id}/complete')
  async completeLesson(
    @param.path.string('id') lessonId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['student_junior', 'student_senior', 'admin']);
    const userId = (currentUser as any).id || (currentUser as any).userId;
    const result = await this.courseService.completeLesson(userId, lessonId);
    return formatSuccessResponse(result, 'Lesson completed and progress updated');
  }
}
