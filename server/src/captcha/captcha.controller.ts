import { Controller, Get } from '@nestjs/common';
import { CaptchaService } from './captcha.service.js';

@Controller('captcha')
export class CaptchaController {
    constructor(private readonly captchaService: CaptchaService) {}

    @Get()
    generate() {
        return this.captchaService.generate();
    }
}