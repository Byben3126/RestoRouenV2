import { HttpStatus, NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor(identifier: string | number) {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'WORKER_NOT_FOUND',
      message: `Worker with identifier "${identifier}" not found`,
      timestamp: new Date().toISOString(),
    });
  }
}
