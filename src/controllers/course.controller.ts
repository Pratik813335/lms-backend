import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {Course, Enrollment, Lesson, Module} from '../models';
import {
  CourseRepository,
  EnrollmentRepository,
  GradeLevelsRepository,
  LessonRepository,
  ModuleRepository,
  SubjectsRepository,
} from '../repositories';
import {CourseService, RbacService} from '../services';
import {formatSuccessResponse} from '../utils';

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
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(SubjectsRepository)
    public subjectsRepo: SubjectsRepository,
  ) {}

  // ── Course Catalog & Filter Engine ──────────────────────────────────────
  @get('/courses')
  async getCatalog(
    @param.query.string('tier') tier?: string,
    @param.query.string('subject') subject?: string,
    @param.query.string('gradeLevel') gradeLevel?: string,
    @param.query.string('search') search?: string,
    @param.query.number('page') page?: number,
    @param.query.number('limit') limit?: number,
  ) {
    const result = await this.courseService.getCatalog({
      tier,
      subject,
      gradeLevel,
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
          schema: getModelSchemaRef(Course, {
            title: 'NewCourse',
            exclude: ['id', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<Course, 'id'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    if (!data.title || !data.subject || !data.gradeLevel) {
      throw new HttpErrors.BadRequest('Title, subject, and gradeLevel are required');
    }

    // Pre-validate subject against PostgreSQL master table (Rule #1)
    const validSubject = await this.subjectsRepo.findOne({
      where: {value: data.subject, isActive: true, isDeleted: false},
    });
    if (!validSubject) {
      throw new HttpErrors.BadRequest(`Invalid subject '${data.subject}'. Subject does not exist in master data.`);
    }

    const courseTier = data.tier || 'senior';
    const courseCredits = data.credits !== undefined ? data.credits : (courseTier === 'junior' ? 0.0 : 1.0);

    const created = await this.courseRepo.create({
      ...data,
      tier: courseTier,
      credits: courseCredits,
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
          schema: getModelSchemaRef(Course, {
            title: 'UpdateCourse',
            partial: true,
            exclude: ['id', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<Course>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const course = await this.courseRepo.findOne({where: {id, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${id}' not found`);
    }

    if (data.subject) {
      const validSubject = await this.subjectsRepo.findOne({
        where: {value: data.subject, isActive: true, isDeleted: false},
      });
      if (!validSubject) {
        throw new HttpErrors.BadRequest(`Invalid subject '${data.subject}'. Subject does not exist in master data.`);
      }
    }

    await this.courseRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });

    const updated = await this.courseRepo.findById(id);
    return formatSuccessResponse(updated, 'Course updated successfully');
  }

  @authenticate('jwt')
  @del('/courses/{id}')
  async deleteCourse(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin']);

    const course = await this.courseRepo.findOne({where: {id, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${id}' not found`);
    }

    await this.courseRepo.updateById(id, {
      isDeleted: true,
      updatedAt: new Date(),
    });

    return formatSuccessResponse(null, 'Course deleted successfully');
  }

  // ── Curriculum Syllabus Hierarchy ─────────────────────────────────────────
  @get('/courses/{id}/syllabus')
  async getCourseSyllabus(
    @param.path.string('id') id: string,
    @param.query.string('userId') userId?: string,
  ) {
    const result = await this.courseService.getSyllabusTree(id, userId);
    return formatSuccessResponse(result, 'Course syllabus tree retrieved successfully');
  }

  @authenticate('jwt')
  @post('/courses/{id}/modules', {
    responses: {
      '200': {
        description: 'Module Model Instance',
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
            exclude: ['id', 'courseId', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<Module, 'id' | 'courseId'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const course = await this.courseRepo.findOne({where: {id: courseId, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found`);
    }

    if (!data.title) {
      throw new HttpErrors.BadRequest('Module title is required');
    }

    const created = await this.moduleRepo.create({
      ...data,
      courseId,
      orderIndex: data.orderIndex || 1,
      isActive: true,
      isDeleted: false,
    });

    return formatSuccessResponse(created, 'Module created successfully');
  }

  @authenticate('jwt')
  @patch('/modules/{id}', {
    responses: {
      '200': {
        description: 'Module PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(Module)}},
      },
    },
  })
  async updateModule(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Module, {
            title: 'UpdateModule',
            partial: true,
            exclude: ['id', 'courseId', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<Module>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const moduleRecord = await this.moduleRepo.findOne({where: {id, isDeleted: false}});
    if (!moduleRecord) {
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
  @post('/modules/{id}/lessons', {
    responses: {
      '200': {
        description: 'Lesson Model Instance',
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
            exclude: ['id', 'moduleId', 'courseId', 'createdAt', 'updatedAt', 'isDeleted'],
          }),
        },
      },
    })
    data: Omit<Lesson, 'id' | 'moduleId' | 'courseId'>,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'content']);

    const moduleRecord = await this.moduleRepo.findOne({where: {id: moduleId, isDeleted: false}});
    if (!moduleRecord) {
      throw new HttpErrors.NotFound(`Module with ID '${moduleId}' not found`);
    }

    if (!data.title) {
      throw new HttpErrors.BadRequest('Lesson title is required');
    }

    const created = await this.lessonRepo.create({
      ...data,
      moduleId,
      courseId: moduleRecord.courseId,
      type: data.type || 'video',
      orderIndex: data.orderIndex || 1,
      xpReward: data.xpReward || 50,
      isActive: true,
      isDeleted: false,
    });

    return formatSuccessResponse(created, 'Lesson created successfully');
  }

  @authenticate('jwt')
  @patch('/lessons/{id}', {
    responses: {
      '200': {
        description: 'Lesson PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(Lesson)}},
      },
    },
  })
  async updateLesson(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Lesson, {
            title: 'UpdateLesson',
            partial: true,
            exclude: ['id', 'moduleId', 'courseId', 'createdAt', 'updatedAt'],
          }),
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

  // ── Enrollments & Progress Tracking ──────────────────────────────────────
  @authenticate('jwt')
  @post('/courses/{id}/enroll')
  async enrollStudent(
    @param.path.string('id') courseId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {type: 'object'},
        },
      },
      required: false,
    })
    requestBodyData?: any,
  ) {
    const result = await this.courseService.enrollStudent(currentUser.id, courseId);
    return formatSuccessResponse(result, 'Student course enrollment processed');
  }

  @authenticate('jwt')
  @patch('/enrollments/{id}', {
    responses: {
      '200': {
        description: 'Enrollment PATCH Success',
        content: {'application/json': {schema: getModelSchemaRef(Enrollment)}},
      },
    },
  })
  async updateEnrollment(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Enrollment, {
            title: 'UpdateEnrollment',
            partial: true,
            exclude: ['id', 'usersId', 'courseId', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    data: Partial<Enrollment>,
  ) {
    const enrollment = await this.enrollmentRepo.findOne({where: {id}});
    if (!enrollment) {
      throw new HttpErrors.NotFound(`Enrollment with ID '${id}' not found`);
    }

    // Scoped check: User can only update their own enrollment unless admin
    if (enrollment.usersId !== currentUser.id && !currentUser.roles.includes('admin')) {
      throw new HttpErrors.Forbidden('Cannot update another student enrollment');
    }

    await this.enrollmentRepo.updateById(id, {
      ...data,
      updatedAt: new Date(),
    });

    const updated = await this.enrollmentRepo.findById(id);
    return formatSuccessResponse(updated, 'Enrollment updated successfully');
  }

  @authenticate('jwt')
  @post('/lessons/{id}/complete')
  async completeLesson(
    @param.path.string('id') lessonId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {type: 'object'},
        },
      },
      required: false,
    })
    requestBodyData?: any,
  ) {
    const result = await this.courseService.completeLesson(currentUser.id, lessonId);
    return formatSuccessResponse(result, 'Lesson completion recorded successfully');
  }
}
