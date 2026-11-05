import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number, variant: 'original' | 'thumbnail' = 'original') {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        data: true,
        thumbnailData: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // For thumbnails: use thumbnailData if available, otherwise fall back to data
    // (existing records only have the resized image in `data`)
    const isImage = attachment.mimeType.startsWith('image/');
    const data =
      variant === 'thumbnail' && isImage
        ? (attachment.thumbnailData ?? attachment.data)
        : attachment.data;

    return {
      ...attachment,
      data,
    };
  }
}