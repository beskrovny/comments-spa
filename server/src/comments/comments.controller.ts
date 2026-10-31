import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './create-comment.dto.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UseFilters } from '@nestjs/common';
import { MulterExceptionFilter } from './multer-exception.filter.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}


  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      defParamCharset: 'utf8',
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  create(
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.commentsService.create(dto, files ?? []);
  }


  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    if (page < 1) {
      throw new BadRequestException('Page must be greater than zero');
    }

    const allowedSortFields = ['userName', 'email', 'createdAt'];

    if (sortBy && !allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sortBy field');
    }

    if (order && order !== 'asc' && order !== 'desc') {
      throw new BadRequestException('Order must be asc or desc');
    }

    return this.commentsService.findAll(
      page,
      (sortBy as 'userName' | 'email' | 'createdAt') || 'createdAt',
      (order as 'asc' | 'desc') || 'desc',
    );
  }
}
