import { faker } from '@faker-js/faker';
import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { Customer } from '../entities/customer.entity';
import { PointsTransactionType } from '../entities/points-transaction.entity';
import {
  createPointsTransaction,
  randomGainAmount,
  randomLossAmount,
} from './points-transaction.factory';

const INACTIVITY_DAYS = Number(process.env.INACTIVE_THRESHOLD_DAYS ?? 30);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomDateBetween(from: Date, to: Date): Date {
  return new Date(
    from.getTime() + Math.random() * (to.getTime() - from.getTime()),
  );
}

export class CustomerDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const appUserIds: string[] = context.appUserIds as string[];
    const restaurantIds: string[] = context.restaurantIds as string[];

    for (const restaurantId of restaurantIds) {
      const restaurant = em.getReference(Restaurant, restaurantId);

      const selectedAppUserIds = faker.helpers.arrayElements(appUserIds, {
        min: Math.floor(appUserIds.length * 0.4),
        max: Math.floor(appUserIds.length * 0.8),
      });

      for (const appUserId of selectedAppUserIds) {
        const user = em.getReference(AppUser, appUserId);

        const customer = em.create(Customer, {
          user,
          restaurant,
          points: 0,
          totalPointsGained: 0,
          canSubmitRating: faker.datatype.boolean({ probability: 0.5 }),
        });

        const isReactivated = Math.random() < 0.3;
        let balance = 0;
        let totalGained = 0;

        if (isReactivated) {
          // ── Phase 1 : activité ancienne (60–90 jours) ─────────────────────
          const earlyCount = faker.number.int({ min: 3, max: 8 });
          for (let i = 0; i < earlyCount; i++) {
            const date = randomDateBetween(daysAgo(90), daysAgo(60));
            const amount = randomGainAmount();
            balance += amount;
            totalGained += amount;
            createPointsTransaction(em, customer, {
              type: PointsTransactionType.GAIN,
              amount,
              createdAt: date,
            });
          }

          // ── Phase 2 : retour après inactivité (reactivatedCustomer = true) ─
          const reactivationDate = randomDateBetween(
            daysAgo(INACTIVITY_DAYS - 1),
            daysAgo(1),
          );
          const reactivationAmount = randomGainAmount();
          balance += reactivationAmount;
          totalGained += reactivationAmount;
          createPointsTransaction(em, customer, {
            type: PointsTransactionType.GAIN,
            amount: reactivationAmount,
            createdAt: reactivationDate,
            reactivatedCustomer: true,
          });

          // ── Phase 3 : quelques visites récentes après la réactivation ──────
          const recentCount = faker.number.int({ min: 1, max: 4 });
          for (let i = 0; i < recentCount; i++) {
            const date = randomDateBetween(reactivationDate, new Date());
            const isGain = balance === 0 || Math.random() < 0.75;
            if (isGain) {
              const amount = randomGainAmount();
              balance += amount;
              totalGained += amount;
              createPointsTransaction(em, customer, {
                type: PointsTransactionType.GAIN,
                amount,
                createdAt: date,
              });
            } else {
              const amount = randomLossAmount(balance);
              if (amount > 0) {
                balance -= amount;
                createPointsTransaction(em, customer, {
                  type: PointsTransactionType.LOSS,
                  amount,
                  createdAt: date,
                });
              }
            }
          }

          customer.lastVisitDate = reactivationDate;
        } else {
          // ── Activité régulière sur 90 jours ───────────────────────────────
          const txCount = faker.number.int({ min: 3, max: 15 });
          const dates = Array.from({ length: txCount }, () =>
            randomDateBetween(daysAgo(90), new Date()),
          ).sort((a, b) => a.getTime() - b.getTime());

          for (const date of dates) {
            const isGain = balance === 0 || Math.random() < 0.75;
            if (isGain) {
              const amount = randomGainAmount();
              balance += amount;
              totalGained += amount;
              createPointsTransaction(em, customer, {
                type: PointsTransactionType.GAIN,
                amount,
                createdAt: date,
              });
            } else {
              const amount = randomLossAmount(balance);
              if (amount > 0) {
                balance -= amount;
                createPointsTransaction(em, customer, {
                  type: PointsTransactionType.LOSS,
                  amount,
                  createdAt: date,
                });
              }
            }
          }

          customer.lastVisitDate =
            dates.length > 0 ? dates[dates.length - 1] : undefined;
        }

        customer.points = balance;
        customer.totalPointsGained = totalGained;
      }

      await em.flush();
    }
  }
}
