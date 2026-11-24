import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';

/**
 * BUG-048: AI Content Engine asset library ("Save to Library").
 * Endpoints: POST/GET /content/assets, GET/PATCH/DELETE /content/assets/{id}
 */
describe('Content Asset Library (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let adminToken: string;
  let contentToken: string;
  let otherContentToken: string;
  let academicToken: string;
  let studentToken: string;
  let subjectId: string;
  let gradeLevelId: string;
  let courseId: string;
  let assetId: string;
  const stamp = Date.now();
  const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

  const auth = (t: string) => ({Authorization: `Bearer ${t}`});
  const validBody = () => ({
    title: `Photosynthesis Basics — Lesson Plan ${stamp}`,
    assetType: 'Lesson Plan',
    subjectId,
    gradeLevelId,
    topic: 'Photosynthesis Basics',
    objectives: 'Explain inputs and outputs of photosynthesis',
    content: '# Lesson Plan: Photosynthesis Basics\n\n## Learning Objectives\n- ...',
  });

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    const roles = (await client.get('/auth/roles').expect(200)).body.roles;
    const roleId = (key: string) => roles.find((r: any) => r.key === key)?.id;
    const signup = async (key: string, tag: string, fullName: string) =>
      (
        await client
          .post('/auth/signup')
          .send({
            email: `${tag}_${stamp}@example.com`,
            password: 'StrongPassword123!',
            roleId: roleId(key),
            fullName,
          })
          .expect(200)
      ).body.token as string;

    adminToken = await signup('admin', 'asset_admin', 'Asset Admin');
    contentToken = await signup('content', 'asset_content', 'Content Author');
    otherContentToken = await signup('content', 'asset_content_two', 'Other Author');
    academicToken = await signup('academic', 'asset_academic', 'Academic Coordinator');

    subjectId = (
      await client
        .post('/masters/subjects')
        .set(auth(adminToken))
        .send({label: `Biology (${stamp})`, value: `biology_${stamp}`})
        .expect(200)
    ).body.data.id;
    gradeLevelId = (
      await client
        .post('/masters/grade-levels')
        .set(auth(adminToken))
        .send({label: 'Grade 10', value: `asset_grade_10_${stamp}`, category: 'senior'})
        .expect(200)
    ).body.data.id;
    courseId = (
      await client
        .post('/courses')
        .set(auth(adminToken))
        .send({title: `Biology Course ${stamp}`, subjectId, gradeLevelId, tier: 'senior'})
        .expect(200)
    ).body.data.id;
    studentToken = (
      await client
        .post('/auth/student/signup')
        .send({
          email: `asset_student_${stamp}@example.com`,
          password: 'StudentPassword123!',
          fullName: 'Asset Student',
          gradeLevelId,
        })
        .expect(200)
    ).body.token;
  });

  after(async () => {
    await app.stop();
  });

  // ── create ────────────────────────────────────────────────────────────────
  it('POST /content/assets saves an asset with subject/grade relations (200)', async () => {
    const res = await client
      .post('/content/assets')
      .set(auth(contentToken))
      .send(validBody())
      .expect(200);

    expect(res.body.success).to.be.true();
    const a = res.body.data;
    expect(a.id).to.be.a.String();
    expect(a).to.containDeep({
      assetType: 'Lesson Plan',
      status: 'ready',
      subjectId,
      gradeLevelId,
      topic: 'Photosynthesis Basics',
    });
    expect(a.subject.label).to.equal(`Biology (${stamp})`);
    expect(a.gradeLevel.label).to.equal('Grade 10');
    expect(a.createdBy.fullName).to.equal('Content Author');
    assetId = a.id;
  });

  it('POST /content/assets accepts an optional courseId and returns the course title', async () => {
    const res = await client
      .post('/content/assets')
      .set(auth(contentToken))
      .send({...validBody(), title: `Linked asset ${stamp}`, assetType: 'Study Guide', courseId})
      .expect(200);
    expect(res.body.data.courseId).to.equal(courseId);
    expect(res.body.data.course.title).to.equal(`Biology Course ${stamp}`);
  });

  it('POST /content/assets rejects an unknown assetType (400)', async () => {
    await client
      .post('/content/assets')
      .set(auth(contentToken))
      .send({...validBody(), assetType: 'Podcast'})
      .expect(400);
  });

  it('POST /content/assets rejects empty content and missing title (400)', async () => {
    await client
      .post('/content/assets')
      .set(auth(contentToken))
      .send({...validBody(), content: '   '})
      .expect(400);
    const {title, ...noTitle} = validBody();
    expect(title).to.be.ok();
    await client.post('/content/assets').set(auth(contentToken)).send(noTitle).expect(422);
  });

  it('POST /content/assets rejects non-existent subject / grade / course ids (400)', async () => {
    for (const bad of [
      {subjectId: MISSING_UUID},
      {gradeLevelId: MISSING_UUID},
      {courseId: MISSING_UUID},
      {subjectId: 'not-a-uuid'},
    ]) {
      await client
        .post('/content/assets')
        .set(auth(contentToken))
        .send({...validBody(), ...bad})
        .expect(400);
    }
  });

  it('POST /content/assets requires a token (401)', async () => {
    await client.post('/content/assets').send(validBody()).expect(401);
  });

  it('POST /content/assets is forbidden for academic staff and students (403)', async () => {
    await client.post('/content/assets').set(auth(academicToken)).send(validBody()).expect(403);
    await client.post('/content/assets').set(auth(studentToken)).send(validBody()).expect(403);
  });

  // ── read ──────────────────────────────────────────────────────────────────
  it('GET /content/assets lists only the caller’s assets, newest first, with search + type filter', async () => {
    const all = await client.get('/content/assets').set(auth(contentToken)).expect(200);
    expect(all.body.data.total).to.equal(2);
    expect(all.body.data.items[0].title).to.equal(`Linked asset ${stamp}`);

    const byType = await client
      .get('/content/assets?assetType=Lesson%20Plan')
      .set(auth(contentToken))
      .expect(200);
    expect(byType.body.data.items.map((i: any) => i.id)).to.eql([assetId]);

    const bySearch = await client
      .get('/content/assets?search=photosynthesis')
      .set(auth(contentToken))
      .expect(200);
    expect(bySearch.body.data.items.map((i: any) => i.id)).to.containEql(assetId);

    const other = await client.get('/content/assets').set(auth(otherContentToken)).expect(200);
    expect(other.body.data.total).to.equal(0);
  });

  it('GET /content/assets?assetType=<invalid> returns 400', async () => {
    await client.get('/content/assets?assetType=Podcast').set(auth(contentToken)).expect(400);
  });

  it('GET /content/assets lets admin see every author’s assets', async () => {
    const res = await client.get('/content/assets?limit=100').set(auth(adminToken)).expect(200);
    expect(res.body.data.items.map((i: any) => i.id)).to.containEql(assetId);
  });

  it('GET /content/assets/{id} returns the asset to its owner (200)', async () => {
    const res = await client.get(`/content/assets/${assetId}`).set(auth(contentToken)).expect(200);
    expect(res.body.data.content).to.match(/Photosynthesis Basics/);
  });

  it('GET /content/assets/{id} hides other authors’ assets and unknown ids (404)', async () => {
    await client.get(`/content/assets/${assetId}`).set(auth(otherContentToken)).expect(404);
    await client.get(`/content/assets/${MISSING_UUID}`).set(auth(contentToken)).expect(404);
    await client.get('/content/assets/not-a-uuid').set(auth(contentToken)).expect(404);
  });

  // ── update ────────────────────────────────────────────────────────────────
  it('PATCH /content/assets/{id} links the asset to a course (200)', async () => {
    const res = await client
      .patch(`/content/assets/${assetId}`)
      .set(auth(contentToken))
      .send({courseId, status: 'ready'})
      .expect(200);
    expect(res.body.data.courseId).to.equal(courseId);
    expect(res.body.data.course.title).to.equal(`Biology Course ${stamp}`);
  });

  it('PATCH /content/assets/{id} validates input (400) and ownership (404)', async () => {
    await client
      .patch(`/content/assets/${assetId}`)
      .set(auth(contentToken))
      .send({status: 'published'})
      .expect(400);
    await client
      .patch(`/content/assets/${assetId}`)
      .set(auth(contentToken))
      .send({courseId: MISSING_UUID})
      .expect(400);
    await client.patch(`/content/assets/${assetId}`).set(auth(contentToken)).send({}).expect(400);
    await client
      .patch(`/content/assets/${assetId}`)
      .set(auth(otherContentToken))
      .send({title: 'Hijack'})
      .expect(404);
  });

  // ── delete ────────────────────────────────────────────────────────────────
  it('DELETE /content/assets/{id} is owner-only and soft-deletes (200 → 404)', async () => {
    await client.del(`/content/assets/${assetId}`).set(auth(otherContentToken)).expect(404);
    await client.del(`/content/assets/${assetId}`).set(auth(contentToken)).expect(200);
    await client.get(`/content/assets/${assetId}`).set(auth(contentToken)).expect(404);
    await client.del(`/content/assets/${assetId}`).set(auth(contentToken)).expect(404);

    const list = await client.get('/content/assets').set(auth(contentToken)).expect(200);
    expect(list.body.data.items.map((i: any) => i.id)).to.not.containEql(assetId);
  });
});
