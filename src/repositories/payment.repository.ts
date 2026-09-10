import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Payment, PaymentWithRelations, Users} from '../models';
import {UsersRepository} from './users.repository';

export class PaymentRepository extends TimeStampRepositoryMixin<
  Payment,
  typeof Payment.prototype.id,
  Constructor<DefaultCrudRepository<Payment, typeof Payment.prototype.id, PaymentWithRelations>>
>(DefaultCrudRepository) {
  public readonly user: BelongsToAccessor<Users, typeof Payment.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Payment, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
