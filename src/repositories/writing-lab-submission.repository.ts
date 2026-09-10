import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Media, Users, WritingLabSubmission, WritingLabSubmissionRelations, WritingPrompt} from '../models';
import {MediaRepository} from './media.repository';
import {UsersRepository} from './users.repository';
import {WritingPromptRepository} from './writing-prompt.repository';

export class WritingLabSubmissionRepository extends TimeStampRepositoryMixin<
  WritingLabSubmission,
  typeof WritingLabSubmission.prototype.id,
  Constructor<DefaultCrudRepository<WritingLabSubmission, typeof WritingLabSubmission.prototype.id, WritingLabSubmissionRelations>>
>(DefaultCrudRepository) {
  public readonly users: BelongsToAccessor<Users, typeof WritingLabSubmission.prototype.id>;
  public readonly prompt: BelongsToAccessor<WritingPrompt, typeof WritingLabSubmission.prototype.id>;
  public readonly attachmentMedia: BelongsToAccessor<Media, typeof WritingLabSubmission.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('WritingPromptRepository')
    protected writingPromptRepositoryGetter: Getter<WritingPromptRepository>,
    @repository.getter('MediaRepository')
    protected mediaRepositoryGetter: Getter<MediaRepository>,
  ) {
    super(WritingLabSubmission, dataSource);

    this.users = this.createBelongsToAccessorFor('users', usersRepositoryGetter);
    this.registerInclusionResolver('users', this.users.inclusionResolver);

    this.prompt = this.createBelongsToAccessorFor('prompt', writingPromptRepositoryGetter);
    this.registerInclusionResolver('prompt', this.prompt.inclusionResolver);

    this.attachmentMedia = this.createBelongsToAccessorFor('attachmentMedia', mediaRepositoryGetter);
    this.registerInclusionResolver('attachmentMedia', this.attachmentMedia.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
