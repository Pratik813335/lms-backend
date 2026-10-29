import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.join(__dirname, '../../.env')});

import {LmsBackendApplication} from '../application';
import {
  CourseRepository,
  ModuleRepository,
  SubjectsRepository,
} from '../repositories';

interface OpenCourseSeed {
  code: string;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  subjectValue: string;
  durationWeeks: number;
  moduleCount: number;
  emoji: string;
  certifications: string[];
  moduleTitles?: string[];
}

/**
 * Workforce / certification open courses derived from docs/open_courses.
 * Idempotent: skips courses that already exist with the same title + courseType=open.
 */
const OPEN_COURSES: OpenCourseSeed[] = [
  {
    code: 'cybersecurity_foundations',
    title: 'Cybersecurity Foundations & Certification Preparation',
    subtitle: '24-Week Online Cybersecurity Bootcamp',
    tagline: 'Prepare. Protect. Pass. Succeed.',
    description:
      'A comprehensive 24-week online training program for entry-level cybersecurity careers and nationally recognized certification exams such as CompTIA Security+, Network+, ISC2 CC, Cisco CCST Cybersecurity, and Microsoft Security Fundamentals.',
    subjectValue: 'cybersecurity',
    durationWeeks: 24,
    moduleCount: 12,
    emoji: '🔐',
    certifications: [
      'CompTIA Security+',
      'CompTIA Network+',
      'ISC2 Certified in Cybersecurity (CC)',
      'Cisco CCST Cybersecurity',
      'Microsoft Security Fundamentals',
    ],
  },
  {
    code: 'welding_technology',
    title: 'Welding Technology Certification Preparation',
    subtitle: '24-Week Online Welding Technology Program',
    tagline: 'Learn. Weld. Inspect. Certify.',
    description:
      'A 24-week workforce development course preparing learners for welding careers and nationally recognized welding certification examinations (AWS, NCCER, ASME-aligned foundations).',
    subjectValue: 'welding',
    durationWeeks: 24,
    moduleCount: 12,
    emoji: '🔧',
    certifications: [
      'AWS Certified Welder (CW)',
      'AWS CWI Foundations',
      'NCCER Welding Levels 1–4',
    ],
  },
  {
    code: 'hvac_technician',
    title: 'HVAC Technician Licensure & Certification Preparation',
    subtitle: '24-Week HVAC/R Workforce Development Program',
    tagline: 'Install It. Diagnose It. Repair It. Certify.',
    description:
      'A 24-week program covering HVAC/R principles, electrical theory, refrigerants, airflow, troubleshooting, OSHA/EPA safety, and national HVAC certification readiness.',
    subjectValue: 'hvac',
    durationWeeks: 24,
    moduleCount: 12,
    emoji: '❄️',
    certifications: [
      'EPA Section 608',
      'NATE',
      'HVAC Excellence',
      'NCCER HVAC',
    ],
  },
  {
    code: 'plumbing_technology',
    title: 'Plumbing Technology & National Exam Preparation',
    subtitle: '24-Week Skilled Trades & Certification Readiness',
    tagline: 'Learn the Code. Master the Trade. Solve the Problem. Pass the Exam.',
    description:
      'A 24-week CTE program covering plumbing theory, code, trade math, DWV and water-supply systems, fixtures, troubleshooting, labs, and certification-style exams.',
    subjectValue: 'plumbing',
    durationWeeks: 24,
    moduleCount: 12,
    emoji: '🚰',
    certifications: ['NCCER Plumbing', 'State plumbing exam readiness'],
  },
  {
    code: 'dental_assisting',
    title: 'Dental Assisting & National Certification Preparation',
    subtitle: '24-Week Clinical Skills & Exam Preparation',
    tagline: 'Learn the Science. Master the Skills. Serve the Patient. Pass the Exam.',
    description:
      'A 24-week workforce program covering dental assisting theory, infection control, chairside assisting, radiography, office administration, and national certification prep.',
    subjectValue: 'dental_assisting',
    durationWeeks: 24,
    moduleCount: 12,
    emoji: '🦷',
    certifications: ['DANB / national dental assisting exam readiness'],
  },
  {
    code: 'electrical_technology',
    title: 'Electrical Technology Licensure & Certification',
    subtitle: '36-Week Electrical Systems & Workforce Development',
    tagline: 'Understand It. Wire It. Test It. Troubleshoot It. Master the Code.',
    description:
      'A 36-week program from electrical theory and safety through residential, commercial, and introductory industrial systems, NEC navigation, motors, and certification readiness.',
    subjectValue: 'electrical_technology',
    durationWeeks: 36,
    moduleCount: 18,
    emoji: '⚡',
    certifications: ['NCCER Electrical', 'NEC exam readiness'],
  },
  {
    code: 'construction_technology',
    title: 'Construction Technology Licensure & Certification Preparation',
    subtitle: '36-Week Skilled Trades & Building Systems',
    tagline: 'Plan It. Measure It. Build It. Inspect It. Master the Trade.',
    description:
      'A 36-week construction CTE program covering safety, tools, blueprints, structural systems, estimating, project management, and certification preparation.',
    subjectValue: 'construction',
    durationWeeks: 36,
    moduleCount: 18,
    emoji: '🏗️',
    certifications: ['NCCER Core / Construction', 'OSHA foundations'],
  },
  {
    code: 'automotive_manufacturing',
    title: 'Automotive Manufacturing Technology Certification',
    subtitle: '36-Week Advanced Manufacturing & Certification Prep',
    tagline: 'Design It. Build It. Automate It. Inspect It. Improve It.',
    description:
      'A 36-week program focused on how automobiles and components are manufactured — machining, robotics, PLC, lean, quality, Industry 4.0, and EV manufacturing foundations.',
    subjectValue: 'automotive_manufacturing',
    durationWeeks: 36,
    moduleCount: 18,
    emoji: '🚗',
    certifications: ['Manufacturing / MSSC-aligned readiness', 'OSHA'],
  },
  {
    code: 'industrial_automation',
    title: 'Industrial Automation Technology Certification',
    subtitle: '36-Week Mechatronics & Automation',
    tagline: 'Connect It. Program It. Automate It. Troubleshoot It.',
    description:
      'A 36-week industrial automation program covering electricity, motors, sensors, pneumatics/hydraulics, PLCs, HMIs, VFDs, robotics, IIoT, and Industry 4.0.',
    subjectValue: 'industrial_automation',
    durationWeeks: 36,
    moduleCount: 18,
    emoji: '🤖',
    certifications: ['PLC / industrial automation certification readiness'],
  },
  {
    code: 'salon_spa_management',
    title: 'Salon & Spa Management Workforce Development',
    subtitle: '36-Week Licensure Preparation (Cosmetology · Esthetics · Nail Technology)',
    tagline: 'Learn the Profession. Master the Skills. Pass the Exam. Build the Career.',
    description:
      'A 36-week career program with foundational salon/spa business knowledge and specialization pathways in Cosmetology, Esthetics, or Nail Technology, including NIC-aligned exam prep.',
    subjectValue: 'salon_spa',
    durationWeeks: 36,
    moduleCount: 18,
    emoji: '💇',
    certifications: [
      'NIC Cosmetology',
      'NIC Esthetics',
      'NIC Nail Technology',
      'State licensure readiness',
    ],
  },
];

function defaultModuleTitles(count: number, weeksPerModule = 2): string[] {
  const titles: string[] = [];
  for (let i = 1; i <= count; i++) {
    const start = (i - 1) * weeksPerModule + 1;
    const end = i * weeksPerModule;
    titles.push(`Module ${i} (Weeks ${start}–${end})`);
  }
  return titles;
}

export async function seedOpenCourses() {
  const app = new LmsBackendApplication();
  await app.boot();

  const subjectsRepo = await app.getRepository(SubjectsRepository);
  const courseRepo = await app.getRepository(CourseRepository);
  const moduleRepo = await app.getRepository(ModuleRepository);

  let createdCourses = 0;
  let skippedCourses = 0;
  let createdModules = 0;

  for (const seed of OPEN_COURSES) {
    const subject = await subjectsRepo.findOne({
      where: {value: seed.subjectValue, isDeleted: false},
    });
    if (!subject) {
      console.warn(
        `⚠️  Subject '${seed.subjectValue}' missing — run npm run migrate first. Skipping ${seed.title}`,
      );
      continue;
    }

    const existing = await courseRepo.findOne({
      where: {
        title: seed.title,
        courseType: 'open',
        isDeleted: false,
      },
    });

    let courseId = existing?.id;
    if (!existing) {
      const created = await courseRepo.create({
        title: seed.title,
        subtitle: seed.subtitle,
        description: seed.description,
        tagline: seed.tagline,
        subjectId: subject.id!,
        courseType: 'open',
        duration: `${seed.durationWeeks} weeks`,
        durationWeeks: seed.durationWeeks,
        certifications: seed.certifications,
        emoji: seed.emoji,
        credits: 0,
        ncaaApproved: false,
        status: 'published',
        isActive: true,
        isDeleted: false,
      });
      courseId = created.id;
      createdCourses += 1;
      console.log(`✅ Created open course: ${seed.title}`);
    } else {
      skippedCourses += 1;
      console.log(`↷  Open course already exists: ${seed.title}`);
    }

    if (!courseId) continue;

    const moduleTitles =
      seed.moduleTitles && seed.moduleTitles.length > 0
        ? seed.moduleTitles
        : defaultModuleTitles(seed.moduleCount);

    for (let i = 0; i < moduleTitles.length; i++) {
      const title = moduleTitles[i];
      const existingModule = await moduleRepo.findOne({
        where: {courseId, title, isDeleted: false},
      });
      if (existingModule) continue;

      const weeksPerModule = Math.max(
        1,
        Math.round(seed.durationWeeks / seed.moduleCount),
      );
      const start = i * weeksPerModule + 1;
      const end = Math.min(seed.durationWeeks, (i + 1) * weeksPerModule);

      await moduleRepo.create({
        courseId,
        title,
        description: `${seed.title} — ${title}`,
        weekRange: `Weeks ${start}–${end}`,
        orderIndex: i + 1,
        isActive: true,
        isDeleted: false,
      });
      createdModules += 1;
    }
  }

  console.log(
    `✅ Open-course seed complete. coursesCreated=${createdCourses}, skipped=${skippedCourses}, modulesCreated=${createdModules}`,
  );
  await app.stop();
}

if (require.main === module) {
  seedOpenCourses().catch(err => {
    console.error('Cannot seed open courses', err);
    process.exit(1);
  });
}
