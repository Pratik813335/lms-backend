import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {GradeLevels} from '../models';

export class GradeLevelsRepository extends TimeStampRepositoryMixin<
  GradeLevels,
  typeof GradeLevels.prototype.id,
  Constructor<DefaultCrudRepository<GradeLevels, typeof GradeLevels.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(GradeLevels, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
