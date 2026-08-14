import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Tiers} from '../models';

export class TiersRepository extends TimeStampRepositoryMixin<
  Tiers,
  typeof Tiers.prototype.id,
  Constructor<DefaultCrudRepository<Tiers, typeof Tiers.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Tiers, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
