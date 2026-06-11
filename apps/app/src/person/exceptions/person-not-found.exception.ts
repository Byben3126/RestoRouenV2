import { HttpStatus, NotFoundException } from '@nestjs/common';

export class PersonNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'PERSON_NOT_FOUND',
      message: `Person with identifier "${identifier}" not found`,
      timestamp: new Date().toISOString(),
    });
  }
}
