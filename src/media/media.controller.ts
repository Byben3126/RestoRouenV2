import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiCreatedWrappedResponse } from '../common/decorators/api-response.decorator';
import { CurrentOwner } from '../common/decorators/current-owner.decorator';
import { ConfirmResponseDto } from './dto/confirm-response.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiCreatedWrappedResponse({ type: UploadResponseDto })
  requestUpload(
    @CurrentOwner() ownerId: string,
    @Body() dto: RequestUploadDto,
  ): Promise<UploadResponseDto> {
    return this.mediaService.requestUpload(ownerId, dto);
  }

  @Post(':id/confirm')
  @ApiCreatedWrappedResponse({ type: ConfirmResponseDto })
  confirm(
    @CurrentOwner() ownerId: string,
    @Param('id') mediaId: string,
  ): Promise<ConfirmResponseDto> {
    return this.mediaService.confirm(ownerId, mediaId);
  }
}
