import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        data: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }
}