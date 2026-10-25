// Émis par better-auth après la création d'un compte (remplace l'ancien message TCP 'user.created').
// Nom distinct de 'user.created', déjà utilisé en interne pour la création d'un AppUser.
export const AUTH_USER_CREATED_EVENT = 'auth.user.created';

export class AuthUserCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    // Inscription par email uniquement ; avec Google, seul name est connu
    public readonly firstName?: string,
    public readonly lastName?: string,
  ) {}
}
