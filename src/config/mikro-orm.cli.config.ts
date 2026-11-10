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
    path: 'src/infrastructure/database/seeders',
    pathTs: 'src/infrastructure/database/seeders',
    defaultSeeder: 'DatabaseSeeder',
    emit: 'ts',
  },
  migrations: {
    path: 'src/infrastructure/database/migrations',
  },
  metadataProvider: TsMorphMetadataProvider,
  extensions: [Migrator, SeedManager],
});
