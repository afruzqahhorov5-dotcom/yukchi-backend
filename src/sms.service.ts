import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly log = new Logger('SMS');
  private token: string | null = null;
  private readonly base = 'https://notify.eskiz.uz/api';

  private async login(): Promise<void> {
    const res = await fetch(`${this.base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ESKIZ_EMAIL,
        password: process.env.ESKIZ_PASSWORD,
      }),
    });
    const json: any = await res.json();
    this.token = json?.data?.token ?? null;
    if (!this.token) throw new Error('Eskiz login xato: email/parolni tekshiring');
  }

  async send(phone: string, message: string, retry = true): Promise<void> {
    if (process.env.SMS_MODE !== 'eskiz') {
      this.log.warn(`[DEV] ${phone} -> ${message}`);
      return;
    }

    if (!this.token) await this.login();

    const res = await fetch(`${this.base}/message/sms/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_phone: phone.replace('+', ''),
        message,
        from: process.env.ESKIZ_FROM || '4546',
      }),
    });

    if (res.status === 401 && retry) {
      this.token = null;
      return this.send(phone, message, false);
    }
    if (!res.ok) throw new Error(`SMS yuborilmadi: ${res.status}`);
  }
}
