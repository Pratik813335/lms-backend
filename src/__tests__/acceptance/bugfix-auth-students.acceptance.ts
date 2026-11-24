import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

/**
 * Acceptance coverage for backend bug fixes from LMS_Bugs - Index.csv
 */
describe('Bug fixes: auth, staff delete, grade/role sync, name validation', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let adminRoleId: string;
  let academicRoleId: string;
  let juniorGradeId: string;
  let seniorGradeId: string;
  let subjectId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;
    academicRoleId = rolesRes.body.roles.find((r: any) => r.key === 'academic')?.id;
    expect(adminRoleId).to.be.ok();

    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: `admin_bugs_${Date.now()}@example.com`,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Bugfix Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    const juniorGrade = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: 'Grade 3',
        value: `grade_3_bug_${Date.now()}`,
        category: 'junior',
      })
      .expect(200);
    juniorGradeId = juniorGrade.body.data.id;

    const seniorGrade = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: 'Grade 10',
        value: `grade_10_bug_${Date.now()}`,
        category: 'senior',
      })
      .expect(200);
    seniorGradeId = seniorGrade.body.data.id;

    const subject = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Math Bug ${Date.now()}`,
        value: `math_bug_${Date.now()}`,
      })
      .expect(200);
    subjectId = subject.body.data.id;
  });

  after(async () => {
    await app.stop();
  });

  it('BUG-001: rejects student fullName with numbers/special characters', async () => {
    await client
      .post('/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Student123!!!',
        email: `badname_${Date.now()}@example.com`,
        gradeLevelId: seniorGradeId,
      })
      .expect(400);
  });

  it('BUG-026: Grade 3 (junior category) self-signup maps to student_junior', async () => {
    const email = `g3_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/student/signup')
      .send({
        email,
        password: 'StudentPassword123!',
        fullName: 'Grade Three Kid',
        gradeLevelId: juniorGradeId,
      })
      .expect(200);

    expect(res.body.user.roles).to.containEql('student_junior');
    expect(res.body.user.roles).to.not.containEql('student_senior');
  });

  it('BUG-003: admin grade change from senior to junior syncs role', async () => {
    const email = `switch_${Date.now()}@example.com`;
    const created = await client
      .post('/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Switch Student',
        email,
        gradeLevelId: seniorGradeId,
        password: 'Student@123',
      })
      .expect(200);

    const studentId = created.body.data.id;

    const updated = await client
      .patch(`/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({gradeLevelId: juniorGradeId})
      .expect(200);

    expect(updated.body.data.tier).to.equal('junior');
    expect(updated.body.data.gradeLevelId).to.equal(juniorGradeId);

    const login = await client
      .post('/auth/login')
      .send({email, password: 'Student@123'})
      .expect(200);

    expect(login.body.user.roles).to.containEql('student_junior');
  });

  it('BUG-004: self profile grade tier switch updates role', async () => {
    const email = `selfswitch_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/student/signup')
      .send({
        email,
        password: 'StudentPassword123!',
        fullName: 'Self Switcher',
        gradeLevelId: seniorGradeId,
      })
      .expect(200);

    await client
      .patch('/student/me/profile')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .send({gradeLevelId: juniorGradeId})
      .expect(200);

    const login = await client
      .post('/auth/login')
      .send({email, password: 'StudentPassword123!'})
      .expect(200);

    expect(login.body.user.roles).to.containEql('student_junior');
  });

  it('BUG-006 / BUG-019: students directory returns real gradeLevelId (not invented Class 10)', async () => {
    const email = `dir_${Date.now()}@example.com`;
    const created = await client
      .post('/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Directory Student',
        email,
        gradeLevelId: juniorGradeId,
        password: 'Student@123',
      })
      .expect(200);

    const list = await client
      .get('/students?search=Directory')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const row = list.body.data.students.find((s: any) => s.id === created.body.data.id);
    expect(row).to.be.ok();
    expect(row.gradeLevelId).to.equal(juniorGradeId);
    expect(row.gradeLevel).to.equal('Grade 3');
    expect(row.tier).to.equal('junior');
  });

  it('BUG-007: self-registered student is auto-enrolled into published grade courses', async () => {
    await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Auto Enroll Course ${Date.now()}`,
        subjectId,
        gradeLevelId: juniorGradeId,
        status: 'published',
      })
      .expect(200);

    const email = `autoenroll_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/student/signup')
      .send({
        email,
        password: 'StudentPassword123!',
        fullName: 'Auto Enroll Student',
        gradeLevelId: juniorGradeId,
      })
      .expect(200);

    const dash = await client
      .get('/student/me/dashboard')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .expect(200);

    expect(dash.body.data.stats.enrolledCoursesCount).to.be.greaterThan(0);
  });

  it('BUG-012: weak staff password Staff123 is rejected at signup', async () => {
    await client
      .post('/auth/signup')
      .send({
        email: `weakstaff_${Date.now()}@example.com`,
        password: 'Staff123',
        roleId: academicRoleId,
        fullName: 'Weak Staff',
      })
      .expect(400);
  });

  it('BUG-014 / BUG-015: deleted staff cannot login or use JWT', async () => {
    const email = `delstaff_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/signup')
      .send({
        email,
        password: 'StaffPassword123!',
        roleId: academicRoleId,
        fullName: 'Delete Me Staff',
      })
      .expect(200);

    const staffToken = signup.body.token;

    // Resolve id from /auth/me
    const me = await client
      .get('/auth/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    // /auth/me returns the standard { success, data } envelope
    const id = (me.body.data ?? me.body).id;

    await client
      .del(`/admin/users/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Soft-deleted: login blocked
    await client
      .post('/auth/login')
      .send({email, password: 'StaffPassword123!'})
      .expect(401);

    // Existing JWT rejected on authenticated routes
    await client
      .get('/auth/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(401);
  });

  it('BUG-009: admin can reset staff password', async () => {
    const email = `resetstaff_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/signup')
      .send({
        email,
        password: 'StaffPassword123!',
        roleId: academicRoleId,
        fullName: 'Reset Staff',
      })
      .expect(200);

    const me = await client
      .get('/auth/me')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .expect(200);

    await client
      .post(`/admin/users/${(me.body.data ?? me.body).id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({newPassword: 'NewStaffPassword123!'})
      .expect(200);

    await client
      .post('/auth/login')
      .send({email, password: 'NewStaffPassword123!'})
      .expect(200);
  });

  it('BUG-033: student profile returns enrolledCourses after enroll', async () => {
    const courseRes = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Start Course ${Date.now()}`,
        subjectId,
        gradeLevelId: seniorGradeId,
        status: 'published',
      })
      .expect(200);
    const courseId = courseRes.body.data.id;

    const email = `startcourse_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/student/signup')
      .send({
        email,
        password: 'StudentPassword123!',
        fullName: 'Start Course Student',
        gradeLevelId: seniorGradeId,
      })
      .expect(200);

    await client
      .post(`/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${signup.body.token}`)
      .expect(200);

    const profile = await client
      .get('/student/me/profile')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .expect(200);

    expect(profile.body.data.enrolledCourses).to.be.Array();
    expect(profile.body.data.enrolledCourses).to.containEql(courseId);
    expect(profile.body.data.enrolledCoursesCount).to.be.greaterThan(0);
    expect(profile.body.data.enrollments).to.be.Array();
    expect(profile.body.data.enrollments[0].courseId).to.equal(courseId);
    expect(profile.body.data.enrollments[0].progressRate).to.equal(0);
  });

  it('BUG-033: completing all lessons issues certificate and keeps module history', async () => {
    const courseRes = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Cert Course ${Date.now()}`,
        subjectId,
        gradeLevelId: seniorGradeId,
        status: 'published',
      })
      .expect(200);
    const courseId = courseRes.body.data.id;

    const moduleRes = await client
      .post(`/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({title: 'Module 1', orderIndex: 1})
      .expect(200);
    const moduleId = moduleRes.body.data.id;

    const lessonRes = await client
      .post(`/modules/${moduleId}/lessons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({title: 'Lesson 1', type: 'text', xpReward: 50})
      .expect(200);
    const lessonId = lessonRes.body.data.id;

    const email = `certcourse_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/student/signup')
      .send({
        email,
        password: 'StudentPassword123!',
        fullName: 'Cert Course Student',
        gradeLevelId: seniorGradeId,
      })
      .expect(200);
    const token = signup.body.token;

    await client
      .post(`/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const complete = await client
      .post(`/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(complete.body.data.progressRate).to.equal(100);
    expect(complete.body.data.courseCompleted).to.be.true();
    expect(complete.body.data.certificate).to.be.ok();
    expect(complete.body.data.certificate.certificateNumber).to.be.String();

    const history = await client
      .get(`/courses/${courseId}/progress-history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body.data).to.be.Array();
    expect(history.body.data.length).to.be.greaterThan(0);
    expect(history.body.data[0].lessonId).to.equal(lessonId);

    const certs = await client
      .get('/student/me/certificates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(certs.body.data.some((c: {courseId?: string}) => c.courseId === courseId)).to.be.true();
  });

  it('BUG-022: AI tutor reply uses topic/subject tags, not unrelated course title only', async () => {
    const courseRes = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Mandarin Chinese 2 ${Date.now()}`,
        subjectId,
        gradeLevelId: seniorGradeId,
        status: 'published',
      })
      .expect(200);
    const courseId = courseRes.body.data.id;

    const email = `aitutor_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/student/signup')
      .send({
        email,
        password: 'StudentPassword123!',
        fullName: 'Ai Tutor Student',
        gradeLevelId: seniorGradeId,
      })
      .expect(200);

    const chat = await client
      .post('/ai/tutor/chat')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .send({
        courseId,
        topic: 'linear equations',
        subject: 'Mathematics',
        message:
          '[Grade 10] [Subject: Mathematics] [Topic: linear equations] Help me with Solving for x',
      })
      .expect(200);

    const reply = chat.body.data.reply as string;
    expect(reply.toLowerCase()).to.match(/mathematics|linear|slope|solving/);
    expect(chat.body.data.courseContext.subject).to.equal('Mathematics');
    expect(chat.body.data.courseContext.currentTopic).to.equal('linear equations');
  });
});
