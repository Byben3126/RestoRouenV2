import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { PlaceDetailsQueryDto, PlaceIdParamDto } from './dto/google.dto';
import { GoogleService } from './google.service';

@ApiTags('Google')
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Post('places/autocomplete')
  @UseGuards(RestaurantOwnerGuard)
  @HttpCode(200)
  autocomplete(@Body() body: Record<string, unknown>, @Query() query: Record<string, string>) {
    return this.googleService.autocomplete(body, query);
  }

  @Get('places/:placeId')
  @UseGuards(RestaurantOwnerGuard)
  getPlace(@Param() { placeId }: PlaceIdParamDto, @Query() query: Record<string, string>) {
    return this.googleService.getPlace(placeId, query);
  }

  // Sans RestaurantOwnerGuard : l'app client affiche ces infos sur la fiche d'un restaurant
  @Get('places/:placeId/details')
  getPlaceDetails(
    @Param() { placeId }: PlaceIdParamDto,
    @Query() { language }: PlaceDetailsQueryDto,
  ) {
    return this.googleService.getPlaceDetails(placeId, language);
  }
}
