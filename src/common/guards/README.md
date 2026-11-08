Décider si une requête peut passer ou non AVANT qu'elle arrive au controller.

Es-tu connecté ? Le guard global de nestjs-better-auth le vérifie sur toutes les routes, sans
rien déclarer. Il pose la session sur la requête (`req.user`, `req.session`), lue par `@CurrentUser()`.
Pour une route publique : `@AllowAnonymous()` ; session facultative : `@OptionalAuth()`.

As-tu le droit ? Rôle du compte (user.role, plugin admin de better-auth) avec `@Roles` :

@Controller('admin')
@Roles(['admin']) // Vérifié par le guard global : 401 sans session, 403 sans le rôle
export class AdminController {}

Les guards de ce dossier ajoutent les vérifications propres à l'app, après le guard global :

@UseGuards(RestaurantOwnerGuard) // L'utilisateur possède un restaurant (req.restaurantId)

les guards fonctionnent via les décorateurs !
