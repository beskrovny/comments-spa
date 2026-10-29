import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { CommentsModule } from './comments/comments.module.js';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule, CommentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}