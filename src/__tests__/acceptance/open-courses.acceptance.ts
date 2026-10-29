import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {RolesRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('Open Courses (non-breaking additive track)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let openLearnerToken: string;
  let subjectId: string;
  let gradeLevelId: string;
  let openCourseId: string;
  let curriculumCourseId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRepo = await app.getRepository(RolesRepository);
    const existingOpenRole = await rolesRepo.findOne({where: {value: 'open_learner'}});
    if (!existingOpenRole) {
      await rolesRepo.create({
        value: 'open_learner',
        label: 'Open Learner',
        description: 'Workforce and certification open-course learner (no grade)',
        isActive: true,
        isDeleted: false,
      });
    }

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;
    expect(adminRoleId).to.be.ok();

    const openRole = rolesRes.body.roles.find((r: any) => r.key === 'open_learner');
    expect(openRole).to.be.ok();

    const adminEmail = `admin_open_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Open Courses Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;

    const subjectRes = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Welding Open ${Date.now()}`,
        value: `welding_open_${Date.now()}`,
        description: 'Open course subject',
      })
      .expect(200);
    subjectId = subjectRes.body.data.id;

    const gradeRes = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: 'Grade 10 Open Test',
        value: `grade_10_open_${Date.now()}`,
        category: 'senior',
      })
      .expect(200);
    gradeLevelId = gradeRes.body.data.id;

    const openSignup = await client
      .post('/auth/open/signup')
      .send({
        email: `open_learner_${Date.now()}@example.com`,
        password: 'OpenLearner123!',
        fullName: 'Open Learner',
      })
      .expect(200);
    openLearnerToken = openSignup.body.token;
    expect(openSignup.body.user.roles).to.containEql('open_learner');
  });

  after(async () => {
    await app.stop();
  });

  it('POST /courses creates curriculum course when courseType omitted (backward compatible)', async () => {
    const res = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Curriculum Course ${Date.now()}`,
        subjectId,
        gradeLevelId,
        status: 'published',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.courseType || 'curriculum').to.equal('curriculum');
    expect(res.body.data.gradeLevelId).to.equal(gradeLevelId);
    curriculumCourseId = res.body.data.id;
  });

  it('POST /courses creates open course without gradeLevelId', async () => {
    const res = await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Open Welding ${Date.now()}`,
        subjectId,
        courseType: 'open',
        durationWeeks: 24,
        tagline: 'Learn. Weld. Certify.',
        certifications: ['AWS CW'],
        status: 'published',
      })
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.courseType).to.equal('open');
    expect(res.body.data.gradeLevelId == null).to.be.true();
    openCourseId = res.body.data.id;
  });

  it('POST /courses rejects open course that includes gradeLevelId', async () => {
    await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Bad Open ${Date.now()}`,
        subjectId,
        courseType: 'open',
        gradeLevelId,
      })
      .expect(400);
  });

  it('POST /courses still requires gradeLevelId for curriculum courses', async () => {
    await client
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Missing Grade ${Date.now()}`,
        subjectId,
      })
      .expect(400);
  });

  it('GET /courses defaults to curriculum only (open courses hidden)', async () => {
    const res = await client.get('/courses?status=published').expect(200);
    const courses = res.body.data.courses || [];
    const openInDefault = courses.filter((c: any) => c.courseType === 'open');
    expect(openInDefault.length).to.equal(0);
    const hasCurriculum = courses.some((c: any) => c.id === curriculumCourseId);
    expect(hasCurriculum).to.be.true();
  });

  it('GET /courses?courseType=open returns open courses only', async () => {
    const res = await client.get('/courses?courseType=open&status=published').expect(200);
    const courses = res.body.data.courses || [];
    expect(courses.length).to.be.greaterThan(0);
    for (const c of courses) {
      expect(c.courseType).to.equal('open');
    }
    expect(courses.some((c: any) => c.id === openCourseId)).to.be.true();
  });

  it('open learner can enroll in an open course', async () => {
    const res = await client
      .post(`/courses/${openCourseId}/enroll`)
      .set('Authorization', `Bearer ${openLearnerToken}`)
      .expect(200);
    expect(res.body.success).to.be.true();
  });

  it('GET /student/me/dashboard works for open learners without grade', async () => {
    const res = await client
      .get('/student/me/dashboard')
      .set('Authorization', `Bearer ${openLearnerToken}`)
      .expect(200);
    expect(res.body.success).to.be.true();
    expect(res.body.data.profile.tier).to.equal('open');
    expect(res.body.data.profile.gradeLevel).to.be.null();
  });
});
