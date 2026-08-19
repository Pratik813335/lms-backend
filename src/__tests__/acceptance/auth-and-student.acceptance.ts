import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {OtpRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('Week 1 Authentication & Student Profile (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  it('GET /auth/roles returns all 6 supported roles', async () => {
    const res = await client.get('/auth/roles').expect(200);
    expect(res.body.roles).to.be.an.Array();
    expect(res.body.roles.length).to.be.greaterThanOrEqual(6);
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
        role: 'student_senior',
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
        role: 'student_junior',
      })
      .expect(400);

    expect(res.body.error.message).to.containEql('Password must be at least 8 characters long');
  });

  it('POST /auth/signup rejects invalid role with 400 Bad Request', async () => {
    const res = await client
      .post('/auth/signup')
      .send({
        email: `invalid_role_${Date.now()}@example.com`,
        password: 'password123',
        role: 'junior_student', // Invalid role name
      })
      .expect(400);

    expect(res.body.error.message).to.containEql("Invalid role 'junior_student'");
  });

  it('POST /auth/send-otp generates and sends 6-digit OTP for registered user', async () => {
    const testEmail = `otp_user_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        role: 'student_senior',
        fullName: 'OTP Test Student',
      })
      .expect(200);

    const otpRes = await client
      .post('/auth/send-otp')
      .send({ email: testEmail })
      .expect(200);

    expect(otpRes.body.message).to.containEql('6-digit OTP code sent successfully');
    expect(otpRes.body).to.have.property('expiresAt');
  });

  it('POST /auth/send-otp rate limits after 5 requests (429 Too Many Requests)', async () => {
    const testEmail = `otp_ratelimit_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        role: 'student_junior',
      })
      .expect(200);

    // Send 5 OTPs successfully
    for (let i = 0; i < 5; i++) {
      await client.post('/auth/send-otp').send({ email: testEmail }).expect(200);
    }

    // 6th OTP request should be rate-limited (HTTP 429)
    const rateLimitRes = await client
      .post('/auth/send-otp')
      .send({ email: testEmail })
      .expect(429);

    expect(rateLimitRes.body.error.message).to.containEql('Too many OTP requests');
  });

  it('POST /auth/verify-otp verifies 6-digit OTP code correctly', async () => {
    const testEmail = `otp_verify_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        role: 'student_senior',
        fullName: 'OTP Verify Student',
      })
      .expect(200);

    await client
      .post('/auth/send-otp')
      .send({ email: testEmail })
      .expect(200);

    // Fetch generated OTP from database
    const otpRepo = await app.getRepository(OtpRepository);
    const otpRow = await otpRepo.findOne({
      where: { identifier: testEmail, isUsed: false, isActive: true },
    });

    expect(otpRow).to.not.be.null();

    const verifyRes = await client
      .post('/auth/verify-otp')
      .send({ email: testEmail, otp: otpRow!.otp })
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
        role: 'student_junior',
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
        role: 'student_senior',
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
