import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../common/decorators/api-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { CreateOutletDto, OutletDto, UpdateOutletDto } from './dto/outlet.dto';
import { OutletService } from './outlet.service';

@ApiTags('Restaurant')
@UseGuards(AuthGuard)
@Controller('restaurant/me/outlets')
export class OutletController {
  constructor(private readonly outletService: OutletService) {}

  @Get()
  @Serialize(OutletDto)
  @ApiOkWrappedResponse({ type: [OutletDto] })
  listOutlets(@CurrentUser() userId: string) {
    return this.outletService.listOutlets(userId);
  }

  @Post()
  @Serialize(OutletDto)
  @ApiCreatedWrappedResponse({ type: OutletDto })
  createOutlet(@CurrentUser() userId: string, @Body() dto: CreateOutletDto) {
    return this.outletService.createOutlet(userId, dto);
  }

  @Patch(':id')
  @Serialize(OutletDto)
  @ApiOkWrappedResponse({ type: OutletDto })
  updateOutlet(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOutletDto,
  ) {
    return this.outletService.updateOutlet(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteOutlet(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.outletService.deleteOutlet(userId, id);
  }
}
