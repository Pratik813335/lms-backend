import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Media, MediaRelations} from '../models/media.model';

export class MediaRepository extends TimeStampRepositoryMixin<
  Media,
  typeof Media.prototype.id,
  Constructor<DefaultCrudRepository<Media, typeof Media.prototype.id, MediaRelations>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Media, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
