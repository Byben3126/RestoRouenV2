import 'dotenv/config';

import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: ['src/**/entities/*.entity.ts'],
  entitiesTs: ['src/**/entities/*.entity.ts'],
  seeder: {
    path: 'src/database/seeders',
    pathTs: 'src/database/seeders',
    defaultSeeder: 'DatabaseSeeder',
    emit: 'ts',
  },
  migrations: {
    path: 'src/database/migrations',
  },
  metadataProvider: TsMorphMetadataProvider,
  extensions: [Migrator, SeedManager],
});
