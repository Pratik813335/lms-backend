import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  patch,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {GradeLevelsRepository, StudentProfileRepository} from '../repositories';
import {CourseService, RbacService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class StudentController {
  constructor(
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
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
}
