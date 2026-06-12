import { HttpStatus, NotFoundException } from '@nestjs/common';

export class UserProfileNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'USER_PROFILE_NOT_FOUND',
      message: `UserProfile with identifier "${identifier}" not found`,
      timestamp: new Date().toISOString(),
    });
  }
}
