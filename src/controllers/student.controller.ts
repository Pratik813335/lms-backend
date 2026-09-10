import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import {
  get,
  post,
  patch,
  del,
  param,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import { SecurityBindings } from '@loopback/security';
import {
  CourseRepository,
  EnrollmentRepository,
  GradeLevelsRepository,
  RolesRepository,
  StudentProfileRepository,
  UserRolesRepository,
  UsersRepository,
} from '../repositories';
import { BcryptHasher, CourseService, RbacService } from '../services';
import { LmsUserProfile } from '../types';
import { formatSuccessResponse } from '../utils';
import { validateStrongPassword } from '../utils/password.util';

export class StudentController {
  constructor(
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(RolesRepository)
    public rolesRepo: RolesRepository,
    @repository(UserRolesRepository)
    public userRolesRepo: UserRolesRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @inject('service.hasher')
    public hasher: BcryptHasher,
    @inject('services.course')
    public courseService: CourseService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) { }

  @authenticate('jwt')
  @get('/student/me/dashboard', {
    responses: {
      '200': {
        description: 'Student Live Dashboard Metrics',
        content: {
          'application/json': {
            schema: { type: 'object' },
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
      where: { usersId: currentUser.id },
      include: [
        {
          relation: 'gradeLevel',
          scope: { fields: { id: true, label: true, value: true, category: true, hasTestPrep: true, hasFullCurriculum: true } },
        },
      ],
    });

    if (!profile) {
      const isJunior = currentUser.roles?.includes('student_junior');
      const gradeTarget = currentUser.gradeLevel || (isJunior ? 'Grade 6' : 'Grade 10');
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: {
          and: [
            { or: [{ value: gradeTarget }, { label: gradeTarget }] },
            { isDeleted: false },
          ],
        },
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
    const hasTestPrep = plainProfile.gradeLevel?.hasTestPrep !== undefined ? plainProfile.gradeLevel.hasTestPrep : true;
    const hasFullCurriculum = plainProfile.gradeLevel?.hasFullCurriculum !== undefined ? plainProfile.gradeLevel.hasFullCurriculum : (tierDisplay === 'senior');

    const dashboardMetrics = {
      profile: {
        id: profile.id,
        usersId: profile.usersId,
        fullName: currentUser.fullName || currentUser.email.split('@')[0],
        email: currentUser.email,
        gradeLevelId: profile.gradeLevelId,
        gradeLevel: gradeLevelDisplay,
        tier: tierDisplay,
        hasTestPrep,
        hasFullCurriculum,
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
      where: { usersId: currentUser.id },
      include: [
        {
          relation: 'gradeLevel',
          scope: { fields: { id: true, label: true, value: true, category: true, hasTestPrep: true, hasFullCurriculum: true } },
        },
      ],
    });

    if (!profile) {
      const isJunior = currentUser.roles?.includes('student_junior');
      const gradeTarget = currentUser.gradeLevel || (isJunior ? 'Grade 6' : 'Grade 10');
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: {
          and: [
            { or: [{ value: gradeTarget }, { label: gradeTarget }] },
            { isDeleted: false },
          ],
        },
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
    const hasTestPrep = plainProfile.gradeLevel?.hasTestPrep !== undefined ? plainProfile.gradeLevel.hasTestPrep : true;
    const hasFullCurriculum = plainProfile.gradeLevel?.hasFullCurriculum !== undefined ? plainProfile.gradeLevel.hasFullCurriculum : (tierDisplay === 'senior');

    const fullProfileData = {
      ...plainProfile,
      gradeLevelId: profile.gradeLevelId,
      gradeLevel: gradeLevelDisplay,
      tier: tierDisplay,
      hasTestPrep,
      hasFullCurriculum,
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
              gradeLevelId: { type: 'string' },
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
      where: { usersId: currentUser.id },
    });

    if (!profile) {
      throw new HttpErrors.NotFound('Student profile not found');
    }

    const updatePayload: any = {};
    if (updateData.gradeLevelId) {
      const gradeMaster = await this.gradeLevelsRepo.findOne({
        where: { id: updateData.gradeLevelId, isActive: true, isDeleted: false },
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
          scope: { fields: { id: true, label: true, value: true, category: true } },
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
          scope: { fields: { id: true, label: true, value: true, category: true } },
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
        isOnboarding: user.isOnboarding ?? false,
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

  /**
   * Admin Student Creation (Add Student button in Admin Students Directory)
   */
  @authenticate('jwt')
  @post('/admin/students', {
    responses: {
      '200': {
        description: 'Admin student creation with 9 modal fields, course enrollments, and onboarding flag',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  async adminCreateStudent(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['fullName', 'email', 'gradeLevelId'],
            properties: {
              fullName: { type: 'string' },
              email: { type: 'string' },
              gradeLevelId: { type: 'string' },
              role: { type: 'string', enum: ['student_junior', 'student_senior'] },
              password: { type: 'string' },
              gpa: { type: 'number' },
              completionRate: { type: 'number' },
              joinDate: { type: 'string' },
              enrolledCourses: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    })
    body: {
      fullName: string;
      email: string;
      gradeLevelId: string;
      role?: 'student_junior' | 'student_senior';
      password?: string;
      gpa?: number | string;
      completionRate?: number | string;
      joinDate?: string;
      enrolledCourses?: string[];
    },
  ) {
    if (!body.fullName || !body.fullName.trim()) {
      throw new HttpErrors.BadRequest('fullName is required');
    }
    if (!body.gradeLevelId) {
      throw new HttpErrors.BadRequest('gradeLevelId is required');
    }
    const studentName = body.fullName.trim();
    const studentEmail = body.email.trim();
    const rawPassword = body.password?.trim();
    const initialPassword = (!rawPassword || rawPassword === 'Student123' || rawPassword === 'Student@123')
      ? 'Student@123'
      : rawPassword;

    // Validate password if custom password provided
    if (initialPassword !== 'Student@123') {
      validateStrongPassword(initialPassword);
    }

    // 1. Resolve Grade Level Master via foreign key
    const gradeMaster = await this.gradeLevelsRepo.findOne({
      where: { id: body.gradeLevelId, isActive: true, isDeleted: false },
    });
    if (!gradeMaster) {
      throw new HttpErrors.BadRequest(
        `Invalid gradeLevelId '${body.gradeLevelId}'. Grade level does not exist in master data.`,
      );
    }

    // 2. Resolve & Validate Role consistency with Grade Level Tier
    const expectedRole = gradeMaster.category === 'junior' ? 'student_junior' : 'student_senior';
    if (body.role && body.role !== expectedRole) {
      throw new HttpErrors.BadRequest(
        `Grade level '${gradeMaster.label || gradeMaster.value}' belongs to the ${gradeMaster.category} tier and cannot be assigned role senior. Expected junior.`,
      );
    }
    const roleKey = expectedRole;

    const targetRole = await this.rolesRepo.findOne({
      where: { value: roleKey, isActive: true, isDeleted: false },
    });

    if (!targetRole) {
      throw new HttpErrors.BadRequest(`System role '${roleKey}' not found in master data.`);
    }

    // 3. Check for existing user
    const existingUser = await this.usersRepo.findOne({
      where: { email: studentEmail },
    });

    if (existingUser) {
      throw new HttpErrors.Conflict(`User with email ${studentEmail} already exists`);
    }

    // 4. Hash initial password
    const hashedPassword = await this.hasher.hashPassword(initialPassword);

    // 5. Create user in PostgreSQL users table with isOnboarding: true
    const savedUser = await this.usersRepo.create({
      email: studentEmail,
      password: hashedPassword,
      fullName: studentName,
      isActive: true,
      isOnboarding: true,
      createdAt: body.joinDate ? new Date(body.joinDate) : new Date(),
    });

    // 6. Assign student role
    await this.userRolesRepo.create({
      usersId: savedUser.id!,
      rolesId: targetRole.id!,
      isActive: true,
      isDeleted: false,
    });

    // 7. Create student profile
    const gpaNum = Number(body.gpa) || 0.0;
    const enrolledCoursesList = Array.isArray(body.enrolledCourses) ? body.enrolledCourses : [];

    await this.studentProfileRepo.create({
      usersId: savedUser.id,
      gradeLevelId: gradeMaster.id,
      tier: roleKey === 'student_junior' ? 'junior' : 'senior',
      xp: 0,
      level: 1,
      streakDays: 0,
      gpa: gpaNum,
      completedLessons: 0,
      enrolledCoursesCount: enrolledCoursesList.length,
      aiInsights: 'Newly enrolled student — monitor onboarding and first-week engagement.',
      createdAt: body.joinDate ? new Date(body.joinDate) : new Date(),
    });

    // 8. Auto-enroll courses if selected
    if (enrolledCoursesList.length > 0) {
      for (const cId of enrolledCoursesList) {
        if (cId && typeof cId === 'string') {
          const course = await this.courseRepo.findOne({ where: { id: cId, isDeleted: false } });
          if (course) {
            await this.enrollmentRepo.create({
              usersId: savedUser.id!,
              courseId: cId,
              status: 'active',
              progressRate: Number(body.completionRate) || 0,
            });
          }
        }
      }
    }

    return formatSuccessResponse(
      {
        id: savedUser.id,
        name: studentName,
        email: studentEmail,
        role: roleKey,
        gradeLevel: gradeMaster.label || gradeMaster.value,
        tier: roleKey === 'student_junior' ? 'junior' : 'senior',
        gpa: gpaNum,
        completionRate: Number(body.completionRate) || 0,
        enrolledCourses: enrolledCoursesList,
        isOnboarding: true,
        createdAt: savedUser.createdAt,
      },
      'Student created successfully by admin',
    );
  }

  /**
   * Edit Student profile, grade level, and GPA by Admin
   */
  @authenticate('jwt')
  @patch('/admin/students/{id}')
  async updateStudentByAdmin(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fullName: {type: 'string'},
              gradeLevelId: {type: 'string'},
              gpa: {type: 'number'},
              isActive: {type: 'boolean'},
            },
          },
        },
      },
    })
    body: {
      fullName?: string;
      gradeLevelId?: string;
      gpa?: number;
      isActive?: boolean;
    },
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'academic', 'operations']);

    const user = await this.usersRepo.findOne({where: {id, isDeleted: false}});
    if (!user) {
      throw new HttpErrors.NotFound(`Student with ID '${id}' not found.`);
    }

    if (body.fullName !== undefined || body.isActive !== undefined) {
      const userUpdate: any = {updatedAt: new Date()};
      if (body.fullName !== undefined) userUpdate.fullName = body.fullName;
      if (body.isActive !== undefined) userUpdate.isActive = body.isActive;
      await this.usersRepo.updateById(id, userUpdate);
    }

    const profile = await this.studentProfileRepo.findOne({where: {usersId: id}});
    if (profile) {
      const profileUpdate: any = {updatedAt: new Date()};
      if (body.gpa !== undefined) profileUpdate.gpa = body.gpa;
      if (body.gradeLevelId) {
        const gradeMaster = await this.gradeLevelsRepo.findOne({
          where: {id: body.gradeLevelId, isActive: true, isDeleted: false},
        });
        if (!gradeMaster) {
          throw new HttpErrors.BadRequest(`Grade level with ID '${body.gradeLevelId}' not found.`);
        }
        profileUpdate.gradeLevelId = body.gradeLevelId;
        profileUpdate.tier = gradeMaster.category === 'junior' ? 'junior' : 'senior';
      }
      await this.studentProfileRepo.updateById(profile.id, profileUpdate);
    }

    const updatedUser = await this.usersRepo.findById(id);
    const updatedProfile = await this.studentProfileRepo.findOne({
      where: {usersId: id},
      include: [{relation: 'gradeLevel'}],
    });

    return formatSuccessResponse(
      {
        user: updatedUser,
        profile: updatedProfile,
      },
      'Student updated successfully',
    );
  }

  /**
   * Deactivate / Soft-delete Student by Admin
   */
  @authenticate('jwt')
  @del('/admin/students/{id}')
  async deleteStudentByAdmin(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'operations']);

    const user = await this.usersRepo.findOne({where: {id, isDeleted: false}});
    if (!user) {
      throw new HttpErrors.NotFound(`Student with ID '${id}' not found.`);
    }

    await this.usersRepo.updateById(id, {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
    });

    const profile = await this.studentProfileRepo.findOne({where: {usersId: id}});
    if (profile) {
      await this.studentProfileRepo.updateById(profile.id, {
        isDeleted: true,
        updatedAt: new Date(),
      });
    }

    return formatSuccessResponse({id}, 'Student deleted successfully');
  }
}

