import {Constructor, Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyThroughRepositoryFactory,
  repository,
} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Roles, UserRoles, Users, UsersWithRelations} from '../models';
import {RolesRepository} from './roles.repository';
import {UserRolesRepository} from './user-roles.repository';

export class UsersRepository extends TimeStampRepositoryMixin<
  Users,
  typeof Users.prototype.id,
  Constructor<DefaultCrudRepository<Users, typeof Users.prototype.id, UsersWithRelations>>
>(DefaultCrudRepository) {
  public readonly roles: HasManyThroughRepositoryFactory<
    Roles,
    typeof Roles.prototype.id,
    UserRoles,
    typeof Users.prototype.id
  >;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('RolesRepository') protected rolesRepositoryGetter: Getter<RolesRepository>,
    @repository.getter('UserRolesRepository') protected userRolesRepositoryGetter: Getter<UserRolesRepository>,
  ) {
    super(Users, dataSource);

    this.roles = this.createHasManyThroughRepositoryFactoryFor('roles', rolesRepositoryGetter, userRolesRepositoryGetter);
    this.registerInclusionResolver('roles', this.roles.inclusionResolver);
  }
}
