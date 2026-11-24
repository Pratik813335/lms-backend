import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

/**
 * BUG-039: Admin profile view (frontend /admin/profile).
 * Covers the three APIs the page uses: GET /auth/me, PATCH /auth/me, POST /auth/change-password.
 */
describe('Admin Profile (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let adminEmail: string;
  const password = 'AdminPassword123!';

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;

    adminEmail = `admin_profile_${Date.now()}@example.com`;
    const signup = await client
      .post('/auth/signup')
      .send({email: adminEmail, password, roleId: adminRoleId, fullName: 'Profile Admin'})
      .expect(200);
    adminToken = signup.body.token;
  });

  after(async () => {
    await app.stop();
  });

  it('GET /auth/me returns the admin profile', async () => {
    const res = await client
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data).to.containDeep({
      email: adminEmail,
      fullName: 'Profile Admin',
      roles: ['admin'],
      isActive: true,
    });
    expect(res.body.data.id).to.be.a.String();
  });

  it('GET /auth/me rejects requests without a token (401)', async () => {
    await client.get('/auth/me').expect(401);
  });

  it('PATCH /auth/me updates fullName and phone, and GET /auth/me reflects it', async () => {
    const res = await client
      .patch('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({fullName: 'Profile Admin Updated', phone: '+1 555 0100'})
      .expect(200);

    expect(res.body.data).to.containDeep({
      fullName: 'Profile Admin Updated',
      phone: '+1 555 0100',
    });

    const me = await client
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(me.body.data.fullName).to.equal('Profile Admin Updated');
    expect(me.body.data.phone).to.equal('+1 555 0100');
  });

  it('PATCH /auth/me rejects an invalid name (400)', async () => {
    await client
      .patch('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({fullName: 'Admin 123!'})
      .expect(400);
  });

  it('PATCH /auth/me rejects requests without a token (401)', async () => {
    await client.patch('/auth/me').send({fullName: 'Nobody'}).expect(401);
  });

  it('POST /auth/change-password rejects a wrong current password (400)', async () => {
    await client
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({oldPassword: 'WrongPassword123!', newPassword: 'NewAdminPass456!'})
      .expect(400);
  });

  it('POST /auth/change-password rejects a weak new password (400)', async () => {
    await client
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({oldPassword: password, newPassword: 'short'})
      .expect(400);
  });

  it('POST /auth/change-password succeeds and the new password works for login', async () => {
    const newPassword = 'NewAdminPass456!';
    await client
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({oldPassword: password, newPassword})
      .expect(200);

    await client.post('/auth/login').send({email: adminEmail, password: newPassword}).expect(200);
    await client.post('/auth/login').send({email: adminEmail, password}).expect(401);
  });
});
