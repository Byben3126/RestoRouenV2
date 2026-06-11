import { Migration } from '@mikro-orm/migrations';

export class Migration20260321004150_company_location_worker extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "company" ("id" uuid not null, "name" varchar(255) not null, "owner_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "company_pkey" primary key ("id"));`);
    this.addSql(`alter table "company" add constraint "company_owner_id_unique" unique ("owner_id");`);

    this.addSql(`create table "location" ("id" uuid not null, "name" varchar(255) not null, "address" varchar(255) not null, "company_id" uuid not null, constraint "location_pkey" primary key ("id"));`);

    this.addSql(`alter table "worker" drop constraint "worker_pkey";`);
    this.addSql(`alter table "worker" drop column "hidden_field";`);
    this.addSql(`alter table "worker" add column "id" uuid not null, add column "user_id" varchar(255) null, add column "first_name" varchar(255) null, add column "last_name" varchar(255) null, add column "company_id" uuid not null;`);
    this.addSql(`alter table "worker" add constraint "worker_pkey" primary key ("id");`);

    this.addSql(`create table "worker_locations" ("worker_id" uuid not null, "location_id" uuid not null, constraint "worker_locations_pkey" primary key ("worker_id", "location_id"));`);

    this.addSql(`alter table "company" add constraint "company_owner_id_foreign" foreign key ("owner_id") references "worker" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "location" add constraint "location_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);

    this.addSql(`alter table "worker_locations" add constraint "worker_locations_worker_id_foreign" foreign key ("worker_id") references "worker" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "worker_locations" add constraint "worker_locations_location_id_foreign" foreign key ("location_id") references "location" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "worker" add constraint "worker_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "worker" drop constraint "worker_company_id_foreign";`);

    this.addSql(`alter table "location" drop constraint "location_company_id_foreign";`);

    this.addSql(`alter table "worker_locations" drop constraint "worker_locations_location_id_foreign";`);

    this.addSql(`drop table if exists "company" cascade;`);

    this.addSql(`drop table if exists "location" cascade;`);

    this.addSql(`drop table if exists "worker_locations" cascade;`);

    this.addSql(`alter table "worker" drop constraint "worker_pkey";`);
    this.addSql(`alter table "worker" drop column "id", drop column "user_id", drop column "first_name", drop column "last_name", drop column "company_id";`);

    this.addSql(`alter table "worker" add column "hidden_field" serial;`);
    this.addSql(`alter table "worker" add constraint "worker_pkey" primary key ("hidden_field");`);
  }

}
