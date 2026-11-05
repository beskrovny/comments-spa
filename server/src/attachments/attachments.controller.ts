import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AttachmentsService } from './attachments.service.js';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('variant') variant: 'original' | 'thumbnail' = 'original',
    @Res() response: Response,
  ) {
    const attachment = await this.attachmentsService.findOne(id, variant);
    const data = attachment.data;

    response.set({
      'Content-Type': attachment.mimeType,
      'Content-Length': data.length,
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
      'X-Content-Type-Options': 'nosniff',
    });

    return response.send(Buffer.from(data));
  }
}