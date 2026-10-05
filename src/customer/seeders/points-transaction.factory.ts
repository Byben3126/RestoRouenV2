import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/core';

import { Customer } from '../entities/customer.entity';
import { PointsTransaction, PointsTransactionType } from '../entities/points-transaction.entity';

const GAIN_REASONS = [
  'Visite en restaurant',
  'Achat sur place',
  'Parrainage client',
  'Bonus anniversaire',
  'Promotion fidélité',
  'Offre spéciale',
  'Passage en caisse',
];

const LOSS_REASONS = [
  'Échange cadeau',
  'Récompense utilisée',
  'Bon de réduction',
];

export function createPointsTransaction(
  em: EntityManager,
  customer: Customer,
  opts: {
    type: PointsTransactionType;
    amount: number;
    createdAt: Date;
    reactivatedCustomer?: boolean;
  },
): PointsTransaction {
  const tx = em.create(PointsTransaction, {
    customer,
    type: opts.type,
    amount: opts.amount,
    reason:
      opts.type === PointsTransactionType.GAIN
        ? faker.helpers.arrayElement(GAIN_REASONS)
        : faker.helpers.arrayElement(LOSS_REASONS),
    reactivatedCustomer: opts.reactivatedCustomer ?? false,
    createdAt: opts.createdAt,
  });
  return tx;
}

export function randomGainAmount() {
  return faker.number.int({ min: 10, max: 150 });
}

export function randomLossAmount(currentBalance: number) {
  const max = Math.min(currentBalance, 300);
  if (max < 20) return 0;
  return faker.number.int({ min: 20, max: max });
}
