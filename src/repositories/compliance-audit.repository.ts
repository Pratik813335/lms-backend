import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {ComplianceAudit, ComplianceAuditRelations, Course, Users} from '../models';
import {CourseRepository} from './course.repository';
import {UsersRepository} from './users.repository';

export class ComplianceAuditRepository extends TimeStampRepositoryMixin<
  ComplianceAudit,
  typeof ComplianceAudit.prototype.id,
  Constructor<DefaultCrudRepository<ComplianceAudit, typeof ComplianceAudit.prototype.id, ComplianceAuditRelations>>
>(DefaultCrudRepository) {
  public readonly course: BelongsToAccessor<Course, typeof ComplianceAudit.prototype.id>;
  public readonly auditor: BelongsToAccessor<Users, typeof ComplianceAudit.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(ComplianceAudit, dataSource);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);

    this.auditor = this.createBelongsToAccessorFor('auditor', usersRepositoryGetter);
    this.registerInclusionResolver('auditor', this.auditor.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
