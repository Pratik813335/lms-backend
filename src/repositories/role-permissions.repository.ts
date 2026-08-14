import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {RolePermissions} from '../models';

export class RolePermissionsRepository extends TimeStampRepositoryMixin<
  RolePermissions,
  typeof RolePermissions.prototype.id,
  Constructor<DefaultCrudRepository<RolePermissions, typeof RolePermissions.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(RolePermissions, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
