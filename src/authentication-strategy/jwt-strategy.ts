import {AuthenticationStrategy} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, Request} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {UsersRepository} from '../repositories';
import {JWTService} from '../services/jwt-service';

export class JWTStrategy implements AuthenticationStrategy {
  name = 'jwt';

  constructor(
    @inject('service.jwt.service')
    public jwtService: JWTService,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
  ) {}

  async authenticate(request: Request): Promise<UserProfile | undefined> {
    const token = this.extractCredentials(request);
    const userProfile = await this.jwtService.verifyToken(token);

    // BUG-014 / BUG-015: reject soft-deleted or inactive accounts even if JWT is still valid
    const userId = String(
      userProfile[securityId] || (userProfile as {id?: string}).id || '',
    );
    if (!userId) {
      throw new HttpErrors.Unauthorized('Invalid token subject');
    }

    const user = await this.usersRepo.findOne({where: {id: userId}});
    if (!user || user.isDeleted || user.isActive === false) {
      throw new HttpErrors.Unauthorized(
        'User account is inactive or has been deleted',
      );
    }

    return userProfile;
  }

  extractCredentials(request: Request): string {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new HttpErrors.Unauthorized('Authorization header is missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new HttpErrors.BadRequest(
        'Authorization header must be of type Bearer',
      );
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      throw new HttpErrors.BadRequest(
        `Authorization header must be in the format: 'Bearer <token>'`,
      );
    }

    return parts[1];
  }
}
