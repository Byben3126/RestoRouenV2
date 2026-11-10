//worker-not-found.exception.ts

Les exceptions personnalisées sont essentielles pour une bonne gestion des erreurs.

Une exception personnalisée est une classe d'erreur spécifique à ton domaine métier, plus précise qu'un simple throw new Error('...').

Exemple : user-not-found.exception.ts

import { NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
constructor(identifier: string) {
super({
message: 'User not found',
error: 'USER_NOT_FOUND',
identifier: identifier,
timestamp: new Date().toISOString(),
});
}
}

throw new UserNotFoundException(id)
