import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Permissions} from '../models';

export class PermissionsRepository extends TimeStampRepositoryMixin<
  Permissions,
  typeof Permissions.prototype.id,
  Constructor<DefaultCrudRepository<Permissions, typeof Permissions.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Permissions, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
