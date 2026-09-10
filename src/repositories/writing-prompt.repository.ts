import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Subjects, WritingPrompt, WritingPromptRelations, WritingLabSubmission} from '../models';
import {SubjectsRepository} from './subjects.repository';
import {WritingLabSubmissionRepository} from './writing-lab-submission.repository';

export class WritingPromptRepository extends TimeStampRepositoryMixin<
  WritingPrompt,
  typeof WritingPrompt.prototype.id,
  Constructor<DefaultCrudRepository<WritingPrompt, typeof WritingPrompt.prototype.id, WritingPromptRelations>>
>(DefaultCrudRepository) {
  public readonly subject: BelongsToAccessor<Subjects, typeof WritingPrompt.prototype.id>;
  public readonly submissions: HasManyRepositoryFactory<WritingLabSubmission, typeof WritingPrompt.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('SubjectsRepository')
    protected subjectsRepositoryGetter: Getter<SubjectsRepository>,
    @repository.getter('WritingLabSubmissionRepository')
    protected writingLabSubmissionRepositoryGetter: Getter<WritingLabSubmissionRepository>,
  ) {
    super(WritingPrompt, dataSource);

    this.subject = this.createBelongsToAccessorFor('subject', subjectsRepositoryGetter);
    this.registerInclusionResolver('subject', this.subject.inclusionResolver);

    this.submissions = this.createHasManyRepositoryFactoryFor('submissions', writingLabSubmissionRepositoryGetter);
    this.registerInclusionResolver('submissions', this.submissions.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
