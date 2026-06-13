import { Migration } from '@mikro-orm/migrations';

export class Migration20260613152241_CreateCustomer extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "customer" drop column "status";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "customer" add column "status" text check ("status" in ('default', 'inactive', 'top')) not null default 'default';`);
  }

}
