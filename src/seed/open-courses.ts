/**
 * Open Career & Technical Courses importer
 *
 * Reads docs/open_courses/manifest.json + per-course JSON files and seeds into
 * the existing LMS schema only:
 *   subjects → courses (courseType=open) → modules → lessons
 *   + assessment shells (labels/counts only; no fabricated questions)
 *
 * Mapping (per IMPORT_NOTES / alignment review):
 *   Course  ← JSON course shell
 *   Module  ← JSON modules (or phases when modules[] is empty, e.g. Salon)
 *   Lesson  ← one lesson per week (module.weeks, gaps filled from top-level weeks)
 *   Phase   ← stored on module description / lesson content (no phase table)
 *   Assessment labels ← assessments rows without questions
 *
 * Idempotent: re-runs update course metadata and skip existing modules/lessons/assessments.
 *
 * Usage: npm run seed:open-courses
 */
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({path: path.join(__dirname, '../../.env')});

import {LmsBackendApplication} from '../application';
import {
  AssessmentRepository,
  CourseRepository,
  LessonRepository,
  ModuleRepository,
  SubjectsRepository,
} from '../repositories';

interface ManifestCourse {
  code: string;
  name: string;
  file: string;
  duration_weeks?: number;
  modules?: number;
  phases?: number;
  week_records?: number;
}

interface Manifest {
  courses: ManifestCourse[];
}

interface PhaseJson {
  phase_number: number;
  title: string;
  week_range?: number[];
}

interface WeekJson {
  week_number: number;
  title?: string;
  module_number?: number | null;
  weekly_focus_explicit?: boolean;
  quiz_title?: string | null;
  weekly_quiz?: any;
  content_source?: string;
  warm_up?: any;
  instructor_overview?: any;
  learning_objectives?: any[];
  lesson_content?: any;
  vocabulary?: any[];
  practice?: any;
  assignment?: any;
  components?: any;
}

interface ModuleJson {
  module_number: number;
  title: string;
  week_start?: number;
  week_end?: number;
  description?: string | null;
  topics?: string[];
  labs_and_practical_activities?: string[];
  assessments?: string[];
  source_content?: string[];
  weeks?: WeekJson[];
}

interface OpenCourseJson {
  code: string;
  slug?: string;
  name: string;
  subject?: string;
  duration_weeks?: number;
  module_count?: number;
  phase_count?: number;
  structure?: Record<string, string>;
  program_overview?: string[];
  program_learning_outcomes?: string[];
  phases?: PhaseJson[];
  modules?: ModuleJson[];
  weeks?: WeekJson[];
  pathways?: any[];
  licensure_tracks?: any;
  final_assessment?: any;
  milestones?: any[];
  assessment_policy_source_lines?: string[];
}

const SUBJECT_LABELS: Record<string, string> = {
  automotive_manufacturing: 'Automotive Manufacturing',
  construction: 'Construction Technology',
  cybersecurity: 'Cybersecurity',
  dental_assisting: 'Dental Assisting',
  electrical_technology: 'Electrical Technology',
  hvac: 'HVAC Technology',
  industrial_automation: 'Industrial Automation',
  plumbing: 'Plumbing Technology',
  welding: 'Welding Technology',
  salon_spa: 'Salon & Spa Management',
  salon_spa_management: 'Salon & Spa Management',
};

const SUBJECT_EMOJI: Record<string, string> = {
  automotive_manufacturing: '🚗',
  construction: '🏗️',
  cybersecurity: '🔐',
  dental_assisting: '🦷',
  electrical_technology: '⚡',
  hvac: '❄️',
  industrial_automation: '🤖',
  plumbing: '🚰',
  welding: '🔧',
  salon_spa: '💇',
  salon_spa_management: '💇',
};

function findOpenCoursesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'docs/open_courses'),
    path.resolve(__dirname, '../../docs/open_courses'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'manifest.json'))) return c;
  }
  throw new Error(
    `Could not find docs/open_courses/manifest.json in: ${candidates.join(', ')}`,
  );
}

function extractTagline(overview: string[] | undefined): string | undefined {
  if (!overview?.length) return undefined;
  const idx = overview.findIndex(l => /tagline/i.test(l));
  if (idx >= 0 && overview[idx + 1]) return overview[idx + 1];
  // Common pattern: short slogan line after title lines
  for (const line of overview.slice(0, 8)) {
    if (
      line &&
      line.length < 120 &&
      !/program|overview|week/i.test(line) &&
      /\./.test(line) === false &&
      line.split(' ').length <= 12
    ) {
      // keep scanning; prefer explicit short mottos with verbs
      if (/^[A-Z].*[.!]?$/.test(line) && line.includes(' ')) {
        // fall through
      }
    }
  }
  const motto = overview.find(
    l =>
      l &&
      l.length < 100 &&
      /(Learn|Prepare|Plan|Design|Understand|Connect|Install)\./i.test(l),
  );
  return motto;
}

function buildDescription(course: OpenCourseJson): string {
  const parts: string[] = [];
  if (course.program_overview?.length) {
    parts.push(course.program_overview.slice(0, 12).join('\n'));
  }
  if (course.program_learning_outcomes?.length) {
    parts.push(
      'Learning outcomes:\n' +
        course.program_learning_outcomes.map(o => `• ${o}`).join('\n'),
    );
  }
  if (course.structure) {
    parts.push(
      'Structure: ' +
        Object.entries(course.structure)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; '),
    );
  }
  return parts.join('\n\n').slice(0, 20000);
}

function inferAssessmentType(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('quiz')) return 'quiz';
  if (l.includes('final')) return 'final_exam';
  if (l.includes('practical') || l.includes('lab')) return 'practical';
  if (l.includes('test') || l.includes('exam')) return 'test';
  return 'module_check';
}

function phaseForWeek(
  phases: PhaseJson[] | undefined,
  weekNumber: number,
): PhaseJson | undefined {
  if (!phases?.length) return undefined;
  return phases.find(p => {
    const range = p.week_range;
    if (!range || range.length < 2) return false;
    return weekNumber >= range[0] && weekNumber <= range[1];
  });
}

function weekMapFromModules(modules: ModuleJson[]): Map<number, WeekJson> {
  const map = new Map<number, WeekJson>();
  for (const m of modules) {
    for (const w of m.weeks || []) {
      if (w.week_number != null) map.set(w.week_number, {...w, module_number: m.module_number});
    }
  }
  return map;
}

function mergeWeeks(
  modules: ModuleJson[],
  topLevelWeeks: WeekJson[] | undefined,
  durationWeeks: number,
): WeekJson[] {
  const byNum = weekMapFromModules(modules);
  for (const w of topLevelWeeks || []) {
    if (w.week_number == null) continue;
    const existing = byNum.get(w.week_number);
    if (!existing) {
      byNum.set(w.week_number, w);
    } else {
      // Prefer richer nested week; fill missing quiz fields from top-level
      byNum.set(w.week_number, {
        ...w,
        ...existing,
        quiz_title: existing.quiz_title ?? w.quiz_title,
        weekly_quiz: existing.weekly_quiz ?? w.weekly_quiz,
        title: existing.title || w.title,
        content_source: existing.content_source || w.content_source,
      });
    }
  }
  // Ensure contiguous week numbers 1..duration when top-level listed them
  if (topLevelWeeks?.length) {
    for (const w of topLevelWeeks) {
      if (w.week_number != null && !byNum.has(w.week_number)) {
        byNum.set(w.week_number, w);
      }
    }
  } else {
    for (let n = 1; n <= durationWeeks; n++) {
      if (!byNum.has(n)) {
        byNum.set(n, {
          week_number: n,
          title: `Week ${n}`,
          content_source: 'generated_placeholder',
        });
      }
    }
  }
  return [...byNum.values()].sort((a, b) => a.week_number - b.week_number);
}

function modulesForCourse(course: OpenCourseJson): ModuleJson[] {
  if (course.modules && course.modules.length > 0) {
    return course.modules;
  }

  // Salon (and similar): synthesize modules from phases
  if (course.phases && course.phases.length > 0) {
    return course.phases.map(p => {
      const [start, end] = p.week_range || [1, course.duration_weeks || 1];
      return {
        module_number: p.phase_number,
        title: p.title,
        week_start: start,
        week_end: end,
        description: `Phase ${p.phase_number}: weeks ${start}–${end}`,
        topics: [],
        assessments: [],
        weeks: [],
      };
    });
  }

  // Fallback: one module covering entire course
  return [
    {
      module_number: 1,
      title: course.name,
      week_start: 1,
      week_end: course.duration_weeks || 1,
      description: 'Open course module',
      weeks: [],
      assessments: [],
    },
  ];
}

function assignWeekToModuleNumber(
  week: WeekJson,
  modules: ModuleJson[],
): number {
  if (week.module_number != null && week.module_number !== undefined) {
    return Number(week.module_number);
  }
  for (const m of modules) {
    const start = m.week_start ?? 0;
    const end = m.week_end ?? 0;
    if (week.week_number >= start && week.week_number <= end) {
      return m.module_number;
    }
  }
  return modules[0]?.module_number ?? 1;
}

export async function seedOpenCoursesFromJson() {
  const app = new LmsBackendApplication();
  await app.boot();

  const subjectsRepo = await app.getRepository(SubjectsRepository);
  const courseRepo = await app.getRepository(CourseRepository);
  const moduleRepo = await app.getRepository(ModuleRepository);
  const lessonRepo = await app.getRepository(LessonRepository);
  const assessmentRepo = await app.getRepository(AssessmentRepository);

  const openDir = findOpenCoursesDir();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(openDir, 'manifest.json'), 'utf8'),
  ) as Manifest;

  console.log(`📂 Open courses dir: ${openDir}`);
  console.log(`📋 Manifest courses: ${manifest.courses.length}`);

  let coursesCreated = 0;
  let coursesUpdated = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;
  let assessmentsCreated = 0;

  for (const entry of manifest.courses) {
    const filePath = path.join(openDir, entry.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Missing file for ${entry.code}: ${entry.file}`);
      continue;
    }

    const courseJson = JSON.parse(
      fs.readFileSync(filePath, 'utf8'),
    ) as OpenCourseJson;

    const subjectValue = (courseJson.subject || 'electives').trim();
    const subjectLabel =
      SUBJECT_LABELS[subjectValue] ||
      subjectValue
        .split('_')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

    let subject = await subjectsRepo.findOne({
      where: {value: subjectValue, isDeleted: false},
    });
    if (!subject) {
      subject = await subjectsRepo.create({
        value: subjectValue,
        label: subjectLabel,
        description: `Workforce / open-course subject: ${subjectLabel}`,
        isTestPrep: false,
        isActive: true,
        isDeleted: false,
      });
      console.log(`  + Subject created: ${subjectValue}`);
    }

    const title = courseJson.name || entry.name;
    const durationWeeks =
      courseJson.duration_weeks || entry.duration_weeks || 24;
    const tagline = extractTagline(courseJson.program_overview);
    const description = buildDescription(courseJson);
    const certLines: string[] = [];
    if (Array.isArray(courseJson.assessment_policy_source_lines)) {
      certLines.push(
        ...courseJson.assessment_policy_source_lines.filter(
          l => typeof l === 'string' && l.length < 200,
        ).slice(0, 20),
      );
    }
    if (courseJson.pathways?.length) {
      certLines.push(
        ...courseJson.pathways.map(
          (p: any) => `Pathway: ${p.name || p.pathway_id}`,
        ),
      );
    }

    let course = await courseRepo.findOne({
      where: {title, courseType: 'open', isDeleted: false},
    });

    const coursePayload = {
      title,
      subtitle: courseJson.slug || courseJson.code,
      description,
      tagline,
      subjectId: subject.id!,
      courseType: 'open' as const,
      gradeLevelId: undefined,
      duration: `${durationWeeks} weeks`,
      durationWeeks,
      certifications: certLines.length ? certLines : undefined,
      emoji: SUBJECT_EMOJI[subjectValue] || '📘',
      credits: 0,
      ncaaApproved: false,
      status: 'published',
      isActive: true,
      isDeleted: false,
    };

    if (!course) {
      course = await courseRepo.create(coursePayload);
      coursesCreated += 1;
      console.log(`\n✅ Created open course: ${title}`);
    } else {
      await courseRepo.updateById(course.id, {
        ...coursePayload,
        updatedAt: new Date(),
      });
      course = await courseRepo.findById(course.id!);
      coursesUpdated += 1;
      console.log(`\n↷  Updated open course: ${title}`);
    }

    const moduleDefs = modulesForCourse(courseJson);
    const allWeeks = mergeWeeks(
      courseJson.modules || [],
      courseJson.weeks,
      durationWeeks,
    );

    const moduleIdByNumber = new Map<number, string>();

    for (const m of moduleDefs) {
      const orderIndex = m.module_number;
      const weekStart = m.week_start;
      const weekEnd = m.week_end;
      const weekRange =
        weekStart && weekEnd
          ? `Weeks ${weekStart}–${weekEnd}`
          : undefined;

      const phase = courseJson.phases?.find(
        p => p.phase_number === m.module_number,
      );
      const descParts = [
        m.description || null,
        phase ? `Phase: ${phase.title}` : null,
        m.topics?.length ? `Topics: ${m.topics.join('; ')}` : null,
        m.labs_and_practical_activities?.length
          ? `Labs: ${m.labs_and_practical_activities.join('; ')}`
          : null,
      ].filter(Boolean);

      let mod = await moduleRepo.findOne({
        where: {courseId: course.id, orderIndex, isDeleted: false},
      });

      if (!mod) {
        mod = await moduleRepo.create({
          courseId: course.id!,
          title: m.title,
          description: descParts.join('\n') || undefined,
          weekRange,
          orderIndex,
          isActive: true,
          isDeleted: false,
        });
        modulesCreated += 1;
      } else {
        await moduleRepo.updateById(mod.id, {
          title: m.title,
          description: descParts.join('\n') || undefined,
          weekRange,
          updatedAt: new Date(),
        });
      }
      moduleIdByNumber.set(orderIndex, mod.id!);

      // Assessment shells from module labels (no questions)
      for (const label of m.assessments || []) {
        if (!label || typeof label !== 'string') continue;
        const titleAssess = label.slice(0, 255);
        const existingAssess = await assessmentRepo.findOne({
          where: {
            courseId: course.id,
            moduleId: mod.id,
            title: titleAssess,
            isDeleted: false,
          },
        });
        if (!existingAssess) {
          await assessmentRepo.create({
            courseId: course.id!,
            moduleId: mod.id!,
            subjectId: subject.id!,
            title: titleAssess,
            type: inferAssessmentType(label),
            description:
              'Source-derived assessment label from open-course syllabus (no question bank in seed package).',
            passingPercentage: 80,
            timeLimitMinutes: 20,
            xpReward: 50,
            isActive: true,
            isDeleted: false,
          });
          assessmentsCreated += 1;
        }
      }
    }

    // Ensure a module exists for every week assignment
    for (const week of allWeeks) {
      const modNum = assignWeekToModuleNumber(week, moduleDefs);
      if (!moduleIdByNumber.has(modNum)) {
        const created = await moduleRepo.create({
          courseId: course.id!,
          title: `Module ${modNum}`,
          weekRange: undefined,
          orderIndex: modNum,
          isActive: true,
          isDeleted: false,
        });
        moduleIdByNumber.set(modNum, created.id!);
        modulesCreated += 1;
      }
    }

    for (const week of allWeeks) {
      const modNum = assignWeekToModuleNumber(week, moduleDefs);
      const moduleId = moduleIdByNumber.get(modNum)!;
      const parentModule = moduleDefs.find(m => m.module_number === modNum);
      const phase = phaseForWeek(courseJson.phases, week.week_number);

      const lessonTitle =
        week.title ||
        `Week ${week.week_number}: ${parentModule?.title || courseJson.name}`;

      const existingLesson = await lessonRepo.findOne({
        where: {
          courseId: course.id,
          moduleId,
          orderIndex: week.week_number,
          isDeleted: false,
        },
      });

      const content = {
        source: 'open_courses_json',
        courseCode: courseJson.code,
        weekNumber: week.week_number,
        moduleNumber: modNum,
        phase: phase
          ? {number: phase.phase_number, title: phase.title}
          : null,
        contentSource: week.content_source || null,
        weeklyFocusExplicit: week.weekly_focus_explicit ?? null,
        overview: week.instructor_overview || null,
        learningObjectives: week.learning_objectives || [],
        warmUp: week.warm_up || null,
        lessonContent: week.lesson_content || {topics: [], lessons: []},
        vocabulary: week.vocabulary || [],
        practice: week.practice || null,
        assignment: week.assignment || null,
        components: week.components || null,
        quizInfo: week.weekly_quiz || null,
        quizTitle: week.quiz_title || null,
        moduleTopics: parentModule?.topics || [],
        moduleLabs: parentModule?.labs_and_practical_activities || [],
        pathways: courseJson.pathways || null,
      };

      if (!existingLesson) {
        await lessonRepo.create({
          courseId: course.id!,
          moduleId,
          title: lessonTitle,
          type: week.quiz_title || week.weekly_quiz ? 'assessment' : 'reading',
          orderIndex: week.week_number,
          duration: courseJson.structure?.weekly_time_commitment || '1 week',
          xpReward: 50,
          content,
          isActive: true,
          isDeleted: false,
        });
        lessonsCreated += 1;
      } else {
        await lessonRepo.updateById(existingLesson.id, {
          title: lessonTitle,
          content,
          updatedAt: new Date(),
        });
      }

      // Optional week-level quiz shell
      if (week.quiz_title || week.weekly_quiz?.title) {
        const qTitle = String(
          week.quiz_title || week.weekly_quiz.title,
        ).slice(0, 255);
        const existingQ = await assessmentRepo.findOne({
          where: {
            courseId: course.id,
            moduleId,
            title: qTitle,
            isDeleted: false,
          },
        });
        if (!existingQ) {
          await assessmentRepo.create({
            courseId: course.id!,
            moduleId,
            subjectId: subject.id!,
            title: qTitle,
            type: 'quiz',
            description: `Week ${week.week_number} quiz (source label only; no questions seeded).`,
            passingPercentage: 80,
            timeLimitMinutes: 15,
            xpReward: 25,
            isActive: true,
            isDeleted: false,
          });
          assessmentsCreated += 1;
        }
      }
    }

    // Program overview lesson (orderIndex 0) under first module — metadata only
    const firstModId = moduleIdByNumber.get(
      Math.min(...moduleIdByNumber.keys()),
    );
    if (firstModId) {
      const overviewTitle = 'Program Overview & Pathways';
      const existingOverview = await lessonRepo.findOne({
        where: {
          courseId: course.id,
          moduleId: firstModId,
          orderIndex: 0,
          isDeleted: false,
        },
      });
      const overviewContent = {
        source: 'open_courses_json',
        courseCode: courseJson.code,
        programOverview: courseJson.program_overview || [],
        learningOutcomes: courseJson.program_learning_outcomes || [],
        phases: courseJson.phases || [],
        pathways: courseJson.pathways || null,
        licensureTracks: courseJson.licensure_tracks || null,
        milestones: courseJson.milestones || [],
        finalAssessment: courseJson.final_assessment || null,
        structure: courseJson.structure || null,
      };
      if (!existingOverview) {
        await lessonRepo.create({
          courseId: course.id!,
          moduleId: firstModId,
          title: overviewTitle,
          type: 'reading',
          orderIndex: 0,
          duration: 'overview',
          xpReward: 0,
          content: overviewContent,
          isActive: true,
          isDeleted: false,
        });
        lessonsCreated += 1;
      } else {
        await lessonRepo.updateById(existingOverview.id, {
          content: overviewContent,
          updatedAt: new Date(),
        });
      }
    }

    console.log(
      `   modules=${moduleIdByNumber.size}, weeks/lessons processed=${allWeeks.length}`,
    );
  }

  console.log('\n======================================================');
  console.log('🎉 OPEN COURSE JSON SEED COMPLETE');
  console.log(`   coursesCreated=${coursesCreated}`);
  console.log(`   coursesUpdated=${coursesUpdated}`);
  console.log(`   modulesCreated=${modulesCreated}`);
  console.log(`   lessonsCreated=${lessonsCreated}`);
  console.log(`   assessmentShellsCreated=${assessmentsCreated}`);
  console.log('======================================================\n');

  await app.stop();
}

if (require.main === module) {
  seedOpenCoursesFromJson().catch(err => {
    console.error('Cannot seed open courses from JSON', err);
    process.exit(1);
  });
}
