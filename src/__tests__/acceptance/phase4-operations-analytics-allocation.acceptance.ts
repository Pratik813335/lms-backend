import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Phase 4: Operations, Billing, Analytics & Course Allocation (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let opsToken: string;
  let studentToken: string;
  let studentId: string;
  let staffId: string;
  let courseId: string;
  let moduleId: string;
  let instructorId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;
    const opsRoleId = rolesRes.body.roles.find((r: any) => r.key === 'operations')?.id;
    const contentRoleId = rolesRes.body.roles.find((r: any) => r.key === 'content')?.id;
    const seniorRoleId = rolesRes.body.roles.find((r: any) => r.key === 'student_senior')?.id;

    // 1. Create Admin
    const adminEmail = `admin_p4_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Phase4 Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    // 2. Create Operations Staff
    const opsEmail = `ops_${Date.now()}@example.com`;
    const opsRes = await client
      .post('/auth/signup')
      .send({
        email: opsEmail,
        password: 'OpsPassword123!',
        roleId: opsRoleId,
        fullName: 'Operations Manager',
      })
      .expect(200);
    opsToken = opsRes.body.token;

    // 3. Create Content / Instructor Staff
    const instEmail = `instructor_${Date.now()}@example.com`;
    const instRes = await client
      .post('/auth/signup')
      .send({
        email: instEmail,
        password: 'InstPassword123!',
        roleId: contentRoleId,
        fullName: 'Prof. Allocation Instructor',
      })
      .expect(200);
    instructorId = instRes.body.user.id;
    staffId = instructorId;

    // 4. Create Senior Student
    const gradeLevelsRes = await client.get('/masters/grade-levels').expect(200);
    const grade11 = gradeLevelsRes.body.data.find((g: any) => g.value === 'grade_11') || gradeLevelsRes.body.data[0];

    const studentEmail = `student_p4_${Date.now()}@example.com`;
    const studentRes = await client
      .post('/auth/student/signup')
      .send({
        email: studentEmail,
        password: 'StudentPassword123!',
        fullName: 'Phase4 Senior Student',
        gradeLevelId: grade11.id,
      })
      .expect(200);
    studentToken = studentRes.body.token;
    studentId = studentRes.body.user.id;

    // 5. Create Test Course & Module
    const subjectsRes = await client.get('/masters/subjects').expect(200);
    const subjectId = subjectsRes.body.data[0].id;

    const courseRes = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `AP Calculus BC ${Date.now()}`,
        subtitle: 'Advanced Differential Calculus',
        description: 'Rigorous high school calculus',
        subjectId,
        gradeLevelId: grade11.id,
        duration: '36 Weeks',
        credits: 1.0,
      })
      .expect(200);
    courseId = courseRes.body.data.id;

    const modRes = await client
      .post(`/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Unit 1: Limits & Continuity',
        weekRange: 'Weeks 1-4',
        orderIndex: 1,
      })
      .expect(200);
    moduleId = modRes.body.data.id;
  });

  after('tearDown', async () => {
    await app.stop();
  });

  // ── 1. Operations & Payments Endpoints ────────────────────────────────────
  it('POST /operations/payments/record-offline records manual tuition payment', async () => {
    const res = await client
      .post('/operations/payments/record-offline')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        usersId: studentId,
        amount: 89.0,
        planName: 'Premium Monthly',
        paymentMethod: 'offline_wire',
        transactionReference: 'WIRE-998877',
        notes: 'Annual wire transfer payment verified by bank',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.amount).to.equal(89.0);
    expect(res.body.data.status).to.equal('succeeded');
    expect(res.body.data.usersId).to.equal(studentId);
  });

  it('GET /operations/payments/summary returns Stripe-style revenue KPIs', async () => {
    const res = await client
      .get('/operations/payments/summary')
      .set('Authorization', `Bearer ${opsToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('grossVolume');
    expect(res.body.data).to.have.property('mrr');
    expect(res.body.data).to.have.property('activeSubscribers');
    expect(res.body.data).to.have.property('planBreakdown');
  });

  it('GET /operations/payments retrieves paginated transactions list', async () => {
    const res = await client
      .get('/operations/payments?page=1&limit=10')
      .set('Authorization', `Bearer ${opsToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('items');
    expect(res.body.data.items).to.be.an.Array();
    expect(res.body.data.items.length).to.be.greaterThanOrEqual(1);
    expect(res.body.data.items[0]).to.have.property('customerName');
  });

  // ── 2. Platform Analytics & Reports ──────────────────────────────────────
  it('GET /admin/analytics/overview returns real-time platform KPIs', async () => {
    const res = await client
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('totalActiveStudents');
    expect(res.body.data).to.have.property('courseCompletionRate');
    expect(res.body.data).to.have.property('averageGpa');
    expect(res.body.data).to.have.property('ncaaComplianceRate');
  });

  it('GET /admin/reports/grade-distribution returns letter grade chart data', async () => {
    const res = await client
      .get('/admin/reports/grade-distribution')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('distribution');
    expect(res.body.data.distribution).to.be.an.Array();
    expect(res.body.data.distribution.length).to.equal(5);
  });

  // ── 3. Staff & Student Management ────────────────────────────────────────
  it('PATCH /admin/users/{id} updates staff profile & role', async () => {
    const res = await client
      .patch(`/admin/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Updated Instructor Name',
        phone: '+1-555-4321',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.fullName).to.equal('Updated Instructor Name');
  });

  it('PATCH /admin/students/{id} updates student GPA & grade level', async () => {
    const res = await client
      .patch(`/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        gpa: 3.95,
        fullName: 'Honors Student Name',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.user.fullName).to.equal('Honors Student Name');
    expect(res.body.data.profile.gpa).to.equal(3.95);
  });

  // ── 4. Course Allocation, Roster & Unenrollment ───────────────────────────
  it('POST /courses/{id}/instructors/assign assigns instructor to course', async () => {
    const res = await client
      .post(`/courses/${courseId}/instructors/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        instructorId,
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.instructorId).to.equal(instructorId);
  });

  it('POST /courses/{id}/students/batch-enroll bulk-enrolls student cohort', async () => {
    const res = await client
      .post(`/courses/${courseId}/students/batch-enroll`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentUserIds: [studentId],
        learningMode: 'credit',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.successfullyEnrolled).to.be.greaterThanOrEqual(1);
  });

  it('GET /courses/{id}/roster returns live student progress roster', async () => {
    const res = await client
      .get(`/courses/${courseId}/roster`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('roster');
    expect(res.body.data.roster).to.be.an.Array();
    expect(res.body.data.totalStudentsEnrolled).to.be.greaterThanOrEqual(1);
    expect(res.body.data.roster[0].studentId).to.equal(studentId);
  });

  it('DELETE /courses/{id}/enroll allows staff to unenroll student', async () => {
    const res = await client
      .del(`/courses/${courseId}/enroll?userId=${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
  });

  it('DELETE /student/me/courses/{id}/enroll allows student to self-drop course', async () => {
    // Re-enroll first
    await client
      .post(`/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    // Self-drop
    const res = await client
      .del(`/student/me/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
  });

  // ── 5. Deletions (Course, Module, Staff, Student) ─────────────────────────
  it('DELETE /modules/{id} soft-deletes unit module', async () => {
    const res = await client
      .del(`/modules/${moduleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
  });

  it('DELETE /courses/{id} soft-deletes course', async () => {
    const res = await client
      .del(`/courses/${courseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
  });

  it('DELETE /admin/users/{id} soft-deletes staff member', async () => {
    const res = await client
      .del(`/admin/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
  });

  it('DELETE /admin/students/{id} soft-deletes student', async () => {
    const res = await client
      .del(`/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
  });
});
