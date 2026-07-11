import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './../admin/admin.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async signUp(authCredentialsDto: AuthCredentialsDto) {
    return this.adminService.createAdmin(authCredentialsDto);
  }

  async login(authCredentialsDto: AuthCredentialsDto): Promise<{ message: string, accessToken: string, refreshToken: string }> {
    const { userName, password } = authCredentialsDto;
    const admin = await this.adminService.findByUserName(userName);

    if (admin && (await bcrypt.compare(password, admin.password || ''))) {
      const payload = { userName };
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
        expiresIn: '7d',
      });

      await this.adminService.updateRefreshToken(admin._id.toString(), refreshToken);

      return { message: 'Login successful', accessToken, refreshToken };
    } else {
      throw new UnauthorizedException('Please check your login credentials');
    }
  }

  async forgotPassword(userName: string) {
    return this.adminService.generateResetToken(userName);
  }

  async resetPassword(token: string, newPassword: string) {
    return this.adminService.resetPassword(token, newPassword);
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      });
      const admin = await this.adminService.findByUserName(payload.userName);

      if (!admin || admin.refreshToken !== token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign({ userName: admin.userName });
      return { accessToken: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userName: string) {
    const admin = await this.adminService.findByUserName(userName);
    if (admin) {
      await this.adminService.updateRefreshToken(admin._id.toString(), null);
    }
    return { message: 'Logged out successfully' };
  }
}
