Décider si une requête peut passer ou non AVANT qu'elle arrive au controller.

Es-tu connecté ? (AuthGuard)
As-tu le droit ? (RolesGuard)

@Get('admin')
@UseGuards(AuthGuard, RolesGuard) // Vérifications
@Roles('admin')
adminPanel() {
// Arrive ici SEULEMENT si :
// - User connecté ✅
// - User est admin ✅
}

les guards fonctionnent via les décorateurs !
