import type { MikroORM } from '@mikro-orm/core';
import type { RecordActionResponse } from 'adminjs';
import { Router } from 'express';

import { Restaurant } from '../restaurant/entities/restaurant.entity';

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
  const admin = new AdminJS({
    rootPath: '/admin',
    databases: [orm],
    // Ressources personnalisées : elles remplacent celles que databases crée par défaut
    resources: [
      {
        resource: { model: Restaurant, orm },
        options: {
          properties: {
            // Champ calculé par show.after ; en richtext pour qu'AdminJS affiche le lien en HTML
            hubrise: {
              type: 'richtext',
              isVisible: { show: true, list: false, edit: false, filter: false },
            },
          },
          actions: {
            show: {
              after: (response: RecordActionResponse) => {
                response.record.params.hubrise = hubriseConnectLink(response.record.id);
                return response;
              },
            },
          },
        },
      },
    ],
  });
  return Router().use('/admin', AdminJSExpress.buildRouter(admin));
}

/** Lien vers l'autorisation HubRise du restaurant ; HubRise revient ensuite sur le callback de l'API */
function hubriseConnectLink(restaurantId: string): string {
  const clientId = process.env.HUBRISE_CLIENT_ID;
  if (!clientId) return 'HUBRISE_CLIENT_ID non configuré';

  const params = new URLSearchParams({
    redirect_uri: `${process.env.API_URL}/hubrize/oauth/callback/${restaurantId}`,
    client_id: clientId,
    scope: 'location[orders.read]',
  });
  return `<a href="https://manager.hubrise.com/oauth2/v1/authorize?${params.toString()}">Connecter HubRise</a>`;
}
