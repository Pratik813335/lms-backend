import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Week 2 Course Catalog, Syllabus & Enrollment Engine (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let studentToken: string;
  let subjectId: string;
  let gradeLevelId: string;
  let createdCourseId: string;
  let createdModuleId: string;
  let createdLessonId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;
    const seniorRoleId = rolesRes.body.roles.find((r: any) => r.key === 'student_senior')?.id;

    // Register admin user
    const adminEmail = `admin_week2_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Week 2 Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    // Pre-insert valid subject master using admin authorization
    const subjectValue = `Subject_W2_${Date.now()}`;
    const subjectRes = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Mathematics (${subjectValue})`,
        value: subjectValue,
        description: 'Math Subject Master',
      })
      .expect(200);
    subjectId = subjectRes.body.data.id;

    // Pre-insert valid grade level master
    const gradeLevelRes = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: 'Grade 10 (Sophomore)',
        value: `Grade_10_${Date.now()}`,
        category: 'senior',
      })
      .expect(200);
    gradeLevelId = gradeLevelRes.body.data.id;

    // Register student user with gradeLevelId
    const studentEmail = `student_week2_${Date.now()}@example.com`;
    const studentRes = await client
      .post('/auth/signup')
      .send({
        email: studentEmail,
        password: 'StudentPassword123!',
        roleId: seniorRoleId,
        fullName: 'Week 2 Student',
        gradeLevelId: gradeLevelId,
      })
      .expect(200);
    studentToken = studentRes.body.token;
  });

  after(async () => {
    await app.stop();
  });

  it('POST /courses creates new course with valid subject & gradeLevel foreign keys', async () => {
    const courseTitle = `Algebra 101 (${Date.now()})`;
    const res = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: courseTitle,
        subtitle: 'Foundations of Equations',
        description: 'Comprehensive algebra course for high school students',
        subjectId: subjectId,
        gradeLevelId: gradeLevelId,
        tier: 'senior',
        duration: '18 weeks',
        credits: 1.0,
        ncaaApproved: true,
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('id');
    expect(res.body.data.subjectId).to.equal(subjectId);
    expect(res.body.data.gradeLevelId).to.equal(gradeLevelId);
    createdCourseId = res.body.data.id;
  });

  it('POST /courses rejects invalid foreign key with 400 Bad Request', async () => {
    await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Quantum Physics',
        subjectId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        gradeLevelId: gradeLevelId,
        tier: 'senior',
      })
      .expect(400);
  });

  it('GET /courses retrieves paginated & filtered course catalog by subjectId & tier', async () => {
    const res = await client
      .get(`/courses?subjectId=${subjectId}&tier=senior`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.courses).to.be.an.Array();
    expect(res.body.data.courses.some((c: any) => c.id === createdCourseId)).to.be.true();
  });

  it('PATCH /courses/{id} updates course details', async () => {
    const res = await client
      .patch(`/courses/${createdCourseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subtitle: 'Updated Algebra Subtitle',
      })
      .expect(200);

    expect(res.body.data.subtitle).to.equal('Updated Algebra Subtitle');
  });

  it('POST /courses/{id}/modules creates a curriculum module', async () => {
    const res = await client
      .post(`/courses/${createdCourseId}/modules`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Module 1: Equations & Inequalities',
        description: 'Linear equations and order of operations',
        weekRange: 'Weeks 1–4',
        orderIndex: 1,
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    createdModuleId = res.body.data.id;
  });

  it('POST /modules/{id}/lessons creates a lesson within a module', async () => {
    const res = await client
      .post(`/modules/${createdModuleId}/lessons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Order of Operations (PEMDAS)',
        type: 'video',
        duration: '2 min',
        videoId: 'jfKfPfyJRdk',
        orderIndex: 1,
        xpReward: 50,
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    createdLessonId = res.body.data.id;
  });

  it('GET /courses/{id}/syllabus fetches complete ordered curriculum tree', async () => {
    const res = await client
      .get(`/courses/${createdCourseId}/syllabus`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.modules.length).to.be.greaterThan(0);
    expect(res.body.data.modules[0].lessons.length).to.be.greaterThan(0);
  });

  it('POST /courses/{id}/enroll enrolls authenticated student into course', async () => {
    const res = await client
      .post(`/courses/${createdCourseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.message).to.containEql('enrolled');
  });

  it('POST /lessons/{id}/complete completes lesson, updates progress rate & awards XP', async () => {
    const res = await client
      .post(`/lessons/${createdLessonId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.xpAwarded).to.equal(50);
    expect(res.body.data.progressRate).to.equal(100);
  });

  it('GET /student/me/learning-map retrieves junior interactive node path graph', async () => {
    const res = await client
      .get('/student/me/learning-map')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.learningMap).to.have.property('nodes');
  });
});
