import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@CurrentUser() userId: string) {
    return this.userService.getMe(userId);
  }

  @UseGuards(AuthGuard)
  @Get('me/enrichment-status')
  getEnrichmentStatus(@CurrentUser() userId: string) {
    return this.userService.getEnrichmentStatus(userId);
  }

  /** Profil (Person) et langue ; l'email et le mot de passe se changent via Better Auth */
  @UseGuards(AuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateMe(userId, dto);
  }

  /** Supprime le compte (anonymisé) ; 409 tant que l'utilisateur a un restaurant */
  @UseGuards(AuthGuard)
  @Delete('me')
  @HttpCode(204)
  deleteMe(@CurrentUser() userId: string) {
    return this.userService.deleteMe(userId);
  }
}
