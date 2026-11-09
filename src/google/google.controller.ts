import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { PlaceIdParamDto } from './dto/google.dto';
import { GoogleService } from './google.service';

@ApiTags('Google')
@UseGuards(RestaurantOwnerGuard)
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Post('places/autocomplete')
  @HttpCode(200)
  autocomplete(@Body() body: Record<string, unknown>, @Query() query: Record<string, string>) {
    return this.googleService.autocomplete(body, query);
  }

  @Get('places/:placeId')
  getPlace(@Param() { placeId }: PlaceIdParamDto, @Query() query: Record<string, string>) {
    return this.googleService.getPlace(placeId, query);
  }
}
