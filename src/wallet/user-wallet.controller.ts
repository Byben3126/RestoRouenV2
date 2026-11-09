import { Controller, Get, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';

@ApiTags('User')
@Controller('users/me/wallet')
export class UserWalletController {
  constructor(private readonly walletService: WalletService) {}

  /** Carte client Apple Wallet : le linkCode en QR code, que le restaurant scanne */
  @Get('pass')
  @ApiProduces('application/vnd.apple.pkpass')
  @ApiOkResponse({
    description: 'Pass Apple Wallet (.pkpass)',
    schema: { type: 'string', format: 'binary' },
  })
  async getPass(@CurrentUser() userId: string): Promise<StreamableFile> {
    const { pass, linkCode } = await this.walletService.createPass(userId);
    return new StreamableFile(pass, {
      type: 'application/vnd.apple.pkpass',
      disposition: `attachment; filename="restorouen-${linkCode}.pkpass"`,
    });
  }
}
