import {injectable, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  ComplianceAuditRepository,
  ComplianceStatusesRepository,
  CourseRepository,
  UsersRepository,
} from '../repositories';

export interface AuditCoursePayload {
  courseId: string;
  ncaaApproved?: boolean;
  syllabusApproved?: boolean;
  academicIntegrityScore?: number;
  status?: string;
  notes?: string;
}

@injectable({scope: BindingScope.TRANSIENT})
export class ComplianceService {
  constructor(
    @repository(ComplianceAuditRepository)
    public complianceRepo: ComplianceAuditRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(ComplianceStatusesRepository)
    public complianceStatusesRepo: ComplianceStatusesRepository,
  ) {}

  /**
   * Get compliance audits for courses
   */
  async getAudits(courseId?: string) {
    const filter: any = {where: {isDeleted: false}};
    if (courseId) {
      filter.where.courseId = courseId;
    }
    return this.complianceRepo.find({
      ...filter,
      include: [
        {relation: 'course', scope: {fields: {id: true, title: true, subjectId: true, ncaaApproved: true}}},
        {relation: 'auditor', scope: {fields: {id: true, fullName: true, email: true}}},
      ],
      order: ['auditedAt DESC'],
    });
  }

  /**
   * Create or update course compliance audit
   */
  async auditCourse(auditorId: string, payload: AuditCoursePayload) {
    const course = await this.courseRepo.findOne({
      where: {id: payload.courseId, isDeleted: false},
    });

    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${payload.courseId}' not found.`);
    }

    if (payload.status) {
      const statusMaster = await this.complianceStatusesRepo.findOne({
        where: {value: payload.status, isDeleted: false},
      });
      if (!statusMaster) {
        throw new HttpErrors.BadRequest(`Invalid compliance status '${payload.status}'.`);
      }
    }

    const audit = await this.complianceRepo.create({
      courseId: payload.courseId,
      auditorId,
      ncaaApproved: payload.ncaaApproved !== undefined ? payload.ncaaApproved : true,
      syllabusApproved: payload.syllabusApproved !== undefined ? payload.syllabusApproved : true,
      academicIntegrityScore: payload.academicIntegrityScore !== undefined ? payload.academicIntegrityScore : 100.0,
      status: payload.status || 'approved',
      notes: payload.notes,
      auditedAt: new Date(),
    });

    // Update course NCAA flag if audited
    if (payload.ncaaApproved !== undefined) {
      await this.courseRepo.updateById(payload.courseId, {
        ncaaApproved: payload.ncaaApproved,
      });
    }

    return audit;
  }
}
