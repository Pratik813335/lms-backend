import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  HttpErrors,
  oas,
  param,
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mime from 'mime-types';
import {FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY} from '../keys';
import {MediaRepository} from '../repositories';
import {FileUploadHandler} from '../types';
import {formatSuccessResponse} from '../utils';

/**
 * Controller to handle file & media uploads (videos, images, PDFs) and streaming
 */
export class FileUploadController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(STORAGE_DIRECTORY) private storageDirectory: string,
    @repository(MediaRepository) private mediaRepository: MediaRepository,
  ) {}

  slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async uploadToFolder(
    processId: string,
    request: Request,
    response: Response,
  ): Promise<{files: any[]; fields: any}> {
    const slug = processId ? this.slugify(processId) : '';
    const uploadDir = path.resolve(this.storageDirectory, slug);

    if (!uploadDir.startsWith(this.storageDirectory)) {
      throw new HttpErrors.BadRequest('Invalid folder path');
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {recursive: true});
    }

    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: (req: Request, file: Express.Multer.File, cb: Function) => {
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${timestamp}_${safeName}`);
      },
    });

    const uploadMiddleware = multer({storage}).any();

    return new Promise<{files: any[]; fields: any}>((resolve, reject) => {
      uploadMiddleware(request, response, (err: unknown) => {
        if (err) {
          reject(new HttpErrors.InternalServerError('Upload failed'));
        } else {
          resolve(this.getFilesAndFields(request, slug));
        }
      });
    });
  }

  private getFilesAndFields(request: Request, slug: string) {
    const uploadedFiles = request.files as Express.Multer.File[];
    const baseUrl = process.env.API_ENDPOINT || `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 3000}`;

    const mapper = (f: Express.Multer.File) => {
      const fileSubpath = slug ? `${slug}/${f.filename}` : f.filename;
      return {
        fieldname: f.fieldname,
        fileName: f.filename,
        fileOriginalName: f.originalname,
        fileUrl: `${baseUrl}/files/${fileSubpath}`,
        fileLocation: f.path,
        fileType: f.mimetype || mime.lookup(f.originalname) || 'application/octet-stream',
        fileSize: f.size,
      };
    };

    let files: any[] = [];
    if (Array.isArray(uploadedFiles)) {
      files = uploadedFiles.map(mapper);
    } else if (uploadedFiles && typeof uploadedFiles === 'object') {
      for (const key of Object.keys(uploadedFiles)) {
        const fileArray = (uploadedFiles as any)[key];
        if (Array.isArray(fileArray)) {
          files.push(...fileArray.map(mapper));
        }
      }
    }

    return {
      files,
      fields: request.body,
    };
  }

  @post('/files')
  @oas.response(200, {
    description: 'Upload files and register media entities in PostgreSQL',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {type: 'boolean'},
            data: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {type: 'string'},
                      fileUrl: {type: 'string'},
                      fileName: {type: 'string'},
                      fileOriginalName: {type: 'string'},
                      fileType: {type: 'string'},
                      fileSize: {type: 'number'},
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async uploadToRoot(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {
    const result = await this.uploadToFolder('', request, response);
    const filesWithIds = [];

    for (const file of result.files) {
      const saved = await this.mediaRepository.create({
        fileOriginalName: file.fileOriginalName,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileLocation: file.fileLocation,
        fileType: file.fileType,
        fileSize: file.fileSize,
        isUsed: false,
        isActive: true,
        isDeleted: false,
      });

      filesWithIds.push({
        id: saved.id,
        fileUrl: saved.fileUrl,
        fileName: saved.fileName,
        fileOriginalName: saved.fileOriginalName,
        fileType: saved.fileType,
        fileSize: saved.fileSize,
      });
    }

    return formatSuccessResponse(
      {
        files: filesWithIds,
        fields: result.fields,
      },
      'Files uploaded and registered successfully',
    );
  }

  @get('/files/{filename}')
  @oas.response.file()
  async downloadFile(
    @param.path.string('filename') filename: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Response> {
    const safeFilename = path.basename(filename);
    const filePath = path.resolve(this.storageDirectory, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new HttpErrors.NotFound(`File '${filename}' not found`);
    }

    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Accept-Ranges', 'bytes');
    response.status(200).send(data);
    return response;
  }

  @get('/media/{id}')
  async getMediaById(@param.path.string('id') id: string) {
    const media = await this.mediaRepository.findOne({
      where: {id, isDeleted: false},
    });
    if (!media) {
      throw new HttpErrors.NotFound(`Media with id '${id}' not found`);
    }
    return formatSuccessResponse(media, 'Media metadata retrieved successfully');
  }
}
