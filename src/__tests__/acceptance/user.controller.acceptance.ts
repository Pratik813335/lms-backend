import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';
import {GradeLevelsRepository, RolesRepository} from '../../repositories';

describe('User Controller - Staff Directory (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let authToken: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRepo = await app.getRepository(RolesRepository);
    const gradeRepo = await app.getRepository(GradeLevelsRepository);

    const adminRole = await rolesRepo.findOne({where: {value: 'admin'}});
    const contentRole = await rolesRepo.findOne({where: {value: 'content'}});
    const academicRole = await rolesRepo.findOne({where: {value: 'academic'}});

    let gradeLevel = await gradeRepo.findOne({where: {isDeleted: false}});
    if (!gradeLevel) {
      gradeLevel = await gradeRepo.create({
        label: 'Grade 10',
        value: 'grade_10',
        category: 'senior',
        isActive: true,
        isDeleted: false,
      });
    }

    // 1. Create admin user & get token
    const adminEmail = `admin_dir_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRole!.id,
        fullName: 'System Administrator',
      })
      .expect(200);
    authToken = adminRes.body.token;

    // 2. Create a content manager staff
    const contentEmail = `content_staff_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: contentEmail,
        password: 'ContentPassword123!',
        roleId: contentRole!.id,
        fullName: 'Elena Content Curator',
      })
      .expect(200);

    // 3. Create an academic staff
    const academicEmail = `academic_staff_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: academicEmail,
        password: 'AcademicPassword123!',
        roleId: academicRole!.id,
        fullName: 'Marcus Academic Head',
      })
      .expect(200);

    // 4. Create a student user (should NOT appear in GET /users staff directory)
    const studentEmail = `student_test_${Date.now()}@example.com`;
    await client
      .post('/auth/student/signup')
      .send({
        email: studentEmail,
        password: 'StudentPassword123!',
        fullName: 'Student User',
        gradeLevelId: gradeLevel.id,
      })
      .expect(200);
  });

  after(async () => {
    await app.stop();
  });

  it('GET /users rejects unauthenticated request with 401 Unauthorized', async () => {
    await client.get('/users').expect(401);
  });

  it('GET /users returns staff members only and strictly excludes admin and students', async () => {
    const res = await client
      .get('/users?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('total');
    expect(res.body.data).to.have.property('page', 1);
    expect(res.body.data).to.have.property('limit', 10);
    expect(res.body.data.users).to.be.an.Array();
    expect(res.body.data.users.length).to.be.greaterThan(0);

    // Verify all returned users are staff (content, academic, operations) and NOT admin or student
    for (const user of res.body.data.users) {
      expect(user.roleValues).to.not.containEql('admin');
      expect(user.roleValues).to.not.containEql('student_junior');
      expect(user.roleValues).to.not.containEql('student_senior');
      const isStaff = user.roleValues.some((r: string) =>
        ['content', 'academic', 'operations'].includes(r),
      );
      expect(isStaff).to.be.true();
    }
  });

  it('GET /users?role=content filters only content managers', async () => {
    const res = await client
      .get('/users?role=content')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    for (const user of res.body.data.users) {
      expect(user.roleValues).to.containEql('content');
    }
  });

  it('GET /users?search=Elena searches by name or email', async () => {
    const res = await client
      .get('/users?search=Elena')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.users.length).to.be.greaterThan(0);
    expect(res.body.data.users[0].fullName).to.containEql('Elena');
  });
});
