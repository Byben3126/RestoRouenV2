import { Migration } from '@mikro-orm/migrations';

export class Migration20260613130405_CreateRestaurant extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "restaurant" ("id" uuid not null, "user_id" varchar(255) not null, "name" varchar(255) not null, "latitude" double precision null, "longitude" double precision null, "country" varchar(255) null, "city" varchar(255) null, "formatted_address" varchar(255) null, "place_id" varchar(255) null, "google_my_business_link" varchar(255) null, "images" jsonb null, "average_rating" double precision not null default 0, "review_count" int not null default 0, "is_active" boolean not null default true, "cloudwaitress_id" varchar(255) null, "cloudwaitress_url" varchar(255) null, "cloudwaitress_webhook_auth_secret" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "restaurant_pkey" primary key ("id"));`);
    this.addSql(`alter table "restaurant" add constraint "restaurant_user_id_unique" unique ("user_id");`);
    this.addSql(`alter table "restaurant" add constraint "restaurant_cloudwaitress_id_unique" unique ("cloudwaitress_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "restaurant" cascade;`);
  }

}
