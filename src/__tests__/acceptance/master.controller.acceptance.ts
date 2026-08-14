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
    const postRes = await client
      .post('/masters/grade-levels')
      .send({
        label: 'Grade 10 (Sophomore)',
        value: 'Grade 10',
        category: 'senior',
        description: 'High school sophomore level',
      })
      .expect(200);

    expect(postRes.body.success).to.be.true();
    expect(postRes.body.data).to.have.property('id');

    const getRes = await client.get('/masters/grade-levels').expect(200);
    expect(getRes.body.data.some((g: any) => g.value === 'Grade 10')).to.be.true();
  });

  it('POST /masters/subjects inserts new subject into PostgreSQL', async () => {
    const postRes = await client
      .post('/masters/subjects')
      .send({
        label: 'Mathematics & Algebra',
        value: 'Mathematics',
        description: 'Algebra, Calculus, Geometry',
      })
      .expect(200);

    expect(postRes.body.success).to.be.true();

    const getRes = await client.get('/masters/subjects').expect(200);
    expect(getRes.body.data.some((s: any) => s.value === 'Mathematics')).to.be.true();
  });

  it('POST /masters/tiers inserts new tier into PostgreSQL', async () => {
    await client
      .post('/masters/tiers')
      .send({
        label: 'Senior Tier',
        value: 'senior',
        description: 'Grades 9-12 curriculum',
      })
      .expect(200);

    const res = await client.get('/masters/tiers').expect(200);
    expect(res.body.data.some((t: any) => t.value === 'senior')).to.be.true();
  });

  it('POST /masters/asset-types inserts new asset type into PostgreSQL', async () => {
    await client
      .post('/masters/asset-types')
      .send({
        label: 'Lesson Plan',
        value: 'Lesson Plan',
        description: 'Structured 45-min lesson',
      })
      .expect(200);

    const res = await client.get('/masters/asset-types').expect(200);
    expect(res.body.data.some((a: any) => a.value === 'Lesson Plan')).to.be.true();
  });

  it('POST /masters/compliance-statuses inserts new status into PostgreSQL', async () => {
    await client
      .post('/masters/compliance-statuses')
      .send({
        label: 'Fully Compliant',
        value: 'Compliant',
        description: 'All requirements met',
      })
      .expect(200);

    const res = await client.get('/masters/compliance-statuses').expect(200);
    expect(res.body.data.some((c: any) => c.value === 'Compliant')).to.be.true();
  });
});
