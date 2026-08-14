import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {ComplianceStatuses} from '../models';

export class ComplianceStatusesRepository extends TimeStampRepositoryMixin<
  ComplianceStatuses,
  typeof ComplianceStatuses.prototype.id,
  Constructor<DefaultCrudRepository<ComplianceStatuses, typeof ComplianceStatuses.prototype.id>>
>(DefaultCrudRepository) {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(ComplianceStatuses, dataSource);
  }
}
type Constructor<T> = new (...args: any[]) => T;
