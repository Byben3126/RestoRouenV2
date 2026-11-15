import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { CreateOutletDto, OwnerOutletDto, UpdateOutletDto } from './dto/outlet.dto';
import { OutletService } from './outlet.service';

@ApiTags('Restaurant')
@Controller('restaurant/me/outlets')
export class OutletController {
  constructor(private readonly outletService: OutletService) {}

  @Get()
  @Serialize(OwnerOutletDto)
  @ApiOkResponse({ type: [OwnerOutletDto] })
  listOutlets(@CurrentUser() userId: string) {
    return this.outletService.listOutlets(userId);
  }

  @Post()
  @Serialize(OwnerOutletDto)
  @ApiCreatedResponse({ type: OwnerOutletDto })
  createOutlet(@CurrentUser() userId: string, @Body() dto: CreateOutletDto) {
    return this.outletService.createOutlet(userId, dto);
  }

  @Patch(':id')
  @Serialize(OwnerOutletDto)
  @ApiOkResponse({ type: OwnerOutletDto })
  updateOutlet(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOutletDto,
  ) {
    return this.outletService.updateOutlet(userId, id, dto);
  }

  /** Remplace le token de la tablette face au client ; à saisir sur la tablette, il n'est plus affiché ensuite */
  @Post(':id/tablet-token')
  generateTabletToken(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.outletService.generateTabletToken(userId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'The restaurant must keep at least one active outlet' })
  deleteOutlet(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.outletService.deleteOutlet(userId, id);
  }
}
