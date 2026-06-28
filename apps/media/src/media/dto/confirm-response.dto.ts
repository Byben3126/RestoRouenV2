import { ApiProperty } from '@nestjs/swagger';

export class ConfirmResponseDto {
  @ApiProperty({ example: 'https://d1234abcd.cloudfront.net/owner/uuid.webp' })
  url!: string;
}
