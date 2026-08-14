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
import {StudentProfileRepository} from '../repositories';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class StudentController {
  constructor(
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
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
    let profile = await this.studentProfileRepo.findOne({
      where: {usersId: currentUser.id},
    });

    if (!profile) {
      profile = await this.studentProfileRepo.create({
        usersId: currentUser.id,
        gradeLevel: currentUser.gradeLevel || 'Grade 10',
        tier: currentUser.roles?.includes('student_junior') ? 'junior' : 'senior',
        xp: 1250,
        level: 5,
        streakDays: 7,
        gpa: 3.8,
        completedLessons: 14,
        enrolledCoursesCount: 4,
        aiInsights: 'Great progress in Algebra and Physics. Keep up the 7-day learning streak!',
      });
    }

    const dashboardMetrics = {
      profile: {
        id: profile.id,
        usersId: profile.usersId,
        fullName: currentUser.fullName || currentUser.email.split('@')[0],
        email: currentUser.email,
        gradeLevel: profile.gradeLevel,
        tier: profile.tier,
      },
      stats: {
        xp: profile.xp,
        level: profile.level,
        streakDays: profile.streakDays,
        gpa: profile.gpa,
        completedLessons: profile.completedLessons,
        enrolledCoursesCount: profile.enrolledCoursesCount,
      },
      aiInsights: profile.aiInsights,
      weeklyGoal: {
        currentHours: 4.5,
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
    let profile = await this.studentProfileRepo.findOne({
      where: {usersId: currentUser.id},
    });

    if (!profile) {
      profile = await this.studentProfileRepo.create({
        usersId: currentUser.id,
        gradeLevel: currentUser.gradeLevel || 'Grade 10',
      });
    }

    const fullProfileData = {
      ...profile,
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
              gradeLevel: {type: 'string'},
              tier: {type: 'string', enum: ['junior', 'senior']},
            },
          },
        },
      },
    })
    updateData: {
      gradeLevel?: string;
      tier?: 'junior' | 'senior';
    },
  ) {
    const profile = await this.studentProfileRepo.findOne({
      where: {usersId: currentUser.id},
    });

    if (!profile) {
      throw new HttpErrors.NotFound('Student profile not found');
    }

    await this.studentProfileRepo.updateById(profile.id, {
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedProfile = await this.studentProfileRepo.findById(profile.id);
    return formatSuccessResponse(updatedProfile, 'Student profile updated successfully');
  }
}
