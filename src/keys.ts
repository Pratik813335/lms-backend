import {BindingKey} from '@loopback/core';
import type {EmailService} from './services/email.service';

export namespace EmailManagerBindings {
  export const SEND_MAIL = BindingKey.create<EmailService>(
    'services.email.send',
  );
}
