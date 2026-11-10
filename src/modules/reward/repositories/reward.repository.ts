import { LockMode } from '@mikro-orm/core';
import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Customer } from '../../customer/entities/customer.entity';
import { Media } from '../../media/entities/media.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { CreateRewardDto } from '../dto/create-reward.dto';
import { UpdateRewardDto } from '../dto/update-reward.dto';
import { RewardUsed } from '../entities/reward-used.entity';
import { Reward, RewardStatus } from '../entities/reward.entity';

export class RewardRepository extends EntityRepository<Reward> {
  async createForRestaurant(restaurantId: string, dto: CreateRewardDto): Promise<Reward> {
    const { mediaIds, ...rest } = dto;
    const reward = this.create({
      ...rest,
      restaurant: restaurantId,
      medias: mediaIds,
    } as RequiredEntityData<Reward>);

    await this.em.flush();
    reward.usedCount = 0;
    return reward;
  }

  async updateForRestaurant(
    restaurantId: string,
    rewardId: string,
    dto: UpdateRewardDto,
  ): Promise<Reward | null> {
    const { mediaIds, ...rest } = dto;

    const reward = await this.findOne(
      { id: rewardId, restaurant: restaurantId },
      { populate: ['medias', 'usedCount'] },
    );

    if (!reward) return null;

    Object.assign(reward, rest); // scalaires uniquement

    let removed: string[] = [];
    if (mediaIds && Array.isArray(mediaIds)) {
      removed = reward.mediaIds.filter((id) => !mediaIds.includes(id));
      reward.medias.set(mediaIds.map((id) => this.em.getReference(Media, id)));
    }

    await this.em.flush();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const id of removed) {
      //await this.mediaClient.delete(id); // le service media supprime sa ligne + le fichier S3
    }

    return reward;
  }

  async setStatusForRestaurant(
    restaurantId: string,
    rewardId: string,
    status: RewardStatus,
  ): Promise<Reward | null> {
    const affected = await this.nativeUpdate(
      { id: rewardId, restaurant: restaurantId },
      { status },
    );
    if (!affected) return null;
    return this.findOne({ id: rewardId }, { populate: ['usedCount'] });
  }

  async findActiveByRestaurant(restaurantId: string): Promise<Reward[] | null> {
    const restaurantExists = await this.em.count(Restaurant, { id: restaurantId, isActive: true });
    if (!restaurantExists) return null;

    return this.find(
      { restaurant: restaurantId, status: RewardStatus.ACTIVE },
      { populate: ['medias'], orderBy: { pointRequired: 'ASC', createdAt: 'DESC' } },
    );
  }

  /** La récompense si elle est active dans un restaurant actif, sinon null */
  async findActiveById(rewardId: string): Promise<Reward | null> {
    return this.findOne(
      { id: rewardId, status: RewardStatus.ACTIVE, restaurant: { isActive: true } },
      { populate: ['medias'] },
    );
  }

  /** L'utilisateur est client du restaurant de la récompense et a assez de points pour la récupérer */
  async canRedeem(reward: Reward, userId: string): Promise<boolean> {
    const customer = await this.em.findOne(Customer, {
      user: userId,
      restaurant: reward.restaurant.id,
    });
    return customer?.hasEnoughPoints(reward.pointRequired) ?? false;
  }

  /**
   * Débite les points du client et enregistre l'utilisation de la récompense pour ce token.
   * false si le client n'a plus assez de points.
   */
  async redeem(reward: Reward, userId: string, tokenId: string): Promise<boolean> {
    return this.em.transactional(async (em) => {
      // Verrouille le client : deux scans en parallèle ne peuvent pas dépenser les mêmes points
      const customer = await em.findOne(
        Customer,
        { user: userId, restaurant: reward.restaurant.id },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!customer?.hasEnoughPoints(reward.pointRequired)) return false;

      customer.removePoints(reward.pointRequired, `Récompense : ${reward.name}`);
      em.create(RewardUsed, { reward, customer, tokenId } as RequiredEntityData<RewardUsed>);
      await em.flush();
      return true;
    });
  }

  async findByRestaurant(restaurantId: string): Promise<Reward[]> {
    return this.find(
      { restaurant: restaurantId },
      { populate: ['usedCount', 'medias'], orderBy: { status: 'ASC', createdAt: 'DESC' } },
    );
  }
}
