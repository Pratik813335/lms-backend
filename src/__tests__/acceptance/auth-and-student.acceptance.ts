import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {OtpRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('Week 1 Authentication & Student Profile (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let seniorRoleId: string;
  let juniorRoleId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    seniorRoleId = rolesRes.body.roles.find((r: any) => r.key === 'student_senior')?.id;
    juniorRoleId = rolesRes.body.roles.find((r: any) => r.key === 'student_junior')?.id;
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

  it('POST /auth/signup registers new user into PostgreSQL and issues JWT token', async () => {
    const testEmail = `student_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        roleId: seniorRoleId,
        fullName: 'Test Senior Student',
      })
      .expect(200);

    expect(res.body).to.have.property('token');
    expect(res.body.user).to.have.property('id');
    expect(res.body.user.email).to.equal(testEmail);
    expect(res.body.user.roles).to.containEql('student_senior');
    expect(res.body.user.gradeLevel).to.equal('Grade 10');
  });

  it('POST /auth/signup rejects weak password (< 8 chars) with 400 Bad Request', async () => {
    const res = await client
      .post('/auth/signup')
      .send({
        email: `weak_pwd_${Date.now()}@example.com`,
        password: '123', // Under 8 characters
      })
      .expect(400);

    expect(res.body.error.message).to.containEql('Password must be at least 8 characters long');
  });

  it('POST /auth/signup rejects invalid roleId with 400 Bad Request', async () => {
    const res = await client
      .post('/auth/signup')
      .send({
        email: `invalid_role_${Date.now()}@example.com`,
        password: 'password123',
        roleId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
      })
      .expect(400);

    expect(res.body.error.message).to.containEql('Invalid roleId');
  });

  it('POST /auth/send-otp generates and sends 6-digit OTP for registered user', async () => {
    const testEmail = `otp_user_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        roleId: seniorRoleId,
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
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        roleId: seniorRoleId,
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
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        roleId: seniorRoleId,
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
      .post('/auth/signup')
      .send({
        email: testEmail,
        password,
        roleId: juniorRoleId,
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
    expect(loginRes.body.user.gradeLevel).to.equal('Grade 6');
  });

  it('GET /student/me/dashboard requires JWT token (401 Unauthorized without token)', async () => {
    await client.get('/student/me/dashboard').expect(401);
  });

  it('GET /student/me/dashboard succeeds with valid JWT Bearer token', async () => {
    const testEmail = `dashboard_${Date.now()}@example.com`;
    const signupRes = await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'Password123!',
        roleId: seniorRoleId,
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
