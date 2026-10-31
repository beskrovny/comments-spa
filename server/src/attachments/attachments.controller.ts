import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
    @Res() response: Response,
  ) {
    const attachment = await this.attachmentsService.findOne(id);

    response.set({
      'Content-Type': attachment.mimeType,
      'Content-Length': attachment.data.length,
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
      'X-Content-Type-Options': 'nosniff',
    });

    return response.send(Buffer.from(attachment.data));
  }
}