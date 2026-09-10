import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Assessment, AssessmentRelations, Course, Module, Question, AssessmentSubmission} from '../models';
import {CourseRepository} from './course.repository';
import {ModuleRepository} from './module.repository';
import {QuestionRepository} from './question.repository';
import {AssessmentSubmissionRepository} from './assessment-submission.repository';

export class AssessmentRepository extends TimeStampRepositoryMixin<
  Assessment,
  typeof Assessment.prototype.id,
  Constructor<DefaultCrudRepository<Assessment, typeof Assessment.prototype.id, AssessmentRelations>>
>(DefaultCrudRepository) {
  public readonly course: BelongsToAccessor<Course, typeof Assessment.prototype.id>;
  public readonly module: BelongsToAccessor<Module, typeof Assessment.prototype.id>;
  public readonly questions: HasManyRepositoryFactory<Question, typeof Assessment.prototype.id>;
  public readonly submissions: HasManyRepositoryFactory<AssessmentSubmission, typeof Assessment.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
    @repository.getter('ModuleRepository')
    protected moduleRepositoryGetter: Getter<ModuleRepository>,
    @repository.getter('QuestionRepository')
    protected questionRepositoryGetter: Getter<QuestionRepository>,
    @repository.getter('AssessmentSubmissionRepository')
    protected assessmentSubmissionRepositoryGetter: Getter<AssessmentSubmissionRepository>,
  ) {
    super(Assessment, dataSource);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);

    this.module = this.createBelongsToAccessorFor('module', moduleRepositoryGetter);
    this.registerInclusionResolver('module', this.module.inclusionResolver);

    this.questions = this.createHasManyRepositoryFactoryFor('questions', questionRepositoryGetter);
    this.registerInclusionResolver('questions', this.questions.inclusionResolver);

    this.submissions = this.createHasManyRepositoryFactoryFor('submissions', assessmentSubmissionRepositoryGetter);
    this.registerInclusionResolver('submissions', this.submissions.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
