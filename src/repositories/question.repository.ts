import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Assessment, Question, QuestionRelations} from '../models';
import {AssessmentRepository} from './assessment.repository';

export class QuestionRepository extends TimeStampRepositoryMixin<
  Question,
  typeof Question.prototype.id,
  Constructor<DefaultCrudRepository<Question, typeof Question.prototype.id, QuestionRelations>>
>(DefaultCrudRepository) {
  public readonly assessment: BelongsToAccessor<Assessment, typeof Question.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('AssessmentRepository')
    protected assessmentRepositoryGetter: Getter<AssessmentRepository>,
  ) {
    super(Question, dataSource);

    this.assessment = this.createBelongsToAccessorFor('assessment', assessmentRepositoryGetter);
    this.registerInclusionResolver('assessment', this.assessment.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
