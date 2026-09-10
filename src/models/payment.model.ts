import {Entity, belongsTo, model, property} from '@loopback/repository';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      table: 'payments',
      schema: 'public',
    },
    indexes: {
      idxPaymentUser: {
        keys: {usersId: 1},
      },
      idxPaymentStatus: {
        keys: {status: 1},
      },
    },
  },
})
export class Payment extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {dataType: 'uuid'},
  })
  id?: string;

  @belongsTo(
    () => Users,
    {name: 'user'},
    {
      name: 'users_id',
      required: true,
      postgresql: {
        columnName: 'users_id',
        dataType: 'uuid',
      },
    },
  )
  usersId: string;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      dataType: 'double precision',
    },
  })
  amount: number;

  @property({
    type: 'string',
    default: 'USD',
  })
  currency?: string;

  @property({
    type: 'string',
    required: true,
    default: 'succeeded',
    postgresql: {dataType: 'varchar(30)'},
  })
  status: string; // 'succeeded' | 'pending' | 'failed' | 'refunded'

  @property({
    type: 'string',
    default: 'Standard Monthly',
  })
  planName?: string; // 'Basic Monthly' | 'Standard Monthly' | 'Premium Monthly' | 'Annual Tuition'

  @property({
    type: 'string',
    default: 'card',
  })
  paymentMethod?: string; // 'card' | 'stripe' | 'paypal' | 'offline_wire' | 'offline_check' | 'cash'

  @property({
    type: 'string',
  })
  transactionReference?: string;

  @property({
    type: 'string',
    postgresql: {dataType: 'text'},
  })
  notes?: string;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  paidAt?: Date;

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

  constructor(data?: Partial<Payment>) {
    super(data);
  }
}

export type PaymentWithRelations = Payment & {
  user?: Users;
};
