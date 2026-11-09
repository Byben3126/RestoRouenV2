import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { UserWalletController } from './user-wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [UserModule],
  controllers: [UserWalletController],
  providers: [WalletService],
})
export class WalletModule {}
