import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { randomUUID } from 'crypto';

import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { Reward, RewardStatus } from './entities/reward.entity';
import { RewardRepository } from './repositories/reward.repository';

/** Contenu du token de récupération d'une récompense : l'utilisateur (sub), la récompense et l'id du token (jti) */
interface RewardTokenPayload {
  sub: string;
  rewardId: string;
  jti: string;
}

@Injectable()
export class RewardService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepository: RewardRepository,
    private readonly jwtService: JwtService,
  ) {}

  /** Signe la demande de l'utilisateur de récupérer la récompense, s'il a assez de points */
  async createRewardToken(userId: string, rewardId: string) {
    const reward = await this.rewardRepository.findActiveById(rewardId);
    if (!reward) throw new NotFoundException('Reward not found');
    if (!(await this.rewardRepository.canRedeem(reward, userId))) {
      throw new ForbiddenException('Not enough points');
    }

    const payload: RewardTokenPayload = { sub: userId, rewardId: reward.id, jti: randomUUID() };
    const token = await this.jwtService.signAsync(payload);
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  /** Le restaurant scanne le token du client : ses points sont débités et la récompense lui est remise */
  async useReward(restaurantId: string, token: string): Promise<Reward> {
    let payload: RewardTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RewardTokenPayload>(token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    // Archivée ou passée en brouillon depuis la génération du token
    const reward = await this.rewardRepository.findActiveById(payload.rewardId);
    if (!reward) throw new ConflictException('Reward not available');
    if (reward.restaurant.id !== restaurantId) {
      throw new ForbiddenException('Reward belongs to another restaurant');
    }

    let redeemed: boolean;
    try {
      redeemed = await this.rewardRepository.redeem(reward, payload.sub, payload.jti);
    } catch (error) {
      // Même token scanné une seconde fois
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException('Token already used');
      }
      throw error;
    }
    if (!redeemed) throw new ConflictException('Not enough points');
    return reward;
  }

  getRestaurantRewards(restaurantId: string): Promise<Reward[]> {
    return this.rewardRepository.findByRestaurant(restaurantId);
  }

  async getActiveRewards(restaurantId: string): Promise<Reward[]> {
    const rewards = await this.rewardRepository.findActiveByRestaurant(restaurantId);
    if (!rewards) throw new NotFoundException('Restaurant not found');
    return rewards;
  }

  createReward(restaurantId: string, dto: CreateRewardDto): Promise<Reward> {
    return this.rewardRepository.createForRestaurant(restaurantId, dto);
  }

  async updateReward(
    restaurantId: string,
    rewardId: string,
    dto: UpdateRewardDto,
  ): Promise<Reward> {
    const reward = await this.rewardRepository.updateForRestaurant(restaurantId, rewardId, dto);
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }

  async setStatus(restaurantId: string, rewardId: string, status: RewardStatus): Promise<Reward> {
    const reward = await this.rewardRepository.setStatusForRestaurant(
      restaurantId,
      rewardId,
      status,
    );
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }
}
