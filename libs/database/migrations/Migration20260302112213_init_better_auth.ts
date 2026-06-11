import { Migration } from '@mikro-orm/migrations';

export class Migration20260302112213_init_better_auth extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "user" ("id" varchar(255) not null, "name" varchar(255) not null, "email" varchar(255) not null, "email_verified" boolean not null default false, "image" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`create table "session" ("id" varchar(255) not null, "expires_at" timestamptz not null, "token" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "ip_address" varchar(255) null, "user_agent" varchar(255) null, "user_id" varchar(255) not null, constraint "session_pkey" primary key ("id"));`);
    this.addSql(`alter table "session" add constraint "session_token_unique" unique ("token");`);
    this.addSql(`create index "session_user_id_index" on "session" ("user_id");`);

    this.addSql(`create table "account" ("id" varchar(255) not null, "account_id" varchar(255) not null, "provider_id" varchar(255) not null, "user_id" varchar(255) not null, "access_token" varchar(255) null, "refresh_token" varchar(255) null, "id_token" varchar(255) null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" varchar(255) null, "password" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "account_pkey" primary key ("id"));`);
    this.addSql(`create index "account_user_id_index" on "account" ("user_id");`);

    this.addSql(`create table "verification" ("id" varchar(255) not null, "identifier" varchar(255) not null, "value" varchar(255) not null, "expires_at" timestamptz not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "verification_pkey" primary key ("id"));`);
    this.addSql(`create index "verification_identifier_index" on "verification" ("identifier");`);

    this.addSql(`alter table "session" add constraint "session_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "account" add constraint "account_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "session" drop constraint "session_user_id_foreign";`);

    this.addSql(`alter table "account" drop constraint "account_user_id_foreign";`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "session" cascade;`);

    this.addSql(`drop table if exists "account" cascade;`);

    this.addSql(`drop table if exists "verification" cascade;`);
  }

}
