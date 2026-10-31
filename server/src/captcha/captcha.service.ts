import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';
import { randomUUID } from 'node:crypto';

interface CaptchaEntry {
    text: string;
    expiresAt: number;
}

@Injectable()
export class CaptchaService {
    private readonly captchas = new Map<string, CaptchaEntry>();

    private readonly expirationTime = 5 * 60 * 1000;

    generate() {
        this.cleanupExpired();

        const captcha = svgCaptcha.create({
            size: 5,
            noise: 3,
            color: true,
            background: '#f2f2f2',
            ignoreChars: '0o1i',
        });

        const id = randomUUID();

        this.captchas.set(id, {
            text: captcha.text.toLowerCase(),
            expiresAt: Date.now() + this.expirationTime,
        });

        return {
            id,
            image: captcha.data,
        };
    }

    verify(id: string, answer: string): boolean {
        const captcha = this.captchas.get(id);

        if (!captcha || captcha.expiresAt < Date.now()) {
            this.captchas.delete(id);
            return false;
        }

        this.captchas.delete(id);

        return captcha.text === answer.trim().toLowerCase();
    }

    private cleanupExpired(): void {
        const now = Date.now();

        for (const [id, captcha] of this.captchas.entries()) {
            if (captcha.expiresAt < now) {
                this.captchas.delete(id);
            }
        }
    }
}
