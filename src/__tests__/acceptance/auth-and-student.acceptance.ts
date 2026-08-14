import { Client, expect } from '@loopback/testlab';
import { LmsBackendApplication } from '../../application';
import { OtpRepository } from '../../repositories';
import { setupApplication } from './test-helper';

describe('Week 1 Authentication & Student Profile (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({ app, client } = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  it('GET /auth/roles returns all 6 supported roles', async () => {
    const res = await client.get('/auth/roles').expect(200);
    expect(res.body.roles).to.be.an.Array();
    expect(res.body.roles.length).to.equal(6);
  });

  it('POST /auth/signup registers new user into PostgreSQL and issues JWT token', async () => {
    const testEmail = `newstudent_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'securepassword123',
        role: 'student_senior',
        fullName: 'New Senior Student',
        gradeLevel: 'Grade 11',
      })
      .expect(200);

    expect(res.body.token).to.be.a.String();
    expect(res.body.user.email).to.equal(testEmail);
  });

  it('POST /auth/signup rejects invalid role with 400 Bad Request', async () => {
    const testEmail = `invalidrole_${Date.now()}@example.com`;
    const res = await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'securepassword123',
        role: 'junior_student', // Invalid typo role name
        fullName: 'Invalid Role Student',
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

    // Fetch generated OTP from PostgreSQL test database
    const otpRepo = await app.getRepository(OtpRepository);
    const otpRecord = await otpRepo.findOne({
      where: { identifier: testEmail, isUsed: false },
    });

    expect(otpRecord).to.not.be.null();
    const generatedOtp = otpRecord!.otp;

    const verifyRes = await client
      .post('/auth/verify-otp')
      .send({ email: testEmail, otp: generatedOtp })
      .expect(200);

    expect(verifyRes.body.success).to.be.true();
    expect(verifyRes.body.message).to.equal('OTP verified successfully');
  });

  it('POST /auth/login returns JWT token and user profile', async () => {
    // Register test user first
    const testEmail = `login_user_${Date.now()}@example.com`;
    await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        role: 'student_senior',
        fullName: 'Login Test Student',
      })
      .expect(200);

    const res = await client
      .post('/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    expect(res.body).to.have.property('token');
    expect(res.body).to.have.property('user');
    expect(res.body.user.email).to.equal(testEmail);
  });

  it('GET /student/me/dashboard requires JWT token (401 Unauthorized without token)', async () => {
    await client.get('/student/me/dashboard').expect(401);
  });

  it('GET /student/me/dashboard succeeds with valid JWT Bearer token', async () => {
    const testEmail = `dash_user_${Date.now()}@example.com`;
    const signupRes = await client
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        role: 'student_senior',
        fullName: 'Dashboard Test Student',
      })
      .expect(200);

    const token = signupRes.body.token;

    const dashRes = await client
      .get('/student/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashRes.body.success).to.be.true();
    expect(dashRes.body.data.stats).to.have.property('xp');
    expect(dashRes.body.data.stats).to.have.property('level');
  });
});
