import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Badge, BadgeRelations, UserBadge} from '../models';
import {UserBadgeRepository} from './user-badge.repository';

export class BadgeRepository extends TimeStampRepositoryMixin<
  Badge,
  typeof Badge.prototype.id,
  Constructor<DefaultCrudRepository<Badge, typeof Badge.prototype.id, BadgeRelations>>
>(DefaultCrudRepository) {
  public readonly userBadges: HasManyRepositoryFactory<UserBadge, typeof Badge.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserBadgeRepository')
    protected userBadgeRepositoryGetter: Getter<UserBadgeRepository>,
  ) {
    super(Badge, dataSource);

    this.userBadges = this.createHasManyRepositoryFactoryFor('userBadges', userBadgeRepositoryGetter);
    this.registerInclusionResolver('userBadges', this.userBadges.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
