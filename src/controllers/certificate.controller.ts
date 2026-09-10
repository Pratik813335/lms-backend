import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param, post} from '@loopback/rest';
import {SecurityBindings} from '@loopback/security';
import {CertificateService} from '../services';
import {LmsUserProfile} from '../types';
import {formatSuccessResponse} from '../utils';

export class CertificateController {
  constructor(
    @inject('services.certificate')
    public certificateService: CertificateService,
  ) {}

  /**
   * Get all verified certificates for current authenticated student
   */
  @authenticate('jwt')
  @get('/student/me/certificates')
  async getMyCertificates(@inject(SecurityBindings.USER) currentUser: LmsUserProfile) {
    const certs = await this.certificateService.getStudentCertificates(currentUser.id);
    return formatSuccessResponse(certs, 'Student certificates retrieved successfully');
  }

  /**
   * Generate/issue certificate on 100% course completion
   */
  @authenticate('jwt')
  @post('/courses/{id}/certificate')
  async issueCourseCertificate(
    @inject(SecurityBindings.USER) currentUser: LmsUserProfile,
    @param.path.string('id') courseId: string,
  ) {
    const cert = await this.certificateService.issueCertificateForCourse(currentUser.id, courseId);
    return formatSuccessResponse(cert, 'Certificate issued successfully');
  }

  /**
   * Public endpoint to verify certificate authenticity via tamper-proof hash
   */
  @get('/certificates/verify/{hash}')
  async verifyCertificate(@param.path.string('hash') hash: string) {
    const verification = await this.certificateService.verifyCertificate(hash);
    return formatSuccessResponse(verification, 'Certificate verified successfully');
  }
}
