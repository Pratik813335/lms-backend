import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  patch,
  param,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {
  EnrollmentRepository,
  GradeLevelsRepository,
  StudentProfileRepository,
  UsersRepository,
} from '../repositories';
import {CourseService, RbacService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class StudentController {
  constructor(
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @inject('services.course')
    public courseService: CourseService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) {}

  @authenticate('jwt')
  @get('/student/me/dashboard', {
    responses: {
      '200': {
        description: 'Student Live Dashboard Metrics',
        content: {
          'application/json': {
            schema: {type: 'object'},
          },
        },
      },
    },
  })
  async getStudentDashboard(
    @inject(SecurityBindings.USER)
    currentUser: LmsUserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['student_junior', 'student_senior', 'admin']);

    let profile = await this.studentProfileRepo.findOne({
      where: {usersId: currentUser.id},
      include: [
        {
          relation: 'gradeLevel',
          scope: {fields: {id: true, label: true, value: true, category: true}},
        },
      ],
    });

    if (!profile) {
      const isJunior = currentUser.roles?.includes('student_junior');
      const gradeTarget = currentUser.gradeLevel || (isJunior ? 'Grade 6' : 'Grade 10');
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: {or: [{value: gradeTarget}, {label: gradeTarget}], isDeleted: false},
      });

      profile = await this.studentProfileRepo.create({
        usersId: currentUser.id,
        gradeLevelId: gradeMaster?.id,
        xp: 0,
        level: 1,
        streakDays: 0,
        gpa: 0.0,
        completedLessons: 0,
        enrolledCoursesCount: 0,
        aiInsights: 'Welcome to LucidPrep! Complete your first lesson to unlock personalized AI learning insights.',
      });
    }

    const plainProfile: any = typeof profile.toJSON === 'function' ? profile.toJSON() : profile;
    const gradeLevelDisplay = plainProfile.gradeLevel?.label || plainProfile.gradeLevel?.value || plainProfile.gradeLevel || 'Grade 10';
    const tierDisplay = plainProfile.gradeLevel?.category || (currentUser.roles?.includes('student_junior') ? 'junior' : 'senior');

    const dashboardMetrics = {
      profile: {
        id: profile.id,
        usersId: profile.usersId,
        fullName: currentUser.fullName || currentUser.email.split('@')[0],
        email: currentUser.email,
        gradeLevelId: profile.gradeLevelId,
        gradeLevel: gradeLevelDisplay,
        tier: tierDisplay,
      },
      stats: {
        xp: profile.xp || 0,
        level: profile.level || 1,
        streakDays: profile.streakDays || 0,
        gpa: profile.gpa || 0.0,
        completedLessons: profile.completedLessons || 0,
        enrolledCoursesCount: profile.enrolledCoursesCount || 0,
      },
      aiInsights: profile.aiInsights,
      weeklyGoal: {
        currentHours: profile.completedLessons ? profile.completedLessons * 0.5 : 0,
        targetHours: 6.0,
      },
    };

    return formatSuccessResponse(dashboardMetrics, 'Student dashboard metrics retrieved successfully');
  }

  @authenticate('jwt')
  @get('/student/me/profile', {
    responses: {
      '200': {
        description: 'Get Student Profile details',
      },
    },
  })
  async getStudentProfile(
    @inject(SecurityBindings.USER)
    currentUser: LmsUserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['student_junior', 'student_senior', 'admin']);

    let profile = await this.studentProfileRepo.findOne({
      where: {usersId: currentUser.id},
      include: [
        {
          relation: 'gradeLevel',
          scope: {fields: {id: true, label: true, value: true, category: true}},
        },
      ],
    });

    if (!profile) {
      const isJunior = currentUser.roles?.includes('student_junior');
      const gradeTarget = currentUser.gradeLevel || (isJunior ? 'Grade 6' : 'Grade 10');
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: {or: [{value: gradeTarget}, {label: gradeTarget}], isDeleted: false},
      });

      profile = await this.studentProfileRepo.create({
        usersId: currentUser.id,
        gradeLevelId: gradeMaster?.id,
        xp: 0,
        level: 1,
        streakDays: 0,
        gpa: 0.0,
        completedLessons: 0,
        enrolledCoursesCount: 0,
      });
    }

    const plainProfile: any = typeof profile.toJSON === 'function' ? profile.toJSON() : profile;
    const gradeLevelDisplay = plainProfile.gradeLevel?.label || plainProfile.gradeLevel?.value || plainProfile.gradeLevel || 'Grade 10';
    const tierDisplay = plainProfile.gradeLevel?.category || (currentUser.roles?.includes('student_junior') ? 'junior' : 'senior');

    const fullProfileData = {
      ...plainProfile,
      gradeLevelId: profile.gradeLevelId,
      gradeLevel: gradeLevelDisplay,
      tier: tierDisplay,
      fullName: currentUser.fullName || currentUser.email.split('@')[0],
      email: currentUser.email,
    };

    return formatSuccessResponse(fullProfileData, 'Student profile fetched successfully');
  }

  @authenticate('jwt')
  @patch('/student/me/profile', {
    responses: {
      '200': {
        description: 'Update Student Profile',
      },
    },
  })
  async updateStudentProfile(
    @inject(SecurityBindings.USER)
    currentUser: LmsUserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              gradeLevelId: {type: 'string'},
            },
          },
        },
      },
    })
    updateData: {
      gradeLevelId?: string;
    },
  ) {
    this.rbacService.validateRole(currentUser as any, ['student_junior', 'student_senior', 'admin']);

    const profile = await this.studentProfileRepo.findOne({
      where: {usersId: currentUser.id},
    });

    if (!profile) {
      throw new HttpErrors.NotFound('Student profile not found');
    }

    const updatePayload: any = {};
    if (updateData.gradeLevelId) {
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: {id: updateData.gradeLevelId, isActive: true, isDeleted: false},
      });
      if (!gradeMaster) {
        throw new HttpErrors.BadRequest(`Invalid gradeLevelId '${updateData.gradeLevelId}'. Grade level does not exist in master data.`);
      }
      updatePayload.gradeLevelId = gradeMaster.id;
    }

    await this.studentProfileRepo.updateById(profile.id, {
      ...updatePayload,
      updatedAt: new Date(),
    });

    const updatedProfile = await this.studentProfileRepo.findById(profile.id, {
      include: [
        {
          relation: 'gradeLevel',
          scope: {fields: {id: true, label: true, value: true, category: true}},
        },
      ],
    });
    return formatSuccessResponse(updatedProfile, 'Student profile updated successfully');
  }

  @authenticate('jwt')
  @get('/student/me/learning-map', {
    responses: {
      '200': {
        description: 'Get Junior Interactive Learning Node Path Graph',
      },
    },
  })
  async getLearningMap(
    @inject(SecurityBindings.USER)
    currentUser: LmsUserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['student_junior', 'student_senior', 'admin']);
    const result = await this.courseService.getJuniorLearningMap(currentUser.id);
    return formatSuccessResponse(result, 'Junior learning map retrieved successfully');
  }

  /**
   * Get All Students Directory (Returns all students with profiles, grade levels, and stats)
   */
  @authenticate('jwt')
  @get('/students', {
    responses: {
      '200': {
        description: 'Get all students list with user info, student profiles, and metrics',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    totalPages: { type: 'number' },
                    students: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getAllStudents(
    @param.query.number('page') page?: number,
    @param.query.number('limit') limit?: number,
    @param.query.string('tier') tier?: string,
    @param.query.string('gradeLevelId') gradeLevelId?: string,
    @param.query.string('search') search?: string,
  ) {
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const profiles = await this.studentProfileRepo.find({
      include: [
        {
          relation: 'gradeLevel',
          scope: {fields: {id: true, label: true, value: true, category: true}},
        },
      ],
      order: ['createdAt DESC'],
    });

    const userIds = profiles.map(p => p.usersId).filter(Boolean);
    const users = userIds.length > 0 ? await this.usersRepo.find({ where: { id: { inq: userIds } } }) : [];
    const userMap = new Map<string, any>(users.map(u => [u.id!, u]));

    const enrollments = await this.enrollmentRepo.find();
    const enrollmentMap = new Map<string, string[]>();
    for (const e of enrollments) {
      if (e.usersId && e.courseId) {
        const arr = enrollmentMap.get(e.usersId) || [];
        arr.push(e.courseId);
        enrollmentMap.set(e.usersId, arr);
      }
    }

    let list = profiles.map(p => {
      const plainProf: any = typeof p.toJSON === 'function' ? p.toJSON() : p;
      const user = userMap.get(p.usersId) || {};
      const grade = plainProf.gradeLevel || {};
      const enrolled = enrollmentMap.get(p.usersId) || [];
      const studentTier = p.tier || grade.category || 'senior';

      return {
        id: user.id || p.usersId,
        profileId: p.id,
        name: user.fullName || (user.email ? user.email.split('@')[0] : 'Student'),
        email: user.email || '',
        role: studentTier === 'junior' ? 'student_junior' : 'student_senior',
        gradeLevel: grade.label || grade.value || (studentTier === 'junior' ? 'Grade 6' : 'Grade 10'),
        gradeLevelId: p.gradeLevelId || grade.id,
        tier: studentTier,
        gpa: p.gpa ?? 0.0,
        completedLessons: p.completedLessons ?? 0,
        enrolledCoursesCount: enrolled.length,
        enrolledCourses: enrolled,
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        streakDays: p.streakDays ?? 0,
        isActive: user.isActive ?? true,
        createdAt: user.createdAt || p.createdAt,
      };
    });

    if (tier) {
      list = list.filter(s => s.tier === tier.toLowerCase());
    }
    if (gradeLevelId) {
      list = list.filter(s => s.gradeLevelId === gradeLevelId);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }

    const total = list.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedStudents = list.slice(startIndex, startIndex + limitNum);

    return formatSuccessResponse(
      {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        students: paginatedStudents,
      },
      'All students retrieved successfully',
    );
  }
}
