import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins';
import {
  ContentAsset,
  ContentAssetRelations,
  Course,
  GradeLevels,
  Subjects,
  Users,
} from '../models';
import {CourseRepository} from './course.repository';
import {GradeLevelsRepository} from './grade-levels.repository';
import {SubjectsRepository} from './subjects.repository';
import {UsersRepository} from './users.repository';

export class ContentAssetRepository extends TimeStampRepositoryMixin<
  ContentAsset,
  typeof ContentAsset.prototype.id,
  Constructor<
    DefaultCrudRepository<ContentAsset, typeof ContentAsset.prototype.id, ContentAssetRelations>
  >
>(DefaultCrudRepository) {
  public readonly subject: BelongsToAccessor<Subjects, typeof ContentAsset.prototype.id>;
  public readonly gradeLevel: BelongsToAccessor<GradeLevels, typeof ContentAsset.prototype.id>;
  public readonly course: BelongsToAccessor<Course, typeof ContentAsset.prototype.id>;
  public readonly createdBy: BelongsToAccessor<Users, typeof ContentAsset.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('SubjectsRepository')
    protected subjectsRepositoryGetter: Getter<SubjectsRepository>,
    @repository.getter('GradeLevelsRepository')
    protected gradeLevelsRepositoryGetter: Getter<GradeLevelsRepository>,
    @repository.getter('CourseRepository')
    protected courseRepositoryGetter: Getter<CourseRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(ContentAsset, dataSource);

    this.subject = this.createBelongsToAccessorFor('subject', subjectsRepositoryGetter);
    this.registerInclusionResolver('subject', this.subject.inclusionResolver);

    this.gradeLevel = this.createBelongsToAccessorFor('gradeLevel', gradeLevelsRepositoryGetter);
    this.registerInclusionResolver('gradeLevel', this.gradeLevel.inclusionResolver);

    this.course = this.createBelongsToAccessorFor('course', courseRepositoryGetter);
    this.registerInclusionResolver('course', this.course.inclusionResolver);

    this.createdBy = this.createBelongsToAccessorFor('createdBy', usersRepositoryGetter);
    this.registerInclusionResolver('createdBy', this.createdBy.inclusionResolver);
  }
}
type Constructor<T> = new (...args: any[]) => T;
