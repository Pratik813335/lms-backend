import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      table: 'otp',
      schema: 'public',
    },
  },
})
export class Otp extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id?: string;

  @property({
    type: 'number',
    default: 1, // 1 => Email, 0 => Phone
  })
  type?: number;

  @property({
    type: 'string',
    required: true,
  })
  identifier: string;

  @property({
    type: 'string',
    required: true,
  })
  otp: string;

  @property({
    type: 'number',
    default: 0,
  })
  attempts?: number;

  @property({
    type: 'date',
    required: true,
  })
  expiresAt: Date;

  @property({
    type: 'boolean',
    default: false,
  })
  isUsed?: boolean;

  @property({
    type: 'boolean',
    default: true,
  })
  isActive?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted?: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt?: Date;

  constructor(data?: Partial<Otp>) {
    super(data);
  }
}

export type OtpWithRelations = Otp;
