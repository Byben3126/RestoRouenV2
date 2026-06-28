import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Media } from '../../../../media/src/media/entities/media.entity';
import { CreateRewardDto } from '../dto/create-reward.dto';
import { UpdateRewardDto } from '../dto/update-reward.dto';
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

  async findByRestaurant(restaurantId: string): Promise<Reward[]> {
    return this.find(
      { restaurant: restaurantId },
      { populate: ['usedCount', 'medias'], orderBy: { status: 'ASC', createdAt: 'DESC' } },
    );
  }
}
