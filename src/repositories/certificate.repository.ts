import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Certificate, CertificateRelations, Course, Users} from '../models';
import {CourseRepository} from './course.repository';
import {UsersRepository} from './users.repository';

export class CertificateRepository extends TimeStampRepositoryMixin<
  Certificate,
  typeof Certificate.prototype.id,
  Constructor<DefaultCrudRepository<Certificate, typeof Certificate.prototype.id, CertificateRelations>>
>(DefaultCrudRepository) {
  public readonly users: BelongsToAccessor<Users, typeof Certificate.prototype.id>;
  public readonly course: BelongsToAccessor<Course, typeof Certificate.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
  ) {
    super(Certificate, dataSource);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
