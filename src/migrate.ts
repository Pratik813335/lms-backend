import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.join(__dirname, '../.env')});

import {LmsBackendApplication} from './application';
import {RolesRepository} from './repositories';

export async function migrate(args: string[]) {
  const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
  console.log('Migrating schemas (%s existing schema)...', existingSchema);

  const app = new LmsBackendApplication();
  await app.boot();
  await app.migrateSchema({
    existingSchema,
    models: [
      'Users',
      'Roles',
      'Permissions',
      'RolePermissions',
      'UserRoles',
      'StudentProfile',
      'GradeLevels',
      'Subjects',
      'AssetTypes',
      'ComplianceStatuses',
      'Otp',
      'Course',
      'Module',
      'Lesson',
      'Enrollment',
      'LessonProgress',
      'Media',
      'Assessment',
      'Question',
      'AssessmentSubmission',
      'Badge',
      'UserBadge',
      'Certificate',
      'WritingPrompt',
      'WritingLabSubmission',
      'ComplianceAudit',
      'Payment',
    ],
  });

  // Seed default system roles into PostgreSQL roles table
  const rolesRepo = await app.getRepository(RolesRepository);
  const defaultRoles = [
    {value: 'student_junior', label: 'Junior Student', description: 'Gamified junior student access'},
    {value: 'student_senior', label: 'Senior Student', description: 'Advanced high school senior student access'},
    {value: 'admin', label: 'System Administrator', description: 'Full system administration privileges'},
    {value: 'academic', label: 'Academic Coordinator', description: 'Academic performance and compliance monitoring'},
    {value: 'content', label: 'Content Creator / Curriculum Author', description: 'Course and curriculum authoring access'},
    {value: 'operations', label: 'Operations & Billing Staff', description: 'Operations and financial management access'},
  ];

  for (const roleDef of defaultRoles) {
    const existing = await rolesRepo.findOne({where: {value: roleDef.value}});
    if (!existing) {
      await rolesRepo.create({
        ...roleDef,
        isActive: true,
        isDeleted: false,
      });
    }
  }

  // Seed default badges
  const {BadgeRepository} = await import('./repositories');
  const badgeRepo = await app.getRepository(BadgeRepository);
  const defaultBadges = [
    {title: 'Math Whiz', description: 'Master mathematical concepts with precision', icon: 'Star', category: 'Academic', rarity: 'rare', milestoneType: 'quiz_score', milestoneCount: 90, xpReward: 200},
    {title: 'Consistent Learner', description: 'Maintained consistent study habits', icon: 'Zap', category: 'Engagement', rarity: 'common', milestoneType: 'streak_days', milestoneCount: 7, xpReward: 100},
    {title: 'Bookworm', description: 'Read and completed 5 reading lessons', icon: 'BookOpen', category: 'Literacy', rarity: 'common', milestoneType: 'completed_lessons', milestoneCount: 5, xpReward: 150},
    {title: 'Vocabulary Master', description: 'Demonstrated exceptional vocabulary fluency', icon: 'Target', category: 'Literacy', rarity: 'rare', milestoneType: 'completed_lessons', milestoneCount: 15, xpReward: 250},
    {title: 'Writing Pro', description: 'Submitted top-scoring essay in Writing Lab', icon: 'Shield', category: 'Writing', rarity: 'rare', milestoneType: 'quiz_score', milestoneCount: 85, xpReward: 200},
    {title: 'Top Scholar', description: 'Achieved mastery across multiple courses', icon: 'Trophy', category: 'Academic', rarity: 'legendary', milestoneType: 'credits', milestoneCount: 1, xpReward: 500},
    {title: 'Curious Mind', description: 'Engaged actively with AI Tutor discussions', icon: 'Star', category: 'Engagement', rarity: 'common', milestoneType: 'completed_lessons', milestoneCount: 3, xpReward: 100},
  ];

  for (const badgeDef of defaultBadges) {
    const existing = await badgeRepo.findOne({where: {title: badgeDef.title}});
    if (!existing) {
      await badgeRepo.create({
        ...badgeDef,
        isActive: true,
        isDeleted: false,
      });
    }
  }

  // Seed default compliance statuses
  const {ComplianceStatusesRepository, GradeLevelsRepository, SubjectsRepository} = await import('./repositories');
  const complianceStatusRepo = await app.getRepository(ComplianceStatusesRepository);
  const defaultComplianceStatuses = [
    {value: 'approved', label: 'Approved', description: 'Course satisfies all NCAA and academic rigor criteria'},
    {value: 'pending_review', label: 'Pending Review', description: 'Audit in progress'},
    {value: 'action_required', label: 'Action Required', description: 'Revisions required by curriculum author'},
  ];

  for (const cs of defaultComplianceStatuses) {
    const existing = await complianceStatusRepo.findOne({where: {value: cs.value}});
    if (!existing) {
      await complianceStatusRepo.create({
        ...cs,
        isActive: true,
        isDeleted: false,
      });
    }
  }

  // Seed default grade levels with student segmentation flags
  const gradeLevelsRepo = await app.getRepository(GradeLevelsRepository);
  const defaultGradeLevels = [
    {value: 'grade_3', label: 'Grade 3', category: 'junior', hasTestPrep: true, hasFullCurriculum: false, description: 'Elementary Grade 3 (Test Prep Only)'},
    {value: 'grade_4', label: 'Grade 4', category: 'junior', hasTestPrep: true, hasFullCurriculum: false, description: 'Elementary Grade 4 (Test Prep Only)'},
    {value: 'grade_5', label: 'Grade 5', category: 'junior', hasTestPrep: true, hasFullCurriculum: false, description: 'Elementary Grade 5 (Test Prep Only)'},
    {value: 'grade_6', label: 'Grade 6', category: 'junior', hasTestPrep: true, hasFullCurriculum: false, description: 'Middle School Grade 6 (Test Prep Only)'},
    {value: 'grade_7', label: 'Grade 7', category: 'junior', hasTestPrep: true, hasFullCurriculum: true, description: 'Middle School Grade 7 (Test Prep & Foundation Courses)'},
    {value: 'grade_8', label: 'Grade 8', category: 'junior', hasTestPrep: true, hasFullCurriculum: true, description: 'Middle School Grade 8 (Test Prep & Foundation Courses)'},
    {value: 'grade_9', label: 'Grade 9', category: 'senior', hasTestPrep: true, hasFullCurriculum: true, description: 'High School Freshman (Full Accredited Curriculum)'},
    {value: 'grade_10', label: 'Grade 10', category: 'senior', hasTestPrep: true, hasFullCurriculum: true, description: 'High School Sophomore (Full Accredited Curriculum)'},
    {value: 'grade_11', label: 'Grade 11', category: 'senior', hasTestPrep: true, hasFullCurriculum: true, description: 'High School Junior (Full Accredited Curriculum)'},
    {value: 'grade_12', label: 'Grade 12', category: 'senior', hasTestPrep: true, hasFullCurriculum: true, description: 'High School Senior (Full Accredited Curriculum)'},
  ];

  for (const g of defaultGradeLevels) {
    const existing = await gradeLevelsRepo.findOne({where: {value: g.value}});
    if (!existing) {
      await gradeLevelsRepo.create({
        ...g,
        isActive: true,
        isDeleted: false,
      });
    } else {
      await gradeLevelsRepo.updateById(existing.id, {
        hasTestPrep: g.hasTestPrep,
        hasFullCurriculum: g.hasFullCurriculum,
        category: g.category,
      });
    }
  }

  // Seed default subjects with test prep flag on 3 core subjects (Math, ELA, Science)
  const subjectsRepo = await app.getRepository(SubjectsRepository);
  const defaultSubjects = [
    {value: 'math', label: 'Mathematics', isTestPrep: true, description: 'Mathematics and Quantitative Problem Solving'},
    {value: 'ela', label: 'English Language Arts', isTestPrep: true, description: 'Reading Comprehension, Grammar and Writing'},
    {value: 'science', label: 'Science', isTestPrep: true, description: 'General, Life, Earth, and Physical Sciences'},
    {value: 'social_studies', label: 'Social Studies', isTestPrep: false, description: 'History, Civics, and Geography'},
    {value: 'world_languages', label: 'World Languages', isTestPrep: false, description: 'Spanish, French, and Global Languages'},
    {value: 'electives', label: 'Electives & Arts', isTestPrep: false, description: 'Creative Arts, Music, and Computer Science'},
  ];

  for (const s of defaultSubjects) {
    const existing = await subjectsRepo.findOne({where: {value: s.value}});
    if (!existing) {
      await subjectsRepo.create({
        ...s,
        isActive: true,
        isDeleted: false,
      });
    } else {
      await subjectsRepo.updateById(existing.id, {
        isTestPrep: s.isTestPrep,
      });
    }
  }

  console.log('✅ Database schema migration and default seeding completed successfully.');
  process.exit(0);
}

migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});
