import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Course, Lesson, Module} from '../models';
import {LessonRepository} from './lesson.repository';
import {ModuleRepository} from './module.repository';

export class CourseRepository extends TimeStampRepositoryMixin<
  Course,
  typeof Course.prototype.id,
  Constructor<DefaultCrudRepository<Course, typeof Course.prototype.id>>
>(DefaultCrudRepository) {
  public readonly modules: HasManyRepositoryFactory<Module, typeof Course.prototype.id>;
  public readonly lessons: HasManyRepositoryFactory<Lesson, typeof Course.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('ModuleRepository')
    protected moduleRepositoryGetter: Getter<ModuleRepository>,
    @repository.getter('LessonRepository')
    protected lessonRepositoryGetter: Getter<LessonRepository>,
  ) {
    super(Course, dataSource);

    this.lessons = this.createHasManyRepositoryFactoryFor('lessons', lessonRepositoryGetter);
    this.registerInclusionResolver('lessons', this.lessons.inclusionResolver);

    this.modules = this.createHasManyRepositoryFactoryFor('modules', moduleRepositoryGetter);
    this.registerInclusionResolver('modules', this.modules.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
