import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Roles} from '../models';

export class RolesRepository extends TimeStampRepositoryMixin<
  Roles,
  typeof Roles.prototype.id,
  Constructor<DefaultCrudRepository<Roles, typeof Roles.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Roles, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
