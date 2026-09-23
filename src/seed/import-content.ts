import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({path: path.join(__dirname, '../../.env')});

import {LmsBackendApplication} from '../application';
import {
  GradeLevelsRepository,
  SubjectsRepository,
  CourseRepository,
  ModuleRepository,
  LessonRepository,
  AssessmentRepository,
  QuestionRepository,
} from '../repositories';

interface QuestionJson {
  module?: number;
  week?: number;
  topic?: string;
  standard?: string;
  difficulty?: string;
  question_type?: string;
  question: string;
  options?: any;
  correct_answer?: any;
  answer_explanation?: string;
  question_id?: string;
}

interface PaperJson {
  paper_id: string;
  course?: string;
  grade?: number;
  assessment_type?: string;
  module?: number;
  module_title?: string;
  question_count?: number;
  mastery_threshold_percent?: number;
  questions?: QuestionJson[];
}

interface TestPrepFileJson {
  course?: string;
  grade?: number;
  papers?: PaperJson[];
}

interface CourseWeekJson {
  week_number: number;
  title: string;
  focus?: string;
  instructor_overview?: string;
  learning_objectives?: string[];
  warm_up?: string[];
  lesson_content?: string[];
  vocabulary?: Array<{term: string; definition: string}>;
  practice?: string[];
  assignment?: string;
  weekly_quiz?: any;
}

interface CourseModuleJson {
  module_number: number;
  title: string;
  weeks?: CourseWeekJson[];
}

interface CourseFileJson {
  schema_version?: string;
  content_type?: string;
  course: {
    code: string;
    slug?: string;
    name: string;
    subject: string;
    recommended_grade_min?: number;
    recommended_grade_max?: number;
    duration_weeks?: number;
    module_count?: number;
    weeks_per_module?: number;
    credit_value?: number;
    prerequisite_policy?: string;
    early_progression?: boolean;
  };
  course_learning_outcomes?: string[];
  modules?: CourseModuleJson[];
}

export async function runIngestion() {
  console.log('🚀 Starting Curriculum & TestPrep Content Ingestion Engine...');
  const startTime = Date.now();

  const app = new LmsBackendApplication();
  await app.boot();

  const gradeLevelsRepo = await app.getRepository(GradeLevelsRepository);
  const subjectsRepo = await app.getRepository(SubjectsRepository);
  const courseRepo = await app.getRepository(CourseRepository);
  const moduleRepo = await app.getRepository(ModuleRepository);
  const lessonRepo = await app.getRepository(LessonRepository);
  const assessmentRepo = await app.getRepository(AssessmentRepository);
  const questionRepo = await app.getRepository(QuestionRepository);

  // 1. Locate Docs Directory
  const candidates = [
    process.env.DOCS_DIR,
    path.resolve(process.cwd(), 'docs'),
    path.resolve(__dirname, '../../docs'),
    path.resolve(__dirname, '../docs'),
    path.resolve(__dirname, '../../../lms-frontend-web/docs'),
    path.resolve(__dirname, '../../../../lms-frontend-web/docs'),
    path.resolve(process.cwd(), '../lms-frontend-web/docs'),
  ].filter(Boolean) as string[];

  let docsDir = '';
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      docsDir = c;
      break;
    }
  }

  if (!docsDir) {
    throw new Error(`Could not find docs directory in candidates: ${JSON.stringify(candidates)}`);
  }
  console.log(`📂 Using docs directory: ${docsDir}`);

  // 2. Ensure Master Subjects
  const standardSubjects = [
    {value: 'math', label: 'Mathematics', isTestPrep: true, description: 'Mathematics and Quantitative Problem Solving'},
    {value: 'ela', label: 'English Language Arts', isTestPrep: true, description: 'Reading Comprehension, Grammar and Writing'},
    {value: 'science', label: 'Science', isTestPrep: true, description: 'General, Life, Earth, and Physical Sciences'},
    {value: 'social_studies', label: 'Social Studies', isTestPrep: false, description: 'History, Civics, and Geography'},
    {value: 'world_languages', label: 'World Languages', isTestPrep: false, description: 'Spanish, French, and Global Languages'},
    {value: 'health_pe', label: 'Health & Physical Education', isTestPrep: false, description: 'Health, Wellness, and Physical Fitness'},
    {value: 'computer_science', label: 'Computer Science & Technology', isTestPrep: false, description: 'Computing, Coding, and Digital Skills'},
    {value: 'fine_arts', label: 'Fine Arts & Music', isTestPrep: false, description: 'Visual Arts, Music, and Creative Expression'},
    {value: 'electives', label: 'Electives & Arts', isTestPrep: false, description: 'Elective courses and specialized topics'},
  ];

  const subjectMap = new Map<string, string>(); // value -> id
  for (const s of standardSubjects) {
    let existing = await subjectsRepo.findOne({where: {value: s.value}});
    if (!existing) {
      existing = await subjectsRepo.create({
        ...s,
        isActive: true,
        isDeleted: false,
      });
      console.log(`  + Created subject master: ${s.label} (${s.value})`);
    } else {
      if (s.isTestPrep && !existing.isTestPrep) {
        await subjectsRepo.updateById(existing.id, {isTestPrep: true});
      }
    }
    subjectMap.set(s.value, existing.id!);
  }

  // 3. Ensure Master Grade Levels (Grade 3 - Grade 12)
  const gradeLevelMap = new Map<number, string>(); // number -> id
  for (let g = 3; g <= 12; g++) {
    const value = `grade_${g}`;
    const category = g <= 8 ? 'junior' : 'senior';
    const hasFullCurriculum = g >= 7; // Grades 3-6 test prep only, 7-12 full curriculum
    let existing = await gradeLevelsRepo.findOne({where: {value}});
    if (!existing) {
      existing = await gradeLevelsRepo.create({
        value,
        label: `Grade ${g}`,
        category,
        hasTestPrep: true,
        hasFullCurriculum,
        description: `${category === 'junior' ? 'Elementary / Middle' : 'High School'} Grade ${g}`,
        isActive: true,
        isDeleted: false,
      });
      console.log(`  + Created grade level master: Grade ${g} (${value})`);
    } else {
      await gradeLevelsRepo.updateById(existing.id, {
        category,
        hasTestPrep: true,
        hasFullCurriculum,
      });
    }
    gradeLevelMap.set(g, existing.id!);
  }

  // -------------------------------------------------------------
  // PART 1: INGEST GRADE 3 TO 7 TEST PREP PAPERS & QUESTIONS
  // (Zero fake courses: directly linked to GradeLevel + Subject)
  // -------------------------------------------------------------
  console.log('\n📘 INGESTING PART 1: Grade 3–7 Test Prep Papers & Questions...');
  let totalTestPrepPapersCreated = 0;
  let totalTestPrepQuestionsCreated = 0;

  const testPrepFolders = [
    {folder: 'grade3_testprep_papers', grade: 3},
    {folder: 'grade4_testprep_papers', grade: 4},
    {folder: 'grade5_testprep_papers', grade: 5},
    {folder: 'grade6_testprep_papers', grade: 6},
    {folder: 'grade7_testprep_papers', grade: 7},
  ];

  for (const {folder, grade} of testPrepFolders) {
    const folderPath = path.join(docsDir, folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`  ⚠️ Folder not found: ${folderPath}`);
      continue;
    }

    const gradeLevelId = gradeLevelMap.get(grade);
    if (!gradeLevelId) {
      console.error(`  ❌ No gradeLevelId for grade ${grade}`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') && f !== 'manifest.json');
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const fileData: TestPrepFileJson = JSON.parse(rawContent);

      // Determine subject
      let subjectValue = 'math';
      if (file.includes('ela')) {
        subjectValue = 'ela';
      } else if (file.includes('science')) {
        subjectValue = 'science';
      }
      const subjectId = subjectMap.get(subjectValue);
      if (!subjectId) {
        console.error(`  ❌ Subject ID not found for ${subjectValue}`);
        continue;
      }

      const papers = fileData.papers || [];
      let filePapersCount = 0;
      let fileQuestionsCount = 0;

      for (const paper of papers) {
        const paperCode = paper.paper_id;
        let assessment = await assessmentRepo.findOne({
          where: {paperCode, isDeleted: false},
        });

        if (!assessment) {
          const courseLabel = paper.course || `Grade ${grade} ${subjectValue.toUpperCase()}`;
          const moduleNumber = paper.module || 1;
          const moduleTitle = paper.module_title || `Module ${moduleNumber} Comprehensive Review`;

          assessment = await assessmentRepo.create({
            type: 'test_prep',
            title: `${courseLabel} - Paper ${moduleNumber}: ${moduleTitle}`,
            description: `Official practice test paper for Grade ${grade} covering ${moduleTitle}`,
            paperCode,
            gradeLevelId,
            subjectId,
            courseId: undefined, // Explicitly no fake course!
            passingPercentage: Number(paper.mastery_threshold_percent) || 70.0,
            timeLimitMinutes: 45,
            xpReward: 150,
            isActive: true,
            isDeleted: false,
          });
          totalTestPrepPapersCreated++;
          filePapersCount++;
        }

        const questions = paper.questions || [];
        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
          const q = questions[qIdx];
          const orderIndex = qIdx + 1;

          const existingQ = await questionRepo.findOne({
            where: {
              assessmentId: assessment.id,
              orderIndex,
              isDeleted: false,
            },
          });

          if (!existingQ) {
            // Defensively normalize options to always be string[]
            let cleanOptions: string[] = [];
            if (Array.isArray(q.options)) {
              cleanOptions = q.options.map(opt => String(opt));
            } else if (typeof q.options === 'string' && q.options.trim()) {
              cleanOptions = [q.options.trim()];
            } else if (q.options) {
              cleanOptions = [String(q.options)];
            }

            const cleanCorrectAnswer = String(q.correct_answer ?? cleanOptions[0] ?? 'N/A');
            if (cleanOptions.length === 0) {
              cleanOptions = [cleanCorrectAnswer];
            }

            await questionRepo.create({
              assessmentId: assessment.id,
              type: 'mcq',
              text: q.question || `Question ${orderIndex}`,
              options: cleanOptions,
              correctAnswer: cleanCorrectAnswer,
              explanation: q.answer_explanation ? String(q.answer_explanation) : '',
              points: 10,
              orderIndex,
              isActive: true,
              isDeleted: false,
            });
            totalTestPrepQuestionsCreated++;
            fileQuestionsCount++;
          }
        }
      }

      console.log(
        `  ✓ [Grade ${grade}] ${file}: Processed ${papers.length} papers (Created: ${filePapersCount} papers, ${fileQuestionsCount} questions)`,
      );
    }
  }

  // -------------------------------------------------------------
  // PART 2: INGEST GRADE 7 TO 12 ACCREDITED COURSES & CURRICULUM
  // (Full hierarchy: Course -> 4 Modules -> 36 Lessons)
  // -------------------------------------------------------------
  console.log('\n📗 INGESTING PART 2: Grade 7–12 Course Content & Syllabus...');
  let totalCoursesCreated = 0;
  let totalModulesCreated = 0;
  let totalLessonsCreated = 0;

  const coursesDir = path.join(docsDir, 'Syllabus Lucidprep', 'grades_7_12_course_content_json');
  if (!fs.existsSync(coursesDir)) {
    console.warn(`  ⚠️ Courses directory not found: ${coursesDir}`);
  } else {
    const manifestPath = path.join(coursesDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const courseFiles: Array<{course: string; path: string}> = manifest.files || [];

    for (const item of courseFiles) {
      const courseFilePath = path.join(coursesDir, item.path);
      if (!fs.existsSync(courseFilePath)) {
        console.warn(`  ⚠️ Course file missing: ${courseFilePath}`);
        continue;
      }

      const courseJson: CourseFileJson = JSON.parse(fs.readFileSync(courseFilePath, 'utf-8'));
      const courseInfo = courseJson.course;

      // Map course subject to DB subject
      const rawSubject = (courseInfo.subject || '').toLowerCase();
      let resolvedSubjectValue = 'electives';
      if (rawSubject.includes('math')) resolvedSubjectValue = 'math';
      else if (rawSubject.includes('english') || rawSubject.includes('literature')) resolvedSubjectValue = 'ela';
      else if (rawSubject.includes('science') || rawSubject.includes('physics') || rawSubject.includes('biology') || rawSubject.includes('chem')) resolvedSubjectValue = 'science';
      else if (rawSubject.includes('social') || rawSubject.includes('history') || rawSubject.includes('civics')) resolvedSubjectValue = 'social_studies';
      else if (rawSubject.includes('language') || rawSubject.includes('spanish') || rawSubject.includes('french')) resolvedSubjectValue = 'world_languages';
      else if (rawSubject.includes('health') || rawSubject.includes('pe')) resolvedSubjectValue = 'health_pe';
      else if (rawSubject.includes('computer')) resolvedSubjectValue = 'computer_science';
      else if (rawSubject.includes('art') || rawSubject.includes('music')) resolvedSubjectValue = 'fine_arts';

      const subjectId = subjectMap.get(resolvedSubjectValue) || subjectMap.get('electives')!;

      // Map grade level
      const minGrade = Math.max(7, Math.min(12, courseInfo.recommended_grade_min || 9));
      const gradeLevelId = gradeLevelMap.get(minGrade)!;

      // Check if course already exists by title
      let course = await courseRepo.findOne({
        where: {title: courseInfo.name, isDeleted: false},
      });

      if (!course) {
        const outcomesText = (courseJson.course_learning_outcomes || []).join('\n• ');
        course = await courseRepo.create({
          title: courseInfo.name,
          subtitle: `${courseInfo.module_count || 4} Modules • ${courseInfo.duration_weeks || 36} Weeks • ${courseInfo.credit_value || 1} Credit`,
          description: outcomesText ? `Learning Outcomes:\n• ${outcomesText}` : `${courseInfo.name} comprehensive curriculum.`,
          subjectId,
          gradeLevelId,
          duration: `${courseInfo.duration_weeks || 36} weeks`,
          credits: Number(courseInfo.credit_value) || 1.0,
          status: 'published',
          isActive: true,
          isDeleted: false,
        });
        totalCoursesCreated++;
      }

      // Ingest Modules & Lessons
      const modules = courseJson.modules || [];
      let courseModulesCount = 0;
      let courseLessonsCount = 0;

      for (const m of modules) {
        const moduleNumber = m.module_number;
        const moduleTitle = `Module ${moduleNumber}: ${m.title}`;

        let mod = await moduleRepo.findOne({
          where: {
            courseId: course.id,
            orderIndex: moduleNumber,
            isDeleted: false,
          },
        });

        if (!mod) {
          mod = await moduleRepo.create({
            courseId: course.id,
            title: moduleTitle,
            description: `Module ${moduleNumber} of ${courseInfo.name}`,
            weekRange: `Weeks ${(moduleNumber - 1) * 9 + 1}–${moduleNumber * 9}`,
            orderIndex: moduleNumber,
            isActive: true,
            isDeleted: false,
          });
          totalModulesCreated++;
          courseModulesCount++;
        }

        const weeks = m.weeks || [];
        for (const w of weeks) {
          const weekNumber = w.week_number;
          const lessonTitle = w.title || `Week ${weekNumber}: ${w.focus || 'Core Lesson'}`;

          const existingLesson = await lessonRepo.findOne({
            where: {
              moduleId: mod.id,
              orderIndex: weekNumber,
              isDeleted: false,
            },
          });

          const lessonPayload = {
            focus: w.focus,
            overview: w.instructor_overview,
            learningObjectives: w.learning_objectives,
            warmUp: w.warm_up,
            lessonContent: w.lesson_content,
            vocabulary: w.vocabulary,
            practice: w.practice,
            assignment: w.assignment,
            quizInfo: w.weekly_quiz,
          };

          if (!existingLesson) {
            await lessonRepo.create({
              courseId: course.id,
              moduleId: mod.id,
              title: lessonTitle,
              type: 'reading',
              orderIndex: weekNumber,
              duration: '45 mins',
              xpReward: 50,
              content: lessonPayload,
              externalUrl: undefined,
              isActive: true,
              isDeleted: false,
            });
            totalLessonsCreated++;
            courseLessonsCount++;
          } else {
            // Update existing lesson to migrate content to jsonb and clean externalUrl
            await lessonRepo.updateById(existingLesson.id, {
              content: lessonPayload,
              externalUrl: undefined,
            });
          }
        }
      }

      console.log(
        `  ✓ [Grade ${minGrade}] Course: "${courseInfo.name}" (${courseModulesCount} new modules, ${courseLessonsCount} new lessons)`,
      );
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n======================================================');
  console.log('🎉 INGESTION COMPLETE!');
  console.log(`⏱️ Duration: ${durationSec}s`);
  console.log(`📊 Test Prep Papers Created:     ${totalTestPrepPapersCreated}`);
  console.log(`📊 Test Prep Questions Created:  ${totalTestPrepQuestionsCreated}`);
  console.log(`📊 Accredited Courses Created:   ${totalCoursesCreated}`);
  console.log(`📊 Course Modules Created:       ${totalModulesCreated}`);
  console.log(`📊 Weekly Lessons Created:       ${totalLessonsCreated}`);
  console.log('======================================================\n');

  process.exit(0);
}

if (require.main === module) {
  runIngestion().catch(err => {
    console.error('❌ Ingestion failed:', err);
    process.exit(1);
  });
}
