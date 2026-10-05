import { EntityData } from '@mikro-orm/core';
import { Factory } from '@mikro-orm/seeder';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'crypto';

import { Account } from '../entities/account.entity';

export const SEED_PASSWORD = 'Password123!';

export class AccountFactory extends Factory<Account> {
  model = Account;

  definition(): Partial<Account> {
    return {
      id: randomUUID(),
      accountId: '',
      providerId: 'credential',
    };
  }

  override async createOne(overrideParameters?: EntityData<Account>): Promise<Account> {
    return super.createOne({
      password: await hashPassword(SEED_PASSWORD),
      ...overrideParameters,
    });
  }
}
