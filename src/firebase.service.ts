import { Injectable } from '@nestjs/common';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

@Injectable()
export class FirebaseService {
  private readonly app: App;

  constructor() {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!path) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH .env da yo'q");
    }
    const key = JSON.parse(readFileSync(path, 'utf8'));
    this.app = getApps().length
      ? getApp()
      : initializeApp({ credential: cert(key) });
  }

  async customTokenForPhone(phone: string): Promise<string> {
    const auth = getAuth(this.app);
    let uid: string;
    try {
      uid = (await auth.getUserByPhoneNumber(phone)).uid;
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') throw e;
      uid = (await auth.createUser({ phoneNumber: phone })).uid;
    }
    return auth.createCustomToken(uid);
  }
}
