import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Course, Enrollment, Users} from '../models';
import {CourseRepository} from './course.repository';
import {UsersRepository} from './users.repository';

export class EnrollmentRepository extends TimeStampRepositoryMixin<
  Enrollment,
  typeof Enrollment.prototype.id,
  Constructor<DefaultCrudRepository<Enrollment, typeof Enrollment.prototype.id>>
>(DefaultCrudRepository) {
  public readonly user: BelongsToAccessor<Users, typeof Enrollment.prototype.id>;
  public readonly course: BelongsToAccessor<Course, typeof Enrollment.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
  ) {
    super(Enrollment, dataSource);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
