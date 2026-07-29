import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardPeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
}

export class GetDashboardStatsQueryDto {
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.THIRTY_DAYS;
}
