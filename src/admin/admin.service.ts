import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from '../schemas/admin.schema';
import { AuthCredentialsDto } from '../auth/dto/auth-credentials.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) { }

  async createAdmin(authCredentialsDto: AuthCredentialsDto): Promise<{ message: string }> {
    const { userName, password } = authCredentialsDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new this.adminModel({
      userName,
      password: hashedPassword,
    });

    try {
      await admin.save();
      return { message: 'Admin created successfully' }
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Username already exists');
      } else {
        throw error;
      }
    }
  }

  async findByUserName(userName: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ userName }).exec();
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await this.adminModel.findByIdAndUpdate(id, { refreshToken }).exec();
  }

  async updateTokens(id: string, accessToken: string | null, refreshToken: string | null): Promise<void> {
    await this.adminModel.findByIdAndUpdate(id, { accessToken, refreshToken }).exec();
  }

  async generateResetToken(userName: string): Promise<{ resetToken: string }> {
    const admin = await this.findByUserName(userName);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    admin.resetToken = resetToken;
    admin.resetTokenExpires = resetTokenExpires;
    await admin.save();

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const admin = await this.adminModel.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    }).exec();

    if (!admin) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.password = hashedPassword;
    admin.resetToken = undefined;
    admin.resetTokenExpires = undefined;

    // Invalidate previous refresh tokens
    admin.refreshToken = undefined;

    await admin.save();

    return { message: 'Password reset successful' };
  }
}
