import {BindingKey} from '@loopback/core';
import type {EmailService} from './services/email.service';
import type {FileUploadHandler} from './types';

export namespace EmailManagerBindings {
  export const SEND_MAIL = BindingKey.create<EmailService>(
    'services.email.send',
  );
}

export const FILE_UPLOAD_SERVICE = BindingKey.create<FileUploadHandler>(
  'services.FileUploadService',
);

export const STORAGE_DIRECTORY = BindingKey.create<string>(
  'storage.directory',
);
