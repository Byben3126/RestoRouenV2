import 'dotenv/config';

import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: ['apps/**/src/**/entities/*.entity.ts', 'apps/**/src/entities/*.entity.ts'],
  entitiesTs: ['apps/**/src/**/entities/*.entity.ts', 'apps/**/src/entities/*.entity.ts'],
  seeder: {
    path: 'apps/**/src/**/seeders/*.seed.ts',
    pathTs: 'apps/**/src/**/seeders/*.seed.ts',
    defaultSeeder: 'DatabaseSeeder',
    emit: 'ts',
  },
  migrations: {
    path: 'libs/database/migrations',
  },
  metadataProvider: TsMorphMetadataProvider,
  extensions: [Migrator, SeedManager],
});
