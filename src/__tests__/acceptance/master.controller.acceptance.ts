import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Database Master Data Controller (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const rolesRes = await client.get('/auth/roles').expect(200);
    const adminRoleId = rolesRes.body.roles.find((r: any) => r.key === 'admin')?.id;

    // Register admin user for master administration
    const adminEmail = `admin_masters_${Date.now()}@example.com`;
    const adminRes = await client
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
        roleId: adminRoleId,
        fullName: 'Master Admin',
      })
      .expect(200);
    adminToken = adminRes.body.token;
  });

  after(async () => {
    await app.stop();
  });

  it('POST & PATCH /masters/grade-levels creates and updates grade level in PostgreSQL', async () => {
    const val = `Grade_Test_${Date.now()}`;
    const postRes = await client
      .post('/masters/grade-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Grade Test (${val})`,
        value: val,
        category: 'senior',
        description: 'Test grade level',
      })
      .expect(200);

    expect(postRes.body.success).to.be.true();
    const createdId = postRes.body.data.id;

    // Test PATCH
    const patchRes = await client
      .patch(`/masters/grade-levels/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated grade level description',
      })
      .expect(200);

    expect(patchRes.body.data.description).to.equal('Updated grade level description');

    // Public GET test
    const getRes = await client.get('/masters/grade-levels').expect(200);
    expect(getRes.body.data.some((g: any) => g.value === val)).to.be.true();
  });

  it('POST /masters/grade-levels rejects unauthenticated request with 401 Unauthorized', async () => {
    await client
      .post('/masters/grade-levels')
      .send({
        label: 'Unauthorized Grade',
        value: 'Unauthorized_Grade',
      })
      .expect(401);
  });

  it('POST & PATCH /masters/subjects creates and updates subject in PostgreSQL', async () => {
    const val = `Subject_Test_${Date.now()}`;
    const postRes = await client
      .post('/masters/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Subject Test (${val})`,
        value: val,
        description: 'Test subject description',
      })
      .expect(200);

    expect(postRes.body.success).to.be.true();
    const createdId = postRes.body.data.id;

    // Test PATCH
    const patchRes = await client
      .patch(`/masters/subjects/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Updated Subject (${val})`,
      })
      .expect(200);

    expect(patchRes.body.data.label).to.equal(`Updated Subject (${val})`);
  });

  it('POST & PATCH /masters/asset-types creates and updates asset type in PostgreSQL', async () => {
    const val = `Asset_Test_${Date.now()}`;
    const postRes = await client
      .post('/masters/asset-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Asset Type (${val})`,
        value: val,
        description: 'Test asset type',
      })
      .expect(200);

    const createdId = postRes.body.data.id;

    // Test PATCH
    const patchRes = await client
      .patch(`/masters/asset-types/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Updated Asset (${val})`,
      })
      .expect(200);

    expect(patchRes.body.data.label).to.equal(`Updated Asset (${val})`);
  });

  it('POST & PATCH /masters/compliance-statuses creates and updates status in PostgreSQL', async () => {
    const val = `Compliance_Test_${Date.now()}`;
    const postRes = await client
      .post('/masters/compliance-statuses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Status (${val})`,
        value: val,
        description: 'Test status description',
      })
      .expect(200);

    const createdId = postRes.body.data.id;

    // Test PATCH
    const patchRes = await client
      .patch(`/masters/compliance-statuses/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated compliance description',
      })
      .expect(200);

    expect(patchRes.body.data.description).to.equal('Updated compliance description');
  });
});
