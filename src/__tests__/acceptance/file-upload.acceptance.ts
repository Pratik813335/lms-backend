import {Client, expect} from '@loopback/testlab';
import {LmsBackendApplication} from '../../application';
import {setupApplication} from './test-helper';
import {MediaRepository} from '../../repositories';

describe('Media & File Upload Controller (Acceptance)', () => {
  let app: LmsBackendApplication;
  let client: Client;
  let mediaRepo: MediaRepository;
  let createdMediaId: string;
  let uploadedFilename: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    mediaRepo = await app.getRepository(MediaRepository);
  });

  after(async () => {
    await app.stop();
  });

  it('POST /files uploads a file and registers media record in PostgreSQL', async () => {
    const fileBuffer = Buffer.from('console.log("Mock video lesson or pdf buffer content");');

    const res = await client
      .post('/files')
      .attach('file', fileBuffer, 'sample_lecture.mp4')
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.files).to.be.an.Array();
    expect(res.body.data.files.length).to.be.greaterThan(0);

    const uploaded = res.body.data.files[0];
    expect(uploaded).to.have.property('id');
    expect(uploaded).to.have.property('fileUrl');
    expect(uploaded.fileOriginalName).to.equal('sample_lecture.mp4');
    expect(uploaded.fileType).to.equal('video/mp4');

    createdMediaId = uploaded.id;
    uploadedFilename = uploaded.fileName;

    // Verify persisted in PostgreSQL media table
    const dbRecord = await mediaRepo.findById(createdMediaId);
    expect(dbRecord).to.not.be.null();
    expect(dbRecord.fileName).to.equal(uploadedFilename);
  });

  it('GET /files/{filename} serves uploaded file with correct mime-type headers', async () => {
    const res = await client
      .get(`/files/${uploadedFilename}`)
      .expect(200);

    expect(res.headers['content-type']).to.containEql('video/mp4');
    expect(res.headers['accept-ranges']).to.equal('bytes');
  });

  it('GET /media/{id} retrieves media metadata by ID', async () => {
    const res = await client
      .get(`/media/${createdMediaId}`)
      .expect(200);

    expect(res.body.success).to.be.true();
    expect(res.body.data.id).to.equal(createdMediaId);
    expect(res.body.data.fileOriginalName).to.equal('sample_lecture.mp4');
  });

  it('GET /files/{filename} returns 404 for non-existent file', async () => {
    await client
      .get('/files/non_existent_file_9999.xyz')
      .expect(404);
  });
});
