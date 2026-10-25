export const USER_DELETED_EVENT = 'user.deleted';

/** Le compte a été supprimé (anonymisé) : chaque module efface ses données sur l'utilisateur */
export class UserDeletedEvent {
  constructor(public readonly userId: string) {}
}
