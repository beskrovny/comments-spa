import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { PrismaModule } from '../prisma.module.js';

@Module({
  providers: [CommentsService],
  controllers: [CommentsController],
  imports: [PrismaModule],
})
export class CommentsModule {}
