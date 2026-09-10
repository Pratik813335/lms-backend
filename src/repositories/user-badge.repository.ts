import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Badge, UserBadge, UserBadgeRelations, Users} from '../models';
import {BadgeRepository} from './badge.repository';
import {UsersRepository} from './users.repository';

export class UserBadgeRepository extends TimeStampRepositoryMixin<
  UserBadge,
  typeof UserBadge.prototype.id,
  Constructor<DefaultCrudRepository<UserBadge, typeof UserBadge.prototype.id, UserBadgeRelations>>
>(DefaultCrudRepository) {
  public readonly users: BelongsToAccessor<Users, typeof UserBadge.prototype.id>;
  public readonly badge: BelongsToAccessor<Badge, typeof UserBadge.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('BadgeRepository')
    protected badgeRepositoryGetter: Getter<BadgeRepository>,
  ) {
    super(UserBadge, dataSource);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);

    this.badge = this.createBelongsToAccessorFor('badge', badgeRepositoryGetter);
    this.registerInclusionResolver('badge', this.badge.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
