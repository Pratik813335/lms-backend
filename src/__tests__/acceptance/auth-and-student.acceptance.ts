import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
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
    expect(res.body.roles.length).to.equal(6);
  });

  it('POST /auth/login returns JWT token and user profile', async () => {
    const res = await client
      .post('/auth/login')
      .send({email: 'student@example.com', password: 'password123'})
      .expect(200);

    expect(res.body).to.have.property('token');
    expect(res.body).to.have.property('user');
    expect(res.body.user.email).to.equal('student@example.com');
  });

  it('POST /auth/signup registers new user and issues JWT token', async () => {
    const res = await client
      .post('/auth/signup')
      .send({
        email: 'newstudent@example.com',
        password: 'securepassword123',
        role: 'student_senior',
        fullName: 'New Senior Student',
        gradeLevel: 'Grade 11',
      })
      .expect(200);

    expect(res.body.token).to.be.a.String();
    expect(res.body.user.email).to.equal('newstudent@example.com');
  });

  it('GET /student/me/dashboard requires JWT token (401 Unauthorized without token)', async () => {
    await client.get('/student/me/dashboard').expect(401);
  });

  it('GET /student/me/dashboard succeeds with valid JWT Bearer token', async () => {
    const loginRes = await client
      .post('/auth/login')
      .send({email: 'student@example.com', password: 'password123'})
      .expect(200);

    const token = loginRes.body.token;

    const dashRes = await client
      .get('/student/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashRes.body.success).to.be.true();
    expect(dashRes.body.data.stats).to.have.property('xp');
    expect(dashRes.body.data.stats).to.have.property('level');
  });
});
