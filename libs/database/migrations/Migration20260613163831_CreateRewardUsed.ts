import { Migration } from '@mikro-orm/migrations';

export class Migration20260613163831_CreateRewardUsed extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "reward_used" ("id" uuid not null, "customer_id" uuid not null, "reward_id" uuid not null, "used_at" timestamptz null, constraint "reward_used_pkey" primary key ("id"));`);

    this.addSql(`alter table "reward_used" add constraint "reward_used_customer_id_foreign" foreign key ("customer_id") references "customer" ("id") on update cascade;`);
    this.addSql(`alter table "reward_used" add constraint "reward_used_reward_id_foreign" foreign key ("reward_id") references "reward" ("id") on update cascade;`);

    this.addSql(`alter table "promotion_used" alter column "used_at" type timestamptz using ("used_at"::timestamptz);`);
    this.addSql(`alter table "promotion_used" alter column "used_at" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reward_used" cascade;`);

    this.addSql(`alter table "promotion_used" alter column "used_at" type timestamptz using ("used_at"::timestamptz);`);
    this.addSql(`alter table "promotion_used" alter column "used_at" set not null;`);
  }

}
