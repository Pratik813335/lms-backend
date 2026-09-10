import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Phase 3: Certificates, Writing Lab, AI Tutor & Compliance (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let studentToken: string;
  let subjectId: string;
  let gradeLevelId: string;
  let courseId: string;
  let promptId: string;
  let certVerificationHash: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;

    // Register admin
    const adminEmail = `admin_cert_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Cert Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    // Create Subject & Grade Level
    const subjectRes = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `English Literature (${Date.now()})`,
        value: `eng_lit_${Date.now()}`,
      })
      .expect(200);
    subjectId = subjectRes.body.data.id;

    const gradeLevelRes = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Grade 11 (${Date.now()})`,
        value: `grade_11_${Date.now()}`,
        category: 'senior',
      })
      .expect(200);
    gradeLevelId = gradeLevelRes.body.data.id;

    // Register Student
    const studentEmail = `student_cert_${Date.now()}@example.com`;
    const studentRes = await client
      .post('/auth/student/signup')
      .send({
        email: studentEmail,
        password: 'StudentPassword123!',
        fullName: 'Jordan Williams',
        gradeLevelId,
      })
      .expect(200);
    studentToken = studentRes.body.token;

    // Create Course
    const courseRes = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Ninth Grade Literature & Composition',
        subjectId,
        gradeLevelId,
        tier: 'senior',
        credits: 1.0,
      })
      .expect(200);
    courseId = courseRes.body.data.id;

    // Create Module & Lesson
    const moduleRes = await client
      .post(`/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({title: 'Module 1: The Art of Rhetoric'})
      .expect(200);
    const moduleId = moduleRes.body.data.id;

    // Upload media for lesson
    const uploadRes = await client
      .post('/files')
      .attach('file', Buffer.from('Mock Lesson Video Buffer'), 'lesson_video.mp4')
      .expect(200);
    const mediaId = uploadRes.body.data.files[0].id;

    const lessonRes = await client
      .post(`/modules/${moduleId}/lessons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Ethos, Pathos, and Logos',
        type: 'video',
        mediaId,
        duration: '5 min',
        xpReward: 50,
      })
      .expect(200);
    const lessonId = lessonRes.body.data.id;

    // Enroll student
    await client
      .post(`/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    // Complete lesson so course progress reaches 100%
    await client
      .post(`/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    // Create Writing Prompt
    const {WritingPromptRepository} = await import('../../repositories');
    const promptRepo = await app.getRepository(WritingPromptRepository);
    const createdPrompt = await promptRepo.create({
      subjectId,
      title: 'The Power of Perspective',
      subjectCategory: 'English — Argumentative',
      gradeLevel: '9-12',
      prompt: 'Write an argumentative essay exploring how perspective shapes our understanding of truth.',
      targetLength: '800-1000 words',
      format: 'ACT / Common Core Argumentative',
    });
    promptId = createdPrompt.id!;
  });

  after(async () => {
    await app.stop();
  });

  it('POST /courses/{id}/certificate issues certificate for 100% completed course', async () => {
    const res = await client
      .post(`/courses/${courseId}/certificate`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.certificateNumber).to.be.String();
    expect(res.body.data.studentName).to.equal('Jordan Williams');
    expect(res.body.data.courseName).to.equal('Ninth Grade Literature & Composition');
    expect(res.body.data.credits).to.equal(1.0);
    expect(res.body.data.verificationHash).to.be.String();

    certVerificationHash = res.body.data.verificationHash;
  });

  it('GET /student/me/certificates lists issued certificates', async () => {
    const res = await client
      .get('/student/me/certificates')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);
    expect(res.body.data[0].certificateNumber).to.be.String();
  });

  it('GET /certificates/verify/{hash} verifies certificate authenticity publicly', async () => {
    const res = await client
      .get(`/certificates/verify/${certVerificationHash}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.isValid).to.be.true();
    expect(res.body.data.studentName).to.equal('Jordan Williams');
  });

  it('GET /writing-lab/prompts retrieves active essay prompts', async () => {
    const res = await client
      .get('/writing-lab/prompts')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);
  });

  it('POST /writing-lab/submit scores essay against rubric and returns AI feedback', async () => {
    const sampleEssay =
      'Perspective fundamentally shapes our understanding of truth because individuals interpret reality ' +
      'through their unique personal backgrounds and cultural frameworks. For example, in historical accounts of major conflicts, ' +
      'narratives from different vantage points offer contrasting interpretations of identical events.\n\n' +
      'Furthermore, literature frequently demonstrates how unreliable narrators reveal subjective truths rather than objective facts. ' +
      'Therefore, discerning genuine truth requires synthesizing multiple viewpoints and critically evaluating evidence from diverse sources.';

    const res = await client
      .post('/writing-lab/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        promptId,
        essayText: sampleEssay,
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.overallScore).to.be.Number();
    expect(res.body.data.wordCount).to.be.greaterThan(50);
    expect(res.body.data.dimensionScores).to.be.Object();
    expect(res.body.data.dimensionScores.ideasAndAnalysis).to.be.Number();
    expect(res.body.data.aiFeedback.headline).to.be.String();
    expect(res.body.data.aiFeedback.grammarFeedback).to.be.Array();
  });

  it('GET /student/me/writing-submissions lists student essay submissions', async () => {
    const res = await client
      .get('/student/me/writing-submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);
  });

  it('POST /academic/compliance-audits records course NCAA and syllabus compliance', async () => {
    const res = await client
      .post('/academic/compliance-audits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId,
        ncaaApproved: true,
        syllabusApproved: true,
        academicIntegrityScore: 98.5,
        status: 'approved',
        notes: 'Curriculum meets NCAA Division I core course academic rigor requirements.',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.ncaaApproved).to.be.true();
  });

  it('GET /academic/compliance-audits lists compliance audits', async () => {
    const res = await client
      .get('/academic/compliance-audits')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);
  });
});
