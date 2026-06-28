import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentOwner } from '../common/decorators/current-owner.decorator';
import { ConfirmResponseDto } from './dto/confirm-response.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@UseGuards(AuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiCreatedResponse({ type: UploadResponseDto })
  requestUpload(
    @CurrentOwner() ownerId: string,
    @Body() dto: RequestUploadDto,
  ): Promise<UploadResponseDto> {
    return this.mediaService.requestUpload(ownerId, dto);
  }

  @Post(':id/confirm')
  @ApiOkResponse({ type: ConfirmResponseDto })
  confirm(
    @CurrentOwner() ownerId: string,
    @Param('id') mediaId: string,
  ): Promise<ConfirmResponseDto> {
    return this.mediaService.confirm(ownerId, mediaId);
  }
}
