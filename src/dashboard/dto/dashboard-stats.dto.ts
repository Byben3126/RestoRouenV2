import { Exclude, Expose, Type } from 'class-transformer';

import { DashboardPeriod } from './get-dashboard-stats-query.dto';

@Exclude()
export class DashboardSeriesPointDto {
  @Expose() date!: string;
  @Expose() newCustomers!: number;
  @Expose() reactivatedCustomers!: number;
  @Expose() pointsAttributed!: number;
  @Expose() pointsRedeemed!: number;
  @Expose() rewardsRedeemed!: number;
  @Expose() promotionsUsed!: number;
  @Expose() promotionsUsedInactive!: number;
}

@Exclude()
export class DashboardLegendEntryDto {
  @Expose() date!: string;
  @Expose() dayNumber!: number;
  @Expose() dayLabelShort!: string;
  @Expose() dayLabelLong!: string;
  @Expose() weekNumber!: number;
}

@Exclude()
export class DashboardTotalsDto {
  @Expose() newCustomers!: number;
  @Expose() reactivatedCustomers!: number;
  @Expose() pointsAttributed!: number;
  @Expose() pointsRedeemed!: number;
  @Expose() rewardsRedeemed!: number;
  @Expose() promotionsUsed!: number;
  @Expose() promotionsUsedInactive!: number;
}

@Exclude()
export class DashboardDeltasDto {
  @Expose() newCustomers!: number;
  @Expose() reactivatedCustomers!: number;
  @Expose() pointsAttributed!: number;
  @Expose() pointsRedeemed!: number;
  @Expose() rewardsRedeemed!: number;
  @Expose() promotionsUsed!: number;
  @Expose() promotionsUsedInactive!: number;
}

@Exclude()
export class DashboardStatsDto {
  @Expose() period!: DashboardPeriod;

  @Expose()
  @Type(() => DashboardSeriesPointDto)
  series!: DashboardSeriesPointDto[];

  @Expose()
  @Type(() => DashboardTotalsDto)
  totals!: DashboardTotalsDto;

  @Expose()
  @Type(() => DashboardDeltasDto)
  deltas!: DashboardDeltasDto;

  @Expose()
  @Type(() => DashboardLegendEntryDto)
  legend!: DashboardLegendEntryDto[];
}
