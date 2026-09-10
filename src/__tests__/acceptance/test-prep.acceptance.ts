import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Student Segmentation & Test Prep Engine (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let juniorToken: string;
  let mathSubjectId: string;
  let grade4Id: string;
  let grade9Id: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;
    const juniorRoleId = rolesRes.body.roles.find((r: any) => r.key === 'student_junior')?.id;

    // Login / signup admin
    const adminEmail = `admin_tp_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Test Prep Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    // Fetch Grade 4 (Junior Test Prep Only) and Grade 9 (Senior Full Curriculum)
    const gradeLevelsRes = await client.get('/masters/grade-levels').expect(200);
    const grade4 = gradeLevelsRes.body.data.find((g: any) => g.value === 'grade_4') || gradeLevelsRes.body.data[0];
    const grade9 = gradeLevelsRes.body.data.find((g: any) => g.value === 'grade_9') || gradeLevelsRes.body.data[gradeLevelsRes.body.data.length - 1];
    grade4Id = grade4.id;
    grade9Id = grade9.id;

    // Register junior student in Grade 4
    const juniorEmail = `student_junior_${Date.now()}@example.com`;
    const juniorRes = await client
      .post('/auth/student/signup')
      .send({
        email: juniorEmail,
        password: 'StudentPassword123!',
        fullName: 'Junior TestPrep Learner',
        gradeLevelId: grade4Id,
      })
      .expect(200);
    juniorToken = juniorRes.body.token;

    // Pre-insert Math subject with isTestPrep: true
    const subjectRes = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Math Prep ${Date.now()}`,
        value: `math_tp_${Date.now()}`,
        isTestPrep: true,
        description: 'Elementary and Middle School Math Practice',
      })
      .expect(200);
    mathSubjectId = subjectRes.body.data.id;
  });

  after('tearDown', async () => {
    await app.stop();
  });

  it('GET /masters/grade-levels returns explicit hasTestPrep and hasFullCurriculum segmentation flags', async () => {
    const res = await client.get('/masters/grade-levels').expect(200);
    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.an.Array();

    const g4 = res.body.data.find((g: any) => g.value === 'grade_4');
    if (g4) {
      expect(g4.hasTestPrep).to.be.true();
      expect(g4.hasFullCurriculum).to.be.false();
    }
  });

  it('GET /masters/subjects?isTestPrep=true filters only test prep subjects (Math, ELA, Science)', async () => {
    const res = await client.get('/masters/subjects?isTestPrep=true').expect(200);
    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.an.Array();
    for (const sub of res.body.data) {
      expect(sub.isTestPrep).to.be.true();
    }
  });

  it('GET /test-prep/subjects returns test prep subjects with practice sets and icons', async () => {
    const res = await client.get('/test-prep/subjects').expect(200);
    expect(res.body.success).to.be.true();
    expect(res.body.data).to.be.an.Array();
    expect(res.body.data.length).to.be.greaterThanOrEqual(1);

    const first = res.body.data[0];
    expect(first).to.have.property('id');
    expect(first).to.have.property('label');
    expect(first).to.have.property('totalPracticeSets');
    expect(first).to.have.property('totalQuestions');
    expect(first.isTestPrep).to.be.true();
  });

  it('GET /test-prep/subjects/{id}/assessments returns practice assessments for subject', async () => {
    const res = await client.get(`/test-prep/subjects/${mathSubjectId}/assessments`).expect(200);
    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('subject');
    expect(res.body.data.subject.id).to.equal(mathSubjectId);
    expect(res.body.data).to.have.property('assessments');
    expect(res.body.data.assessments).to.be.an.Array();
  });

  it('GET /student/me/test-prep returns authenticated student test prep dashboard with accuracy stats', async () => {
    const res = await client
      .get('/student/me/test-prep')
      .set('Authorization', `Bearer ${juniorToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('student');
    expect(res.body.data.student.hasTestPrep).to.be.true();
    expect(res.body.data.student.hasFullCurriculum).to.be.false();
    expect(res.body.data).to.have.property('stats');
    expect(res.body.data.stats).to.have.property('accuracyRate');
    expect(res.body.data.stats).to.have.property('totalPracticesCompleted');
    expect(res.body.data).to.have.property('subjects');
  });

  it('GET /student/me/dashboard returns resolved segmentation flags for Grade 4 learner', async () => {
    const res = await client
      .get('/student/me/dashboard')
      .set('Authorization', `Bearer ${juniorToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.profile.hasTestPrep).to.be.true();
    expect(res.body.data.profile.hasFullCurriculum).to.be.false();
    expect(res.body.data.profile.tier).to.equal('junior');
  });
});
