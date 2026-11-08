import type { MikroORM } from '@mikro-orm/core';
import { Router } from 'express';

/** Router Express d'AdminJS, injecté dans AdminController */
export const ADMIN_ROUTER = Symbol('ADMIN_ROUTER');

/**
 * Construit AdminJS, monté sous /admin. Imports dynamiques : AdminJS (publié en ESM, qui génère son
 * bundle front au démarrage) n'est chargé que si ce provider est utilisé ; les tests le remplacent.
 */
export async function createAdminRouter(orm: MikroORM): Promise<Router> {
  const [{ default: AdminJS }, { default: AdminJSExpress }, { Database, Resource }] =
    await Promise.all([import('adminjs'), import('@adminjs/express'), import('@adminjs/mikroorm')]);

  AdminJS.registerAdapter({ Database, Resource });
  const admin = new AdminJS({ rootPath: '/admin', databases: [orm] });
  return Router().use('/admin', AdminJSExpress.buildRouter(admin));
}
