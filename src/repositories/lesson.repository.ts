import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Course, Lesson, LessonRelations, Media, Module} from '../models';
import {CourseRepository} from './course.repository';
import {MediaRepository} from './media.repository';
import {ModuleRepository} from './module.repository';

export class LessonRepository extends TimeStampRepositoryMixin<
  Lesson,
  typeof Lesson.prototype.id,
  Constructor<DefaultCrudRepository<Lesson, typeof Lesson.prototype.id, LessonRelations>>
>(DefaultCrudRepository) {
  public readonly module: BelongsToAccessor<Module, typeof Lesson.prototype.id>;
  public readonly course: BelongsToAccessor<Course, typeof Lesson.prototype.id>;
  public readonly media: BelongsToAccessor<Media, typeof Lesson.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('ModuleRepository')
    protected moduleRepositoryGetter: Getter<ModuleRepository>,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
    @repository.getter('MediaRepository')
    protected mediaRepositoryGetter: Getter<MediaRepository>,
  ) {
    super(Lesson, dataSource);

    this.media = this.createBelongsToAccessorFor('media', mediaRepositoryGetter);
    this.registerInclusionResolver('media', this.media.inclusionResolver);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);

    this.module = this.createBelongsToAccessorFor('module', moduleRepositoryGetter);
    this.registerInclusionResolver('module', this.module.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
