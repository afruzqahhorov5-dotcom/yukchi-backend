import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(200)
  sendOtp(@Body() body: { phone: string }) {
    return this.auth.sendOtp(body?.phone);
  }

  @Post('verify-otp')
  @HttpCode(200)
  verifyOtp(@Body() body: { phone: string; code: string }) {
    return this.auth.verifyOtp(body?.phone, body?.code);
  }
}
