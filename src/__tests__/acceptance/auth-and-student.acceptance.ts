import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {GradeLevelsRepository, OtpRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('Week 1 Authentication & Student Profile (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminRoleId: string;
  let seniorGradeId: string;
  let juniorGradeId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;

    const gradeRepo = await app.getRepository(GradeLevelsRepository);
    let seniorGrade = await gradeRepo.findOne({where: {category: 'senior', isDeleted: false}});
    if (!seniorGrade) {
      seniorGrade = await gradeRepo.create({
        label: 'Grade 10 (Sophomore)',
        value: `Grade_10_Test_${Date.now()}`,
        category: 'senior',
        isActive: true,
        isDeleted: false,
      });
    }
    seniorGradeId = seniorGrade.id!;

    let juniorGrade = await gradeRepo.findOne({where: {category: 'junior', isDeleted: false}});
    if (!juniorGrade) {
      juniorGrade = await gradeRepo.create({
        label: 'Grade 6 (Middle School)',
        value: `Grade_6_Test_${Date.now()}`,
        category: 'junior',
        isActive: true,
        isDeleted: false,
      });
    }
    juniorGradeId = juniorGrade.id!;
  });

  after(async () => {
    await app.stop();
  });

  it('GET /auth/roles returns all 6 supported roles with IDs', async () => {
    const res = await client.get('/auth/roles').expect(200);
    expect(res.body.roles).to.be.an.Array();
    expect(res.body.roles.length).to.be.greaterThanOrEqual(6);
    expect(res.body.roles[0]).to.have.property('id');
    const keys = res.body.roles.map((r: any) => r.key);
    expect(keys).to.containEql('student_junior');
    expect(keys).to.containEql('student_senior');
    expect(keys).to.containEql('admin');
  });

  it('POST /auth/student/signup registers senior student with automatic student_senior role mapping', async () => {
    const testEmail = `student_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password: 'password123',
        gradeLevelId: seniorGradeId,
        fullName: 'Test Senior Student',
      })
      .expect(200);

    expect(res.body).to.have.property('token');
    expect(res.body.user).to.have.property('id');
    expect(res.body.user.email).to.equal(testEmail);
    expect(res.body.user.roles).to.containEql('student_senior');
    expect(res.body.user.gradeLevel).to.be.a.String();
  });

  it('POST /auth/student/signup registers junior student with automatic student_junior role mapping', async () => {
    const testEmail = `junior_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password: 'password123',
        gradeLevelId: juniorGradeId,
        fullName: 'Test Junior Student',
      })
      .expect(200);

    expect(res.body).to.have.property('token');
    expect(res.body.user.roles).to.containEql('student_junior');
  });

  it('POST /auth/student/signup rejects invalid gradeLevelId with 400 Bad Request', async () => {
    const res = await client
      .post('/auth/student/signup')
      .send({
        email: `invalid_grade_${Date.now()}@example.com`,
        password: 'password123',
        gradeLevelId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(400);

    expect(res.body.error.message).to.containEql('Invalid gradeLevelId');
  });

  it('POST /auth/student/signup rejects weak password (< 8 chars) with 400 Bad Request', async () => {
    const res = await client
      .post('/auth/student/signup')
      .send({
        email: `weak_pwd_${Date.now()}@example.com`,
        password: '123',
        gradeLevelId: seniorGradeId,
      })
      .expect(400);

    expect(res.body.error.message).to.containEql('Password must be at least 8 characters long');
  });

  it('POST /auth/signup registers staff user with explicit roleId', async () => {
    const adminEmail = `admin_staff_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Staff Admin User',
      })
      .expect(200);

    expect(res.body).to.have.property('token');
    expect(res.body.user.roles).to.containEql('admin');
  });

  it('POST /auth/signup rejects student role on staff endpoint with 400 Bad Request', async () => {
    const rolesRes = await client.get('/auth/roles').expect(200);
    const seniorRoleId = rolesRes.body.roles.find((r: any) => r.key === 'student_senior')?.id;

    const res = await client
      .post('/auth/signup')
      .send({
        email: `reject_student_${Date.now()}@example.com`,
        password: 'StudentPassword123!',
        roleId: seniorRoleId,
      })
      .expect(400);

    expect(res.body.error.message).to.containEql('Student registration must use the /auth/student/signup endpoint');
  });

  it('POST /auth/send-otp generates and sends 6-digit OTP for registered user', async () => {
    const testEmail = `otp_user_${Date.now()}@example.com`;
    await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password: 'password123',
        gradeLevelId: seniorGradeId,
        fullName: 'OTP Test Student',
      })
      .expect(200);

    const otpRes = await client
      .post('/auth/send-otp')
      .send({email: testEmail})
      .expect(200);

    expect(otpRes.body).to.have.property('message');
    expect(otpRes.body).to.have.property('expiresAt');
  });

  it('POST /auth/send-otp rate limits after 5 requests (429 Too Many Requests)', async () => {
    const testEmail = `otp_ratelimit_${Date.now()}@example.com`;
    await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password: 'password123',
        gradeLevelId: seniorGradeId,
        fullName: 'Rate Limit Student',
      })
      .expect(200);

    for (let i = 0; i < 5; i++) {
      await client
        .post('/auth/send-otp')
        .send({email: testEmail})
        .expect(200);
    }

    const blockedRes = await client
      .post('/auth/send-otp')
      .send({email: testEmail})
      .expect(429);

    expect(blockedRes.body.error.message).to.containEql('Too many OTP requests');
  });

  it('POST /auth/verify-otp verifies 6-digit OTP code correctly', async () => {
    const testEmail = `otp_verify_${Date.now()}@example.com`;
    await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password: 'password123',
        gradeLevelId: seniorGradeId,
        fullName: 'Verify OTP Student',
      })
      .expect(200);

    await client
      .post('/auth/send-otp')
      .send({email: testEmail})
      .expect(200);

    const otpRepo = await app.getRepository(OtpRepository);
    const otpRow = await otpRepo.findOne({
      where: {identifier: testEmail},
      order: ['createdAt DESC'],
    });

    expect(otpRow).to.not.be.null();

    const verifyRes = await client
      .post('/auth/verify-otp')
      .send({email: testEmail, otp: otpRow!.otp})
      .expect(200);

    expect(verifyRes.body.success).to.be.true();
  });

  it('POST /auth/login returns JWT token and user profile', async () => {
    const testEmail = `login_${Date.now()}@example.com`;
    const password = 'StudentPassword123!';

    await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password,
        gradeLevelId: juniorGradeId,
        fullName: 'Junior Student Demo',
      })
      .expect(200);

    const loginRes = await client
      .post('/auth/login')
      .send({
        email: testEmail,
        password,
      })
      .expect(200);

    expect(loginRes.body).to.have.property('token');
    expect(loginRes.body.user.email).to.equal(testEmail);
    expect(loginRes.body.user.roles).to.containEql('student_junior');
  });

  it('GET /student/me/dashboard requires JWT token (401 Unauthorized without token)', async () => {
    await client.get('/student/me/dashboard').expect(401);
  });

  it('GET /student/me/dashboard succeeds with valid JWT Bearer token', async () => {
    const testEmail = `dashboard_${Date.now()}@example.com`;
    const signupRes = await client
      .post('/auth/student/signup')
      .send({
        email: testEmail,
        password: 'Password123!',
        gradeLevelId: seniorGradeId,
        fullName: 'Dashboard Tester',
      })
      .expect(200);

    const token = signupRes.body.token;

    const dashRes = await client
      .get('/student/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashRes.body.success).to.be.true();
    expect(dashRes.body.data.profile.email).to.equal(testEmail);
    expect(dashRes.body.data.stats.xp).to.equal(0);
    expect(dashRes.body.data.stats.level).to.equal(1);
  });
});
