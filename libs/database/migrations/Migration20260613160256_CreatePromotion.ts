import { Migration } from '@mikro-orm/migrations';

export class Migration20260613160256_CreatePromotion extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "promotion" ("id" uuid not null, "restaurant_id" uuid not null, "name" varchar(255) not null, "for_everyone" boolean not null default false, "expires_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "promotion_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "promotion_used" ("id" uuid not null, "customer_id" uuid not null, "promotion_id" uuid not null, "used_at" timestamptz not null, constraint "promotion_used_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "promotion_target" ("id" uuid not null, "customer_id" uuid not null, "promotion_id" uuid not null, constraint "promotion_target_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "promotion_target_customer_id_promotion_id_index" on "promotion_target" ("customer_id", "promotion_id");`,
    );

    this.addSql(
      `alter table "promotion" add constraint "promotion_restaurant_id_foreign" foreign key ("restaurant_id") references "restaurant" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "promotion_used" add constraint "promotion_used_customer_id_foreign" foreign key ("customer_id") references "customer" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "promotion_used" add constraint "promotion_used_promotion_id_foreign" foreign key ("promotion_id") references "promotion" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "promotion_target" add constraint "promotion_target_customer_id_foreign" foreign key ("customer_id") references "customer" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "promotion_target" add constraint "promotion_target_promotion_id_foreign" foreign key ("promotion_id") references "promotion" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "promotion_used" drop constraint "promotion_used_promotion_id_foreign";`,
    );

    this.addSql(
      `alter table "promotion_target" drop constraint "promotion_target_promotion_id_foreign";`,
    );

    this.addSql(`drop table if exists "promotion" cascade;`);

    this.addSql(`drop table if exists "promotion_used" cascade;`);

    this.addSql(`drop table if exists "promotion_target" cascade;`);
  }
}
