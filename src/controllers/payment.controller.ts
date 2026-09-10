import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param, post, requestBody} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {PaymentService} from '../services/payment.service';
import {RbacService} from '../services/rbac.service';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class PaymentController {
  constructor(
    @inject('services.payment')
    public paymentService: PaymentService,
    @inject('services.rbac')
    public rbacService: RbacService,
  ) {}

  /**
   * Get paginated list of tuition payments and transactions
   */
  @authenticate('jwt')
  @get('/operations/payments')
  async getPayments(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.query.number('page') page?: number,
    @param.query.number('limit') limit?: number,
    @param.query.string('status') status?: string,
    @param.query.string('search') search?: string,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'operations']);
    const result = await this.paymentService.getPayments({page, limit, status, search});
    return formatSuccessResponse(result, 'Payments list retrieved successfully');
  }

  /**
   * Get Stripe-style Revenue & KPI Summary
   */
  @authenticate('jwt')
  @get('/operations/payments/summary')
  async getPaymentSummary(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'operations']);
    const summary = await this.paymentService.getSummaryMetrics();
    return formatSuccessResponse(summary, 'Payment revenue summary retrieved successfully');
  }

  /**
   * Record manual offline tuition payment (Wire, Check, Cash)
   */
  @authenticate('jwt')
  @post('/operations/payments/record-offline')
  async recordOfflinePayment(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['usersId', 'amount'],
            properties: {
              usersId: {type: 'string'},
              amount: {type: 'number'},
              planName: {type: 'string'},
              paymentMethod: {type: 'string'},
              transactionReference: {type: 'string'},
              notes: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      usersId: string;
      amount: number;
      planName?: string;
      paymentMethod?: string;
      transactionReference?: string;
      notes?: string;
    },
  ) {
    this.rbacService.validateRole(currentUser as any, ['admin', 'operations']);
    const payment = await this.paymentService.recordOfflinePayment(body);
    return formatSuccessResponse(payment, 'Offline payment recorded successfully');
  }
}
