import { Migration } from '@mikro-orm/migrations';

export class Migration20260302112311_init_worker extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "worker" ("hidden_field" serial primary key, "email" varchar(255) not null, "is_active" boolean not null default true);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "worker" cascade;`);
  }

}
