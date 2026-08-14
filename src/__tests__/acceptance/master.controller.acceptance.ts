import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

describe('Database Master Data Controller (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  it('POST /masters/grade-levels inserts new grade level into PostgreSQL', async () => {
    const val = `Grade_Test_${Date.now()}`;
    const postRes = await client
      .post('/masters/grade-levels')
      .send({
        label: `Grade Test (${val})`,
        value: val,
        category: 'senior',
        description: 'Test grade level',
      })
      .expect(200);

    expect(postRes.body.success).to.be.true();
    expect(postRes.body.data).to.have.property('id');

    const getRes = await client.get('/masters/grade-levels').expect(200);
    expect(getRes.body.data.some((g: any) => g.value === val)).to.be.true();
  });

  it('POST /masters/subjects inserts new subject into PostgreSQL', async () => {
    const val = `Subject_Test_${Date.now()}`;
    const postRes = await client
      .post('/masters/subjects')
      .send({
        label: `Subject Test (${val})`,
        value: val,
        description: 'Test subject description',
      })
      .expect(200);

    expect(postRes.body.success).to.be.true();

    const getRes = await client.get('/masters/subjects').expect(200);
    expect(getRes.body.data.some((s: any) => s.value === val)).to.be.true();
  });

  it('POST /masters/tiers inserts new tier into PostgreSQL', async () => {
    const val = `Tier_Test_${Date.now()}`;
    await client
      .post('/masters/tiers')
      .send({
        label: `Tier Test (${val})`,
        value: val,
        description: 'Test tier description',
      })
      .expect(200);

    const res = await client.get('/masters/tiers').expect(200);
    expect(res.body.data.some((t: any) => t.value === val)).to.be.true();
  });

  it('POST /masters/asset-types inserts new asset type into PostgreSQL', async () => {
    const val = `Asset_Test_${Date.now()}`;
    await client
      .post('/masters/asset-types')
      .send({
        label: `Asset Type (${val})`,
        value: val,
        description: 'Test asset type',
      })
      .expect(200);

    const res = await client.get('/masters/asset-types').expect(200);
    expect(res.body.data.some((a: any) => a.value === val)).to.be.true();
  });

  it('POST /masters/compliance-statuses inserts new status into PostgreSQL', async () => {
    const val = `Compliance_Test_${Date.now()}`;
    await client
      .post('/masters/compliance-statuses')
      .send({
        label: `Status (${val})`,
        value: val,
        description: 'Test status description',
      })
      .expect(200);

    const res = await client.get('/masters/compliance-statuses').expect(200);
    expect(res.body.data.some((c: any) => c.value === val)).to.be.true();
  });
});
