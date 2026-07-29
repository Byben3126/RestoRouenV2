import { Injectable } from '@nestjs/common';

import { EntityManager, raw } from '@mikro-orm/postgresql';

import { Customer } from '../customer/entities/customer.entity';
import {
  PointsTransaction,
  PointsTransactionType,
} from '../customer/entities/points-transaction.entity';
import { PromotionUsed } from '../promotion/entities/promotion-used.entity';
import { PromotionAudience } from '../promotion/entities/promotion.entity';
import { RewardUsed } from '../reward/entities/reward-used.entity';
import { buildLegend, dayIndexOf, daysBetween, prevStartOf } from './../utils/stats.utils';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { DashboardPeriod } from './dto/get-dashboard-stats-query.dto';

function delta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const PERIOD_DAYS: Record<DashboardPeriod, number> = {
  [DashboardPeriod.SEVEN_DAYS]: 7,
  [DashboardPeriod.THIRTY_DAYS]: 30,
  [DashboardPeriod.NINETY_DAYS]: 90,
};

interface Range {
  start: Date;
  end: Date;
}

@Injectable()
export class DashboardService {
  constructor(private readonly em: EntityManager) {}

  async getStats(restaurantId: string, period: DashboardPeriod): Promise<DashboardStatsDto> {
    const end = new Date();
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - PERIOD_DAYS[period] * 86_400_000);
    const range: Range = { start, end };

    const legend = buildLegend(start, end);

    const [
      newCustomers,
      reactivatedCustomers,
      pointsAttributed,
      pointsRedeemed,
      rewardsRedeemed,
      promotionsUsed,
      promotionsUsedInactive,
    ] = await Promise.all([
      this.getNewCustomersStat(restaurantId, range),
      this.getReactivatedCustomersStat(restaurantId, range),
      this.getPointsStat(restaurantId, range, PointsTransactionType.GAIN),
      this.getPointsStat(restaurantId, range, PointsTransactionType.LOSS),
      this.getRewardsStat(restaurantId, range),
      this.getPromotionsUsedStat(restaurantId, range),
      this.getPromotionsUsedStat(restaurantId, range, PromotionAudience.INACTIVE),
    ]);

    const series = legend.map((entry, i) => ({
      date: entry.date,
      newCustomers: newCustomers.slots[i],
      reactivatedCustomers: reactivatedCustomers.slots[i],
      pointsAttributed: pointsAttributed.slots[i],
      pointsRedeemed: pointsRedeemed.slots[i],
      rewardsRedeemed: rewardsRedeemed.slots[i],
      promotionsUsed: promotionsUsed.slots[i],
      promotionsUsedInactive: promotionsUsedInactive.slots[i],
    }));

    const totals = {
      newCustomers: newCustomers.total,
      reactivatedCustomers: reactivatedCustomers.total,
      pointsAttributed: pointsAttributed.total,
      pointsRedeemed: pointsRedeemed.total,
      rewardsRedeemed: rewardsRedeemed.total,
      promotionsUsed: promotionsUsed.total,
      promotionsUsedInactive: promotionsUsedInactive.total,
    };

    const deltas = {
      newCustomers: delta(newCustomers.total, newCustomers.previousTotal),
      reactivatedCustomers: delta(reactivatedCustomers.total, reactivatedCustomers.previousTotal),
      pointsAttributed: delta(pointsAttributed.total, pointsAttributed.previousTotal),
      pointsRedeemed: delta(pointsRedeemed.total, pointsRedeemed.previousTotal),
      rewardsRedeemed: delta(rewardsRedeemed.total, rewardsRedeemed.previousTotal),
      promotionsUsed: delta(promotionsUsed.total, promotionsUsed.previousTotal),
      promotionsUsedInactive: delta(
        promotionsUsedInactive.total,
        promotionsUsedInactive.previousTotal,
      ),
    };

    return {
      period,
      series,
      totals,
      deltas,
      legend,
    };
  }

  private async getNewCustomersStat(restaurantId: string, { start, end }: Range) {
    const prevStart = prevStartOf(start, end);
    const dayCount = daysBetween(start, end);
    const slots = new Array<number>(dayCount).fill(0);

    const where = { restaurant: restaurantId };
    console.log('start', start, 'end', end);
    const [customers, previousTotal] = await Promise.all([
      this.em.find(
        Customer,
        { ...where, createdAt: { $gte: start, $lt: end } },
        { fields: ['createdAt'] },
      ),
      this.em.count(Customer, {
        ...where,
        createdAt: { $gte: prevStart, $lt: start },
      }),
    ]);

    for (const customer of customers) {
      const i = dayIndexOf(start, customer.createdAt);
      if (i >= 0 && i < dayCount) slots[i]++;
    }

    return { slots, total: customers.length, previousTotal };
  }

  private async getReactivatedCustomersStat(restaurantId: string, { start, end }: Range) {
    const prevStart = prevStartOf(start, end);
    const dayCount = daysBetween(start, end);
    const slots = new Array<number>(dayCount).fill(0);

    const where = {
      customer: { restaurant: restaurantId },
      reactivatedCustomer: true,
    };

    const [transactions, previousTotal] = await Promise.all([
      this.em.find(
        PointsTransaction,
        { ...where, createdAt: { $gte: start, $lt: end } },
        { fields: ['createdAt'] },
      ),
      this.em.count(PointsTransaction, {
        ...where,
        createdAt: { $gte: prevStart, $lt: start },
      }),
    ]);

    for (const transaction of transactions) {
      const i = dayIndexOf(start, transaction.createdAt);
      if (i >= 0 && i < dayCount) slots[i]++;
    }

    return { slots, total: transactions.length, previousTotal };
  }

  private async getPointsStat(
    restaurantId: string,
    { start, end }: Range,
    type: PointsTransactionType,
  ) {
    const prevStart = prevStartOf(start, end);
    const dayCount = daysBetween(start, end);
    const slots = new Array<number>(dayCount).fill(0);
    let total = 0;

    const where = { customer: { restaurant: restaurantId }, type };

    const [transactions, previous] = await Promise.all([
      this.em.find(
        PointsTransaction,
        { ...where, createdAt: { $gte: start, $lt: end } },
        { fields: ['createdAt', 'amount'] },
      ),
      this.em
        .createQueryBuilder(PointsTransaction, 'pt')
        .select(raw('coalesce(sum(pt.amount), 0) as total'))
        .where({ ...where, createdAt: { $gte: prevStart, $lt: start } })
        .execute<{ total: string }>('get'),
    ]);

    for (const transaction of transactions) {
      const i = dayIndexOf(start, transaction.createdAt);
      if (i >= 0 && i < dayCount) {
        slots[i] += transaction.amount;
        total += transaction.amount;
      }
    }

    return { slots, total, previousTotal: Number(previous.total) };
  }

  private async getRewardsStat(restaurantId: string, { start, end }: Range) {
    const prevStart = prevStartOf(start, end);
    const dayCount = daysBetween(start, end);
    const slots = new Array<number>(dayCount).fill(0);

    const where = { customer: { restaurant: restaurantId } };

    const [rewardsUsed, previousTotal] = await Promise.all([
      this.em.find(
        RewardUsed,
        { ...where, usedAt: { $gte: start, $lt: end } },
        { fields: ['usedAt'] },
      ),
      this.em.count(RewardUsed, {
        ...where,
        usedAt: { $gte: prevStart, $lt: start },
      }),
    ]);

    for (const rewardUsed of rewardsUsed) {
      const i = dayIndexOf(start, rewardUsed.usedAt!);
      if (i >= 0 && i < dayCount) slots[i]++;
    }

    return {
      slots,
      total: rewardsUsed.length,
      previousTotal,
    };
  }

  private async getPromotionsUsedStat(
    restaurantId: string,
    { start, end }: Range,
    audience?: PromotionAudience,
  ) {
    const prevStart = prevStartOf(start, end);
    const dayCount = daysBetween(start, end);
    const slots = new Array<number>(dayCount).fill(0);

    const where = {
      customer: { restaurant: restaurantId },
      ...(audience ? { promotion: { audience } } : {}),
    };

    const [promotionsUsed, previousTotal] = await Promise.all([
      this.em.find(
        PromotionUsed,
        { ...where, usedAt: { $gte: start, $lt: end } },
        { fields: ['usedAt'] },
      ),
      this.em.count(PromotionUsed, {
        ...where,
        usedAt: { $gte: prevStart, $lt: start },
      }),
    ]);

    for (const promotionUsed of promotionsUsed) {
      const i = dayIndexOf(start, promotionUsed.usedAt!);
      if (i >= 0 && i < dayCount) slots[i]++;
    }

    return { slots, total: promotionsUsed.length, previousTotal };
  }
}
