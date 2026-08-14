import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Otp} from '../models';

export class OtpRepository extends TimeStampRepositoryMixin<
  Otp,
  typeof Otp.prototype.id,
  Constructor<DefaultCrudRepository<Otp, typeof Otp.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Otp, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
