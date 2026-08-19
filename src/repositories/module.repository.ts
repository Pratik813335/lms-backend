import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Course, Lesson, Module} from '../models';
import {CourseRepository} from './course.repository';
import {LessonRepository} from './lesson.repository';

export class ModuleRepository extends TimeStampRepositoryMixin<
  Module,
  typeof Module.prototype.id,
  Constructor<DefaultCrudRepository<Module, typeof Module.prototype.id>>
>(DefaultCrudRepository) {
  public readonly course: BelongsToAccessor<Course, typeof Module.prototype.id>;
  public readonly lessons: HasManyRepositoryFactory<Lesson, typeof Module.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
    @repository.getter('LessonRepository')
    protected lessonRepositoryGetter: Getter<LessonRepository>,
  ) {
    super(Module, dataSource);

    this.lessons = this.createHasManyRepositoryFactoryFor('lessons', lessonRepositoryGetter);
    this.registerInclusionResolver('lessons', this.lessons.inclusionResolver);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
