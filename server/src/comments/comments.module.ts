import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { PrismaModule } from '../prisma.module.js';
import { CaptchaModule } from '../captcha/captcha.module.js';
import { CommentsGateway } from './comments.gateway.js';

@Module({
  providers: [CommentsService, CommentsGateway],
  controllers: [CommentsController],
  imports: [PrismaModule, CaptchaModule],
})
export class CommentsModule {}
