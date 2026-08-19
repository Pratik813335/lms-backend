import {Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {Course, CourseWithRelations, GradeLevels, Lesson, Module, Subjects, Users} from '../models';
import {GradeLevelsRepository} from './grade-levels.repository';
import {LessonRepository} from './lesson.repository';
import {ModuleRepository} from './module.repository';
import {SubjectsRepository} from './subjects.repository';
import {UsersRepository} from './users.repository';

export class CourseRepository extends TimeStampRepositoryMixin<
  Course,
  typeof Course.prototype.id,
  Constructor<DefaultCrudRepository<Course, typeof Course.prototype.id, CourseWithRelations>>
>(DefaultCrudRepository) {
  public readonly modules: HasManyRepositoryFactory<Module, typeof Course.prototype.id>;
  public readonly lessons: HasManyRepositoryFactory<Lesson, typeof Course.prototype.id>;
  public readonly subject: BelongsToAccessor<Subjects, typeof Course.prototype.id>;
  public readonly gradeLevel: BelongsToAccessor<GradeLevels, typeof Course.prototype.id>;
  public readonly instructor: BelongsToAccessor<Users, typeof Course.prototype.id>;
  public readonly author: BelongsToAccessor<Users, typeof Course.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('ModuleRepository')
    protected moduleRepositoryGetter: Getter<ModuleRepository>,
    @repository.getter('LessonRepository')
    protected lessonRepositoryGetter: Getter<LessonRepository>,
    @repository.getter('SubjectsRepository')
    protected subjectsRepositoryGetter: Getter<SubjectsRepository>,
    @repository.getter('GradeLevelsRepository')
    protected gradeLevelsRepositoryGetter: Getter<GradeLevelsRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Course, dataSource);

    this.lessons = this.createHasManyRepositoryFactoryFor('lessons', lessonRepositoryGetter);
    this.registerInclusionResolver('lessons', this.lessons.inclusionResolver);

    this.modules = this.createHasManyRepositoryFactoryFor('modules', moduleRepositoryGetter);
    this.registerInclusionResolver('modules', this.modules.inclusionResolver);

    this.subject = this.createBelongsToAccessorFor('subject', subjectsRepositoryGetter);
    this.registerInclusionResolver('subject', this.subject.inclusionResolver);

    this.gradeLevel = this.createBelongsToAccessorFor('gradeLevel', gradeLevelsRepositoryGetter);
    this.registerInclusionResolver('gradeLevel', this.gradeLevel.inclusionResolver);

    this.instructor = this.createBelongsToAccessorFor('instructor', usersRepositoryGetter);
    this.registerInclusionResolver('instructor', this.instructor.inclusionResolver);

    this.author = this.createBelongsToAccessorFor('author', usersRepositoryGetter);
    this.registerInclusionResolver('author', this.author.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
