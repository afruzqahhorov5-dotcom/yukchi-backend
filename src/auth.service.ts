import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { SmsService } from './sms.service';
import { FirebaseService } from './firebase.service';

type Otp = { code: string; exp: number; tries: number; last: number };

@Injectable()
export class AuthService {
  private readonly store = new Map<string, Otp>();

  constructor(
    private readonly sms: SmsService,
    private readonly firebase: FirebaseService,
  ) {}

  private normalize(phone: string): string {
    const p = (phone || '').replace(/[\s()-]/g, '');
    if (!/^\+?998\d{9}$/.test(p)) {
      throw new BadRequestException("Telefon raqam noto'g'ri. Masalan: +998901234567");
    }
    return p.startsWith('+') ? p : `+${p}`;
  }

  async sendOtp(rawPhone: string) {
    const phone = this.normalize(rawPhone);
    const old = this.store.get(phone);
    if (old && Date.now() - old.last < 60_000) {
      throw new HttpException(
        '1 daqiqadan keyin qayta urining',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100000, 1000000));
    this.store.set(phone, {
      code,
      exp: Date.now() + 5 * 60_000,
      tries: 0,
      last: Date.now(),
    });

    await this.sms.send(phone, `YUKCHI ilovasiga kirish kodi: ${code}`);
    return { ok: true };
  }

  async verifyOtp(rawPhone: string, code: string) {
    const phone = this.normalize(rawPhone);
    const o = this.store.get(phone);
    if (!o || Date.now() > o.exp) {
      throw new BadRequestException("Kod eskirgan yoki so'ralmagan");
    }
    if (++o.tries > 5) {
      this.store.delete(phone);
      throw new HttpException(
        "Urinishlar tugadi, yangi kod so'rang",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (o.code !== code) {
      throw new BadRequestException("Kod noto'g'ri");
    }
    this.store.delete(phone);

    const customToken = await this.firebase.customTokenForPhone(phone);
    return { customToken };
  }
}
