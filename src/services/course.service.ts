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
    return {
      ...plain,
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
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isDeleted: false,
      isActive: true,
      status: 'published',
    };

    if (query.tier) {
      whereClause.tier = query.tier;
    }

    // Filter by subjectId foreign key
    if (query.subjectId) {
      whereClause.subjectId = query.subjectId;
    }

    // Filter by gradeLevelId foreign key
    if (query.gradeLevelId) {
      whereClause.gradeLevelId = query.gradeLevelId;
    }

    if (query.search) {
      whereClause.or = [
        {title: {like: `%${query.search}%`, options: 'i'}},
        {description: {like: `%${query.search}%`, options: 'i'}},
        {subtitle: {like: `%${query.search}%`, options: 'i'}},
      ];
    }

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
            fields: {id: true, label: true, value: true},
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
   * Fetch eligible instructors list (staff roles: content, academic, admin)
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
      (u.roles || []).some(r => ['content', 'academic', 'admin'].includes(r.value)),
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
      if (existingEnrollment.status === 'dropped') {
        await this.enrollmentRepo.updateById(existingEnrollment.id, {
          status: 'active',
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

    const activeCourses = await this.courseRepo.find({
      where: {
        tier: 'junior',
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
}
