/** Body de POST /auth/sign-up/email pour la doc : le hook before de auth.ts en construit le name */
export class SignUpDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  password!: string;
}
