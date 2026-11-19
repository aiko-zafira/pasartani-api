import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { Response } from 'express';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan pada database';

    if (exception.code === '23505') {
      status = HttpStatus.CONFLICT;
      message = 'Data unik sudah terdaftar (duplikat)';
    } else if (exception.code === '23503') {
      status = HttpStatus.CONFLICT;
      message = 'Data masih berelasi dengan entitas lain';
    } else if (exception.code === '22P02') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Format parameter input tidak valid';
    }

    res.status(status).json({ statusCode: status, message, error: exception.code });
  }
}
