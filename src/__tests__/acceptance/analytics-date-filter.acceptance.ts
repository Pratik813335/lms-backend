import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

/**
 * BUG-052: Operations → Analytics date filter.
 * GET /admin/analytics/overview?from&to and GET /admin/reports/grade-distribution?from&to
 */
describe('Analytics date filter (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let opsToken: string;
  let contentToken: string;
  const stamp = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    const roles = (await client.get('/auth/roles').expect(200)).body.roles;
    const signup = async (key: string, tag: string, fullName: string) =>
      (
        await client
          .post('/auth/signup')
          .send({
            email: `${tag}_${stamp}@example.com`,
            password: 'StrongPassword123!',
            roleId: roles.find((r: any) => r.key === key).id,
            fullName,
          })
          .expect(200)
      ).body.token as string;
    opsToken = await signup('operations', 'analytics_ops', 'Operations Analyst');
    contentToken = await signup('content', 'analytics_content', 'Content Author');

    // a student created today, so "today" ranges have at least one active student
    const adminToken = await signup('admin', 'analytics_admin', 'Analytics Admin');
    const gradeLevelId = (
      await client
        .post('/masters/grade-levels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({label: 'Grade 9', value: `analytics_grade_9_${stamp}`, category: 'senior'})
        .expect(200)
    ).body.data.id;
    await client
      .post('/auth/student/signup')
      .send({
        email: `analytics_student_${stamp}@example.com`,
        password: 'StudentPassword123!',
        fullName: 'Range Student',
        gradeLevelId,
      })
      .expect(200);
  });

  after(async () => {
    await app.stop();
  });

  const get = (path: string, token = opsToken) =>
    client.get(path).set('Authorization', `Bearer ${token}`);

  // ── overview ──────────────────────────────────────────────────────────────
  it('overview: a range covering today counts the new student and echoes the range', async () => {
    const res = await get(`/admin/analytics/overview?from=${today}&to=${today}`).expect(200);
    expect(res.body.data.totalActiveStudents).to.be.greaterThanOrEqual(1);
    expect(res.body.data.from).to.equal(`${today}T00:00:00.000Z`);
    expect(res.body.data.to).to.equal(`${today}T23:59:59.999Z`);
    expect(res.body.data.enrollmentGrowth).to.have.length(1);
  });

  it('overview: a past range with no activity returns zeros and one bucket per month', async () => {
    const res = await get('/admin/analytics/overview?from=2001-01-01&to=2001-12-31').expect(200);
    expect(res.body.data.totalActiveStudents).to.equal(0);
    expect(res.body.data.totalEnrollments).to.equal(0);
    expect(res.body.data.courseCompletionRate).to.equal(0);
    expect(res.body.data.enrollmentGrowth).to.have.length(12);
    expect(res.body.data.enrollmentGrowth.every((p: any) => p.students === 0)).to.be.true();
  });

  it('overview: without a range keeps the previous all-time behaviour', async () => {
    const res = await get('/admin/analytics/overview').expect(200);
    expect(res.body.data.from).to.be.null();
    expect(res.body.data.to).to.be.null();
    expect(res.body.data.totalActiveStudents).to.be.greaterThanOrEqual(1);
  });

  it('overview: rejects an invalid date (400)', async () => {
    await get('/admin/analytics/overview?from=not-a-date').expect(400);
    await get('/admin/analytics/overview?to=2026-13-45').expect(400);
  });

  it('overview: rejects from after to (400)', async () => {
    await get('/admin/analytics/overview?from=2026-06-01&to=2026-01-01').expect(400);
  });

  // ── grade distribution ────────────────────────────────────────────────────
  it('grade distribution: an empty range shows real zeros, not placeholder grades', async () => {
    const res = await get('/admin/reports/grade-distribution?from=2001-01-01&to=2001-12-31').expect(200);
    expect(res.body.data.totalEvaluations).to.equal(0);
    expect(res.body.data.distribution).to.have.length(5);
    for (const b of res.body.data.distribution) {
      expect(b.count).to.equal(0);
      expect(b.percentage).to.equal(0);
    }
    expect(res.body.data.from).to.equal('2001-01-01T00:00:00.000Z');
  });

  it('grade distribution: rejects invalid / reversed ranges (400)', async () => {
    await get('/admin/reports/grade-distribution?from=yesterday').expect(400);
    await get('/admin/reports/grade-distribution?from=2026-06-01&to=2026-01-01').expect(400);
  });

  // ── access ────────────────────────────────────────────────────────────────
  it('requires a token (401) and an analytics role (403)', async () => {
    await client.get(`/admin/analytics/overview?from=${today}`).expect(401);
    await get(`/admin/analytics/overview?from=${today}`, contentToken).expect(403);
    await get(`/admin/reports/grade-distribution?from=${today}`, contentToken).expect(403);
  });
});
