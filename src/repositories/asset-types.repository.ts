import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {AssetTypes} from '../models';

export class AssetTypesRepository extends TimeStampRepositoryMixin<
  AssetTypes,
  typeof AssetTypes.prototype.id,
  Constructor<DefaultCrudRepository<AssetTypes, typeof AssetTypes.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(AssetTypes, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
