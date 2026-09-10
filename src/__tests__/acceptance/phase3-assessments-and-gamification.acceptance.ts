import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Phase 3: Assessments & Gamification Engine (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let studentToken: string;
  let courseId: string;
  let assessmentId: string;
  let question1Id: string;
  let question2Id: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;

    // Register admin user
    const adminEmail = `admin_p3_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Phase 3 Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    // Create Subject & Grade Level Masters
    const subjectRes = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Science (${Date.now()})`,
        value: `science_${Date.now()}`,
      })
      .expect(200);
    const subjectId = subjectRes.body.data.id;

    const gradeLevelRes = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Grade 9 (${Date.now()})`,
        value: `grade_9_${Date.now()}`,
        category: 'senior',
      })
      .expect(200);
    const gradeLevelId = gradeLevelRes.body.data.id;

    // Register Student User
    const studentEmail = `student_p3_${Date.now()}@example.com`;
    const studentRes = await client
      .post('/auth/student/signup')
      .send({
        email: studentEmail,
        password: 'StudentPassword123!',
        fullName: 'Phase 3 Student',
        gradeLevelId,
      })
      .expect(200);
    studentToken = studentRes.body.token;

    // Create Course
    const courseRes = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Biology 101: Cell Structure & Functions',
        subjectId,
        gradeLevelId,
        tier: 'senior',
        credits: 1.0,
      })
      .expect(200);
    courseId = courseRes.body.data.id;

    // Enroll student in course
    await client
      .post(`/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
  });

  after(async () => {
    await app.stop();
  });

  it('POST /courses/{id}/assessments creates quiz with questions', async () => {
    const res = await client
      .post(`/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Cell Organelles Weekly Quiz',
        type: 'quiz',
        description: 'Test your understanding of nucleus, mitochondria, and chloroplasts.',
        passingPercentage: 80.0,
        timeLimitMinutes: 15,
        xpReward: 150,
        questions: [
          {
            type: 'mcq',
            text: 'Which organelle is considered the powerhouse of the cell?',
            options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
            correctAnswer: 'Mitochondria',
            explanation: 'Mitochondria generate most of the chemical energy needed to power the cell (ATP).',
            points: 10,
            orderIndex: 1,
          },
          {
            type: 'true_false',
            text: 'Plant cells have a cell wall, but animal cells do not.',
            options: ['true', 'false'],
            correctAnswer: 'true',
            explanation: 'Plant cells contain rigid cellulose walls for structural support.',
            points: 10,
            orderIndex: 2,
          },
        ],
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.title).to.equal('Cell Organelles Weekly Quiz');
    expect(res.body.data.questions).to.be.Array();
    expect(res.body.data.questions.length).to.equal(2);

    assessmentId = res.body.data.id;
    const mcqQuestion = res.body.data.questions.find((q: any) => q.type === 'mcq');
    const tfQuestion = res.body.data.questions.find((q: any) => q.type === 'true_false');
    question1Id = mcqQuestion.id;
    question2Id = tfQuestion.id;
  });

  it('GET /courses/{id}/assessments lists assessments for course', async () => {
    const res = await client
      .get(`/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);
  });

  it('GET /assessments/{id} returns sanitized quiz without correct answers for test-taking', async () => {
    const res = await client
      .get(`/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.title).to.equal('Cell Organelles Weekly Quiz');
    const q1 = res.body.data.questions.find((q: any) => q.type === 'mcq');
    expect(q1.text).to.equal('Which organelle is considered the powerhouse of the cell?');
    expect(q1.options).to.deepEqual(['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus']);
    expect(q1.correctAnswer).to.be.undefined();
  });

  it('POST /assessments/{id}/submit auto-grades answers, awards XP, and returns AI feedback', async () => {
    const res = await client
      .post(`/assessments/${assessmentId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: {
          [question1Id]: 'Mitochondria',
          [question2Id]: 'true',
        },
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.score).to.equal(100);
    expect(res.body.data.isPassed).to.be.true();
    expect(res.body.data.xpAwarded).to.equal(150);
    expect(res.body.data.aiFeedback.headline).to.be.String();
    expect(res.body.data.aiFeedback.suggestions).to.be.Array();
  });

  it('GET /assessments/{id}/submissions/latest returns review mode with explanations', async () => {
    const res = await client
      .get(`/assessments/${assessmentId}/submissions/latest`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.score).to.equal(100);
    expect(res.body.data.assessment).to.be.Object();
  });

  it('GET /student/me/assessments returns student assessment list categorized as completed', async () => {
    const res = await client
      .get('/student/me/assessments')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.completed).to.be.Array();
    expect(res.body.data.completed.length).to.be.greaterThanOrEqual(1);
    expect(res.body.data.completed[0].score).to.equal(100);
  });

  it('GET /gamification/badges returns platform badge catalog', async () => {
    const res = await client
      .get('/gamification/badges')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);
  });

  it('GET /student/me/badges returns student gamification progress and unlocked/locked badges', async () => {
    const res = await client
      .get('/student/me/badges')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.totalXp).to.be.Number();
    expect(res.body.data.level).to.be.Number();
    expect(res.body.data.unlockedBadges).to.be.Array();
    expect(res.body.data.lockedBadges).to.be.Array();
  });
});
