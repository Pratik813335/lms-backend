import {injectable, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import crypto from 'crypto';
import {
  CertificateRepository,
  CourseRepository,
  EnrollmentRepository,
  UsersRepository,
} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class CertificateService {
  constructor(
    @repository(CertificateRepository)
    public certificateRepo: CertificateRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
  ) {}

  /**
   * Issue a verified certificate for a completed course
   */
  async issueCertificateForCourse(userId: string, courseId: string) {
    const user = await this.usersRepo.findOne({where: {id: userId}});
    if (!user) {
      throw new HttpErrors.NotFound(`User with ID '${userId}' not found.`);
    }

    const course = await this.courseRepo.findOne({
      where: {id: courseId, isActive: true, isDeleted: false},
    });
    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${courseId}' not found.`);
    }

    // Verify enrollment and 100% progress
    const enrollment = await this.enrollmentRepo.findOne({
      where: {usersId: userId, courseId, isDeleted: false},
    });

    if (!enrollment) {
      throw new HttpErrors.BadRequest('Student is not enrolled in this course.');
    }

    const progress = enrollment.progressRate ?? 0;
    if (progress < 100) {
      throw new HttpErrors.BadRequest(
        `Course completion is at ${progress}%. A certificate can only be issued upon 100% completion.`,
      );
    }

    // Check if certificate already exists
    const existing = await this.certificateRepo.findOne({
      where: {usersId: userId, courseId, isDeleted: false},
    });
    if (existing) {
      return existing;
    }

    // Generate certificate number & verification hash
    const certNum = `LP-CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const hashData = `${userId}:${courseId}:${certNum}:${new Date().toISOString()}`;
    const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

    const certificate = await this.certificateRepo.create({
      usersId: userId,
      courseId,
      certificateNumber: certNum,
      studentName: user.fullName || 'Student',
      courseName: course.title,
      credits: 1.0,
      accreditationBody: 'LucidPrep Accredited Academy',
      status: 'issued',
      type: 'course_completion',
      issueDate: new Date(),
      verificationHash,
    });

    return certificate;
  }

  /**
   * Get all verified certificates for a student
   */
  async getStudentCertificates(userId: string) {
    return this.certificateRepo.find({
      where: {usersId: userId, isDeleted: false},
      include: [
        {
          relation: 'course',
          scope: {fields: {id: true, title: true, subjectId: true}},
        },
      ],
      order: ['issueDate DESC'],
    });
  }

  /**
   * Verify certificate by hash
   */
  async verifyCertificate(hash: string) {
    const cert = await this.certificateRepo.findOne({
      where: {verificationHash: hash, isDeleted: false},
    });
    if (!cert) {
      throw new HttpErrors.NotFound('Certificate verification hash is invalid or expired.');
    }
    return {
      isValid: true,
      certificateNumber: cert.certificateNumber,
      studentName: cert.studentName,
      courseName: cert.courseName,
      credits: cert.credits,
      issueDate: cert.issueDate,
      accreditationBody: cert.accreditationBody,
    };
  }
}
