import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  mediaId!: string;

  @ApiProperty({ example: 'https://bucket.s3.eu-west-3.amazonaws.com/owner/uuid.webp?X-Amz-...' })
  uploadUrl!: string;
}
