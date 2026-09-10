import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Assessment, AssessmentSubmission, AssessmentSubmissionRelations, Users} from '../models';
import {AssessmentRepository} from './assessment.repository';
import {UsersRepository} from './users.repository';

export class AssessmentSubmissionRepository extends TimeStampRepositoryMixin<
  AssessmentSubmission,
  typeof AssessmentSubmission.prototype.id,
  Constructor<DefaultCrudRepository<AssessmentSubmission, typeof AssessmentSubmission.prototype.id, AssessmentSubmissionRelations>>
>(DefaultCrudRepository) {
  public readonly users: BelongsToAccessor<Users, typeof AssessmentSubmission.prototype.id>;
  public readonly assessment: BelongsToAccessor<Assessment, typeof AssessmentSubmission.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('AssessmentRepository')
    protected assessmentRepositoryGetter: Getter<AssessmentRepository>,
  ) {
    super(AssessmentSubmission, dataSource);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);

    this.assessment = this.createBelongsToAccessorFor('assessment', assessmentRepositoryGetter);
    this.registerInclusionResolver('assessment', this.assessment.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
