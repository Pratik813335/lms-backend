import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Course, Lesson, LessonProgress, Users} from '../models';
import {CourseRepository} from './course.repository';
import {LessonRepository} from './lesson.repository';
import {UsersRepository} from './users.repository';

export class LessonProgressRepository extends TimeStampRepositoryMixin<
  LessonProgress,
  typeof LessonProgress.prototype.id,
  Constructor<DefaultCrudRepository<LessonProgress, typeof LessonProgress.prototype.id>>
>(DefaultCrudRepository) {
  public readonly user: BelongsToAccessor<Users, typeof LessonProgress.prototype.id>;
  public readonly lesson: BelongsToAccessor<Lesson, typeof LessonProgress.prototype.id>;
  public readonly course: BelongsToAccessor<Course, typeof LessonProgress.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('LessonRepository')
    protected lessonRepositoryGetter: Getter<LessonRepository>,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
  ) {
    super(LessonProgress, dataSource);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);

    this.lesson = this.createBelongsToAccessorFor('lesson', lessonRepositoryGetter);
    this.registerInclusionResolver('lesson', this.lesson.inclusionResolver);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
