import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommentsModule } from './comments/comments.module.js';
import { CaptchaModule } from './captcha/captcha.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '../.env.example' }),
    PrismaModule,
    CommentsModule,
    CaptchaModule,
    AttachmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
