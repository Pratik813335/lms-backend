import {BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {EmailManagerBindings} from '../keys';
import {OtpRepository, UsersRepository} from '../repositories';
import {EmailService} from './email.service';

@injectable({scope: BindingScope.TRANSIENT})
export class OtpService {
  constructor(
    @repository(OtpRepository)
    private otpRepo: OtpRepository,
    @repository(UsersRepository)
    private usersRepo: UsersRepository,
    @inject(EmailManagerBindings.SEND_MAIL)
    private emailService: EmailService,
  ) {}

  /**
   * Generate 6-Digit Email OTP, persist to PostgreSQL otp table, and send via EmailService
   * With Rate Limiting: Max 5 OTP requests per 10 minutes
   */
  async generateAndSendOtp(identifier: string): Promise<{message: string; expiresAt: Date}> {
    if (!identifier) {
      throw new HttpErrors.BadRequest('Email identifier is required for OTP generation');
    }

    const cleanEmail = identifier.trim().toLowerCase();

    // Check if user exists in database
    const user = await this.usersRepo.findOne({
      where: {email: cleanEmail, isDeleted: false},
    });

    if (!user) {
      throw new HttpErrors.NotFound(`User with email '${cleanEmail}' not found`);
    }

    // Rate Limiting: Check OTP requests in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpCount = await this.otpRepo.count({
      identifier: cleanEmail,
      createdAt: {gt: tenMinutesAgo},
    });

    if (recentOtpCount.count >= 5) {
      throw new HttpErrors.TooManyRequests(
        'Too many OTP requests. Please wait 10 minutes before requesting another code.',
      );
    }

    // Deactivate previous unused OTPs for this identifier
    const previousOtps = await this.otpRepo.find({
      where: {identifier: cleanEmail, isUsed: false, isActive: true},
    });

    for (const prev of previousOtps) {
      await this.otpRepo.updateById(prev.id, {isActive: false, updatedAt: new Date()});
    }

    // Generate random 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Persist OTP row into PostgreSQL otp table
    await this.otpRepo.create({
      identifier: cleanEmail,
      type: 1, // 1 => Email
      otp: otpCode,
      attempts: 0,
      expiresAt: expiresAt,
      isUsed: false,
      isActive: true,
      isDeleted: false,
    });

    // Send Mail via Nodemailer / EmailService
    await this.emailService.sendOtpMail(cleanEmail, otpCode);

    return {
      message: '6-digit OTP code sent successfully to your email',
      expiresAt,
    };
  }

  /**
   * Pre-validate and verify 6-Digit Email OTP from PostgreSQL
   */
  async verifyOtp(identifier: string, otpCode: string): Promise<{success: boolean; message: string}> {
    if (!identifier || !otpCode) {
      throw new HttpErrors.BadRequest('Email identifier and 6-digit OTP code are required');
    }

    const cleanEmail = identifier.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw new HttpErrors.BadRequest('OTP must be a valid 6-digit numeric code');
    }

    const otpRecord = await this.otpRepo.findOne({
      where: {
        identifier: cleanEmail,
        otp: cleanOtp,
        isUsed: false,
        isActive: true,
        isDeleted: false,
      },
    });

    if (!otpRecord) {
      throw new HttpErrors.BadRequest('Invalid OTP code or email identifier');
    }

    // Check expiration (10 minutes window)
    const now = new Date();
    if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < now) {
      await this.otpRepo.updateById(otpRecord.id, {isActive: false, updatedAt: now});
      throw new HttpErrors.BadRequest('OTP code has expired. Please request a new one.');
    }

    // Check maximum attempts (Max 5 attempts)
    const attempts = (otpRecord.attempts || 0) + 1;
    if (attempts > 5) {
      await this.otpRepo.updateById(otpRecord.id, {isActive: false, isDeleted: true, updatedAt: now});
      throw new HttpErrors.BadRequest('Too many failed OTP attempts. This code is invalidated.');
    }

    // Mark OTP as verified & used (Single-use replay protection)
    await this.otpRepo.updateById(otpRecord.id, {
      isUsed: true,
      isActive: false,
      attempts: attempts,
      updatedAt: now,
    });

    return {
      success: true,
      message: '6-digit OTP code verified successfully',
    };
  }
}
