import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max } from 'class-validator';

const MB = 1024 * 1024;

export class RequestUploadDto {
  @ApiProperty({ example: 'image/webp' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 2097152, required: false, description: 'Taille en bytes (max 10 Mo)' })
  @IsOptional()
  @IsNumber()
  @Max(10 * MB)
  size?: number;
}
