import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {UserRoles} from '../models';

export class UserRolesRepository extends TimeStampRepositoryMixin<
  UserRoles,
  typeof UserRoles.prototype.id,
  Constructor<DefaultCrudRepository<UserRoles, typeof UserRoles.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(UserRoles, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
