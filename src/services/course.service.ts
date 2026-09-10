import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  CourseRepository,
  EnrollmentRepository,
  GradeLevelsRepository,
  LessonProgressRepository,
  LessonRepository,
  ModuleRepository,
  RolesRepository,
  StudentProfileRepository,
  SubjectsRepository,
  UserRolesRepository,
  UsersRepository,
} from '../repositories';
import {Course, Lesson} from '../models';

@injectable({scope: BindingScope.TRANSIENT})
export class CourseService {
  constructor(
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(ModuleRepository)
    public moduleRepo: ModuleRepository,
    @repository(LessonRepository)
    public lessonRepo: LessonRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @repository(LessonProgressRepository)
    public lessonProgressRepo: LessonProgressRepository,
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(SubjectsRepository)
    public subjectsRepo: SubjectsRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(RolesRepository)
    public rolesRepo: RolesRepository,
    @repository(UserRolesRepository)
    public userRolesRepo: UserRolesRepository,
  ) {}

  /**
   * Format course instance with resolved relational values for frontend
   */
  private formatCourseWithRelations(course: any) {
    const plain = typeof course.toJSON === 'function' ? course.toJSON() : course;
    const tier = plain.gradeLevel?.category || 'senior';
    return {
      ...plain,
      tier,
      subject: plain.subject?.label || plain.subject?.value || plain.subject || '',
      gradeLevel: plain.gradeLevel?.label || plain.gradeLevel?.value || plain.gradeLevel || '',
      instructor: plain.instructor?.fullName || plain.author?.fullName || '',
    };
  }

  /**
   * Fetch paginated & filtered course catalog
   */
  async getCatalog(query: {
    tier?: string;
    subject?: string;
    subjectId?: string;
    gradeLevel?: string;
    gradeLevelId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const andClauses: any[] = [
      {isDeleted: false},
      {isActive: true},
    ];

    // Filter by status if specified (e.g. 'draft', 'published', 'archived', or 'all')
    if (query.status && query.status.toLowerCase() !== 'all') {
      andClauses.push({status: query.status.toLowerCase()});
    }

    if (query.tier) {
      const matchingGrades = await this.gradeLevelsRepo.find({
        where: {and: [{category: query.tier}, {isActive: true}, {isDeleted: false}]},
      });
      const gradeIds = matchingGrades.map(g => g.id);
      if (gradeIds.length > 0) {
        andClauses.push({gradeLevelId: {inq: gradeIds}});
      } else {
        andClauses.push({gradeLevelId: '00000000-0000-0000-0000-000000000000'});
      }
    }

    // Filter by subjectId foreign key
    if (query.subjectId) {
      andClauses.push({subjectId: query.subjectId});
    }

    // Filter by gradeLevelId foreign key
    if (query.gradeLevelId) {
      andClauses.push({gradeLevelId: query.gradeLevelId});
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      andClauses.push({
        or: [
          {title: {ilike: `%${searchTerm}%`}},
          {description: {ilike: `%${searchTerm}%`}},
          {subtitle: {ilike: `%${searchTerm}%`}},
        ],
      });
    }

    const whereClause: any = andClauses.length > 1 ? {and: andClauses} : andClauses[0];

    const total = await this.courseRepo.count(whereClause);
    const courses = await this.courseRepo.find({
      where: whereClause,
      include: [
        {
          relation: 'subject',
          scope: {
            fields: {id: true, label: true, value: true},
          },
        },
        {
          relation: 'gradeLevel',
          scope: {
            fields: {id: true, label: true, value: true, category: true},
          },
        },
        {
          relation: 'instructor',
          scope: {
            fields: {id: true, fullName: true, email: true},
          },
        },
        {
          relation: 'author',
          scope: {
            fields: {id: true, fullName: true, email: true},
          },
        },
      ],
      limit,
      skip,
      order: ['createdAt DESC'],
    });

    const formattedCourses = courses.map(c => this.formatCourseWithRelations(c));

    return {
      courses: formattedCourses,
      pagination: {
        total: total.count,
        page,
        limit,
        totalPages: Math.ceil(total.count / limit),
      },
    };
  }

  /**
   * Fetch complete course syllabus tree with user progress statuses
   */
  async getSyllabusTree(courseId: string, userId?: string) {
    const course = await this.courseRepo.findOne({
      where: {id: courseId, isDeleted: false},
      include: [
        {
          relation: 'subject',
          scope: {fields: {id: true, label: true, value: true}},
        },
        {
          relation: 'gradeLevel',
          scope: {fields: {id: true, label: true, value: true}},
        },
        {
          relation: 'instructor',
          scope: {fields: {id: true, fullName: true, email: true}},
        },
        {
          relation: 'author',
          scope: {fields: {id: true, fullName: true, email: true}},
        },
      ],
    });

    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found`);
    }

    const modules = await this.moduleRepo.find({
      where: {courseId, isDeleted: false, isActive: true},
      order: ['orderIndex ASC'],
    });

    // Fetch all completed lesson IDs for this user if authenticated
    let completedLessonIds = new Set<string>();
    if (userId) {
      const progressRecords = await this.lessonProgressRepo.find({
        where: {usersId: userId, courseId, isCompleted: true},
      });
      completedLessonIds = new Set(progressRecords.map(p => p.lessonId));
    }

    const syllabusModules = [];
    let isFirstUncompletedSet = false;

    for (const mod of modules) {
      const lessons = await this.lessonRepo.find({
        where: {moduleId: mod.id, isDeleted: false, isActive: true},
        include: [{relation: 'media'}],
        order: ['orderIndex ASC'],
      });

      const processedLessons = lessons.map(lesson => {
        const isDone = completedLessonIds.has(lesson.id!);
        let status: 'done' | 'current' | 'locked' = 'locked';

        if (isDone) {
          status = 'done';
        } else if (!isFirstUncompletedSet) {
          status = 'current';
          isFirstUncompletedSet = true;
        }

        return {
          ...lesson,
          status,
        };
      });

      syllabusModules.push({
        ...mod,
        lessons: processedLessons,
      });
    }

    return {
      course: this.formatCourseWithRelations(course),
      modules: syllabusModules,
    };
  }

  /**
   * Fetch eligible instructors list (Content Managers / Curriculum Authors: role 'content')
   */
  async getInstructors() {
    const users = await this.usersRepo.find({
      where: {isDeleted: false, isActive: true},
      fields: {id: true, fullName: true, email: true},
      include: [
        {
          relation: 'roles',
          scope: {
            where: {isActive: true, isDeleted: false},
            fields: {id: true, value: true, label: true},
          },
        },
      ],
    });

    const instructors = users.filter(u =>
      (u.roles || []).some(r => r.value === 'content'),
    );

    return instructors.map(u => ({
      id: u.id,
      fullName: u.fullName || u.email.split('@')[0],
      email: u.email,
    }));
  }

  /**
   * Enroll authenticated student into a course
   */
  async enrollStudent(userId: string, courseId: string) {
    const course = await this.courseRepo.findOne({
      where: {id: courseId, isDeleted: false, isActive: true},
    });

    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found`);
    }

    const existingEnrollment = await this.enrollmentRepo.findOne({
      where: {usersId: userId, courseId},
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'dropped' || existingEnrollment.isDeleted) {
        await this.enrollmentRepo.updateById(existingEnrollment.id, {
          status: 'active',
          isDeleted: false,
          updatedAt: new Date(),
        });
      }
      return {
        message: 'Student already enrolled in this course',
        enrollment: existingEnrollment,
      };
    }

    const totalLessons = await this.lessonRepo.count({
      courseId,
      isDeleted: false,
      isActive: true,
    });

    const newEnrollment = await this.enrollmentRepo.create({
      usersId: userId,
      courseId,
      status: 'active',
      progressRate: 0.0,
      completedLessonsCount: 0,
      totalLessonsCount: totalLessons.count,
      enrolledAt: new Date(),
    });

    // Increment enrolledCoursesCount in StudentProfile
    const profile = await this.studentProfileRepo.findOne({where: {usersId: userId}});
    if (profile) {
      await this.studentProfileRepo.updateById(profile.id, {
        enrolledCoursesCount: (profile.enrolledCoursesCount || 0) + 1,
        updatedAt: new Date(),
      });
    }

    return {
      message: 'Successfully enrolled in course',
      enrollment: newEnrollment,
    };
  }

  /**
   * Complete a lesson, update progress rate, and reward XP
   */
  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: {id: lessonId, isDeleted: false},
    });

    if (!lesson) {
      throw new HttpErrors.NotFound(`Lesson with ID '${lessonId}' not found`);
    }

    let progressRecord = await this.lessonProgressRepo.findOne({
      where: {usersId: userId, lessonId},
    });

    let isNewCompletion = false;

    if (!progressRecord) {
      progressRecord = await this.lessonProgressRepo.create({
        usersId: userId,
        lessonId,
        courseId: lesson.courseId,
        isCompleted: true,
        completedAt: new Date(),
      });
      isNewCompletion = true;
    } else if (!progressRecord.isCompleted) {
      await this.lessonProgressRepo.updateById(progressRecord.id, {
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
      isNewCompletion = true;
    }

    // Recalculate enrollment progress rate
    const enrollment = await this.enrollmentRepo.findOne({
      where: {usersId: userId, courseId: lesson.courseId},
    });

    let currentProgress = 0;
    if (enrollment) {
      const completedCount = await this.lessonProgressRepo.count({
        usersId: userId,
        courseId: lesson.courseId,
        isCompleted: true,
      });

      const totalLessons = await this.lessonRepo.count({
        courseId: lesson.courseId,
        isDeleted: false,
        isActive: true,
      });

      const total = totalLessons.count || 1;
      currentProgress = Math.min(100, Math.round((completedCount.count / total) * 100));

      const isCourseCompleted = currentProgress >= 100;

      await this.enrollmentRepo.updateById(enrollment.id, {
        completedLessonsCount: completedCount.count,
        totalLessonsCount: total,
        progressRate: currentProgress,
        status: isCourseCompleted ? 'completed' : 'active',
        updatedAt: new Date(),
      });
    }

    // Reward XP and update student profile stats if new completion
    let xpAwarded = 0;
    if (isNewCompletion) {
      xpAwarded = lesson.xpReward || 50;
      const profile = await this.studentProfileRepo.findOne({where: {usersId: userId}});
      if (profile) {
        const newXp = (profile.xp || 0) + xpAwarded;
        const newLevel = Math.floor(newXp / 300) + 1; // 300 XP per level milestone
        const completedCount = (profile.completedLessons || 0) + 1;

        await this.studentProfileRepo.updateById(profile.id, {
          xp: newXp,
          level: newLevel,
          completedLessons: completedCount,
          updatedAt: new Date(),
        });
      }
    }

    return {
      message: 'Lesson completed successfully',
      lessonId,
      xpAwarded,
      progressRate: currentProgress,
    };
  }

  /**
   * Fetch Junior Interactive Learning Map Graph
   */
  async getJuniorLearningMap(userId: string) {
    const enrollments = await this.enrollmentRepo.find({
      where: {usersId: userId, status: 'active'},
    });

    const juniorGrades = await this.gradeLevelsRepo.find({
      where: {category: 'junior', isActive: true, isDeleted: false},
    });
    const juniorGradeIds: string[] = juniorGrades.map(g => g.id!).filter(Boolean);

    const activeCourses = await this.courseRepo.find({
      where: {
        gradeLevelId: {inq: juniorGradeIds.length > 0 ? juniorGradeIds : ['00000000-0000-0000-0000-000000000000']},
        isDeleted: false,
        isActive: true,
      },
      include: ['subject'],
      limit: 10,
    });

    const nodes = activeCourses.map((course: any, idx) => {
      const enrollment = enrollments.find(e => e.courseId === course.id);
      const isEnrolled = !!enrollment;
      const progress = enrollment?.progressRate || 0;

      let status: 'unlocked' | 'in_progress' | 'completed' | 'locked' = 'locked';

      if (progress >= 100) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'in_progress';
      } else if (isEnrolled || idx === 0) {
        status = 'unlocked';
      }

      return {
        id: course.id,
        nodeIndex: idx + 1,
        title: course.title,
        subject: course.subject?.label || course.subject?.value || 'General',
        emoji: course.emoji || '📚',
        status,
        progress,
      };
    });

    return {
      learningMap: {
        nodes,
        totalNodes: nodes.length,
        completedNodes: nodes.filter(n => n.status === 'completed').length,
      },
    };
  }

  /**
   * Soft-delete Course
   */
  async deleteCourse(id: string) {
    const course = await this.courseRepo.findOne({where: {id, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${id}' not found.`);
    }

    await this.courseRepo.updateById(id, {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
    });

    return {id, message: 'Course deleted successfully'};
  }

  /**
   * Soft-delete Module
   */
  async deleteModule(id: string) {
    const moduleRecord = await this.moduleRepo.findOne({where: {id, isDeleted: false}});
    if (!moduleRecord) {
      throw new HttpErrors.NotFound(`Module with ID '${id}' not found.`);
    }

    await this.moduleRepo.updateById(id, {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
    });

    return {id, message: 'Module deleted successfully'};
  }

  /**
   * Assign primary instructor to a course
   */
  async assignInstructor(courseId: string, instructorId: string) {
    const course = await this.courseRepo.findOne({where: {id: courseId, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found.`);
    }

    const instructor = await this.usersRepo.findOne({where: {id: instructorId, isDeleted: false}});
    if (!instructor) {
      throw new HttpErrors.NotFound(`Instructor with ID '${instructorId}' not found.`);
    }

    await this.courseRepo.updateById(courseId, {
      instructorId,
      updatedAt: new Date(),
    });

    return {
      courseId,
      instructorId,
      instructorName: instructor.fullName || instructor.email,
      message: 'Instructor successfully assigned to course',
    };
  }

  /**
   * Batch enroll an entire cohort of students into a course
   */
  async batchEnrollStudents(
    courseId: string,
    studentUserIds: string[],
    learningMode: 'credit' | 'revision' = 'credit',
  ) {
    const course = await this.courseRepo.findOne({where: {id: courseId, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found.`);
    }

    if (!Array.isArray(studentUserIds) || studentUserIds.length === 0) {
      throw new HttpErrors.BadRequest('studentUserIds must be a non-empty array of user UUIDs.');
    }

    const validUsers = await this.usersRepo.find({
      where: {id: {inq: studentUserIds}, isDeleted: false},
    });
    const validUserIds = new Set(validUsers.map(u => u.id));

    const enrolled: any[] = [];
    for (const userId of studentUserIds) {
      if (!validUserIds.has(userId)) continue;

      const existing = await this.enrollmentRepo.findOne({
        where: {usersId: userId, courseId, isDeleted: false},
      });

      if (!existing) {
        const newEnrollment = await this.enrollmentRepo.create({
          usersId: userId,
          courseId,
          progressRate: 0,
          status: 'active',
          enrolledAt: new Date(),
        });
        enrolled.push(newEnrollment);

        // Update student enrolled courses count
        const profile = await this.studentProfileRepo.findOne({where: {usersId: userId}});
        if (profile) {
          await this.studentProfileRepo.updateById(profile.id, {
            enrolledCoursesCount: (profile.enrolledCoursesCount || 0) + 1,
          });
        }
      }
    }

    return {
      courseId,
      totalRequested: studentUserIds.length,
      successfullyEnrolled: enrolled.length,
      learningMode,
      message: `Successfully enrolled ${enrolled.length} students into course`,
    };
  }

  /**
   * Get live student progress roster for a course
   */
  async getCourseRoster(courseId: string) {
    const course = await this.courseRepo.findOne({where: {id: courseId, isDeleted: false}});
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found.`);
    }

    const enrollments = await this.enrollmentRepo.find({
      where: {courseId, isDeleted: false},
      include: [
        {
          relation: 'user',
          scope: {fields: {id: true, fullName: true, email: true, phone: true}},
        },
      ],
      order: ['enrolledAt DESC'],
    });

    const studentIds = enrollments.map(e => e.usersId);
    const profiles = studentIds.length > 0
      ? await this.studentProfileRepo.find({
          where: {usersId: {inq: studentIds}},
          include: [{relation: 'gradeLevel'}],
        })
      : [];

    const roster = enrollments.map(e => {
      const plainUser: any = (e as any).user || {};
      const profile = profiles.find(p => p.usersId === e.usersId);
      const grade = (profile as any)?.gradeLevel?.label || 'Grade 10';
      const progress = e.progressRate || 0;

      let studentStatus: 'on_track' | 'at_risk' | 'completed' = 'on_track';
      if (progress >= 100) studentStatus = 'completed';
      else if (progress < 25) studentStatus = 'at_risk';

      return {
        enrollmentId: e.id,
        studentId: e.usersId,
        studentName: plainUser.fullName || plainUser.email?.split('@')[0] || 'Student Learner',
        studentEmail: plainUser.email || '',
        gradeLevel: grade,
        progressRate: progress,
        status: e.status || 'active',
        performanceStatus: studentStatus,
        enrolledAt: e.enrolledAt || e.createdAt,
      };
    });

    return {
      courseId,
      courseTitle: course.title,
      totalStudentsEnrolled: roster.length,
      roster,
    };
  }

  /**
   * Unenroll / Drop student from course
   */
  async unenrollStudent(userId: string, courseId: string) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: {usersId: userId, courseId, isDeleted: false},
    });

    if (!enrollment) {
      throw new HttpErrors.NotFound('Active enrollment record not found.');
    }

    await this.enrollmentRepo.updateById(enrollment.id, {
      isDeleted: true,
      status: 'dropped',
      updatedAt: new Date(),
    });

    const profile = await this.studentProfileRepo.findOne({where: {usersId: userId}});
    if (profile && (profile.enrolledCoursesCount || 0) > 0) {
      await this.studentProfileRepo.updateById(profile.id, {
        enrolledCoursesCount: Math.max(0, (profile.enrolledCoursesCount || 1) - 1),
      });
    }

    return {
      courseId,
      userId,
      message: 'Student successfully unenrolled from course',
    };
  }
}

