import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { MulterError } from 'multer';
import type { Response } from 'express';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({
        statusCode: 413,
        message: 'Размер одного файла не должен превышать 5 MB.',
        error: 'Payload Too Large',
      });
    }

    return response.status(400).json({
      statusCode: 400,
      message: 'Ошибка загрузки файла.',
      error: 'Bad Request',
    });
  }
}