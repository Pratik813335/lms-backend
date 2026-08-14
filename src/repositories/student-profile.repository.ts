import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {StudentProfile, StudentProfileWithRelations, Users} from '../models';
import {UsersRepository} from './users.repository';

export class StudentProfileRepository extends TimeStampRepositoryMixin<
  StudentProfile,
  typeof StudentProfile.prototype.id,
  Constructor<DefaultCrudRepository<StudentProfile, typeof StudentProfile.prototype.id, StudentProfileWithRelations>>
>(DefaultCrudRepository) {
  public readonly users: BelongsToAccessor<Users, typeof StudentProfile.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(StudentProfile, dataSource);
    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }
}
