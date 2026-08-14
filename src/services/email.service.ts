import {BindingScope, injectable} from '@loopback/core';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@injectable({scope: BindingScope.SINGLETON})
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendOtpMail(toEmail: string, otpCode: string): Promise<boolean> {
    const from = process.env.SMTP_FROM || 'LucidPrep LMS <noreply@lucidprep.com>';
    const subject = `Your LucidPrep Verification Code: ${otpCode}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center;">LucidPrep LMS</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 15px; color: #555;">Thank you for registering with LucidPrep LMS. Please use the following 6-digit verification code to complete your login:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; background-color: #EEF2FF; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 14px; color: #777;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">LucidPrep Learning Management System</p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: toEmail,
          subject,
          html,
        });
        return true;
      } catch (err) {
        console.error('Failed to send SMTP email:', err);
        return false;
      }
    } else {
      console.log(`[SMTP NOTICE]: Client SMTP credentials not configured. OTP Code for ${toEmail} is [ ${otpCode} ]`);
      return true;
    }
  }
}
