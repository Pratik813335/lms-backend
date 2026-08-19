import {inject, injectable, BindingScope} from '@loopback/core';
import {TokenService} from '@loopback/authentication';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import * as jwt from 'jsonwebtoken';
import {LmsUserProfile} from '../types';

@injectable({scope: BindingScope.SINGLETON})
export class JWTService implements TokenService {
  constructor(
    @inject('jwt.secret') private jwtSecret: string,
    @inject('jwt.expiresIn') private jwtExpiresIn: string,
  ) {}

  private async signJwt(
    payload: object,
    expiresIn: jwt.SignOptions['expiresIn'],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        this.jwtSecret,
        {expiresIn},
        (err: any, token: string | undefined) => {
          if (err || !token) {
            return reject(err ?? new Error('Token generation failed'));
          }
          resolve(token);
        },
      );
    });
  }

  private async verifyJwt(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, (err: any, decoded: any) => {
        if (err || !decoded) return reject(err);
        resolve(decoded);
      });
    });
  }

  async generateToken(userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.Unauthorized('Error generating token: userProfile is null');
    }

    const payload = {
      id: userProfile[securityId],
      name: userProfile.name,
      email: (userProfile as LmsUserProfile).email,
      roles: (userProfile as LmsUserProfile).roles,
      gradeLevel: (userProfile as LmsUserProfile).gradeLevel,
    };

    return this.signJwt(
      payload,
      this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    );
  }

  async verifyToken(token: string): Promise<UserProfile> {
    if (!token) {
      throw new HttpErrors.Unauthorized('Error verifying token: token is null');
    }

    try {
      const decryptedToken: any = await this.verifyJwt(token);
      const userProfile: LmsUserProfile = {
        [securityId]: String(decryptedToken.id),
        id: String(decryptedToken.id),
        name: decryptedToken.name,
        email: decryptedToken.email,
        roles: decryptedToken.roles || [],
        gradeLevel: decryptedToken.gradeLevel,
      };

      return userProfile;
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: ${error.message || 'Invalid or expired token'}`,
      );
    }
  }
}
