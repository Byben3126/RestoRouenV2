import 'dotenv/config';

import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  discovery: {
    disableDynamicFileAccess: true,
  },
  migrations: {
    path: 'libs/database/migrations',
  },
  debug: process.env.NODE_ENV !== 'production',
  logger: (message: string) => {
    console.log(message);
  },
  highlighter: process.env.NODE_ENV !== 'production' ? new SqlHighlighter() : undefined,
  metadataProvider: TsMorphMetadataProvider,
  extensions: [Migrator, SeedManager],
});
