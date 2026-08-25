import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';
import {RolesRepository} from '../../repositories';

describe('User Controller - Staff & User Directory (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let authToken: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRepo = await app.getRepository(RolesRepository);
    const adminRole = await rolesRepo.findOne({where: {value: 'admin'}});
    const contentRole = await rolesRepo.findOne({where: {value: 'content'}});

    // Create admin user & get token
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

    // Create a content manager staff
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
  });

  after(async () => {
    await app.stop();
  });

  it('GET /users rejects unauthenticated request with 401 Unauthorized', async () => {
    await client.get('/users').expect(401);
  });

  it('GET /users returns paginated list of all users', async () => {
    const res = await client
      .get('/users?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.have.property('total');
    expect(res.body.data).to.have.property('page', 1);
    expect(res.body.data).to.have.property('limit', 10);
    expect(res.body.data).to.have.property('totalPages');
    expect(res.body.data.users).to.be.an.Array();
    expect(res.body.data.users.length).to.be.greaterThan(0);
  });

  it('GET /users?role=admin filters only users with admin role', async () => {
    const res = await client
      .get('/users?role=admin')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    for (const user of res.body.data.users) {
      expect(user.roleValues).to.containEql('admin');
    }
  });

  it('GET /users?isStaff=true returns only staff members', async () => {
    const res = await client
      .get('/users?isStaff=true')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    for (const user of res.body.data.users) {
      const isStaff = user.roleValues.some((r: string) =>
        ['admin', 'content', 'academic', 'operations'].includes(r),
      );
      expect(isStaff).to.be.true();
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
