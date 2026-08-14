import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Subjects} from '../models';

export class SubjectsRepository extends TimeStampRepositoryMixin<
  Subjects,
  typeof Subjects.prototype.id,
  Constructor<DefaultCrudRepository<Subjects, typeof Subjects.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Subjects, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
