import { Body, Controller, Delete, Get, HttpCode, Patch } from '@nestjs/common';

import { ApiOkWrappedResponse } from '../common/decorators/api-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { EnrichmentStatusDto, UserDto } from './dto/user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOkWrappedResponse({ type: UserDto })
  getMe(@CurrentUser() userId: string) {
    return this.userService.getMe(userId);
  }

  @Get('me/enrichment-status')
  @ApiOkWrappedResponse({ type: EnrichmentStatusDto })
  getEnrichmentStatus(@CurrentUser() userId: string) {
    return this.userService.getEnrichmentStatus(userId);
  }

  /** Profil (Person) et langue ; l'email et le mot de passe se changent via Better Auth */
  @Patch('me')
  @ApiOkWrappedResponse({ type: UserDto })
  updateMe(@CurrentUser() userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateMe(userId, dto);
  }

  /** Supprime le compte (anonymisé) ; 409 tant que l'utilisateur a un restaurant */
  @Delete('me')
  @HttpCode(204)
  deleteMe(@CurrentUser() userId: string) {
    return this.userService.deleteMe(userId);
  }
}
