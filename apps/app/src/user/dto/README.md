C'est quoi un DTO ?
Un DTO est une classe qui définit la structure des données qui entrent ou sortent de ton application. C'est un contrat qui dit : "Voici exactement les données que j'attends/renvoie".
Pourquoi on en a besoin ?
Imagine que tu reçois des données d'un client. Sans DTO :

Tu ne sais pas si les données sont valides
Tu ne sais pas quels champs sont obligatoires
Tu ne contrôles pas ce qui entre dans ta base de données
Ton code est vulnérable aux injections de données malveillantes

Exemple concret avec create-user.dto.ts
// create-user.dto.ts
export class CreateUserDto {
@IsEmail() // Vérifie que c'est un email valide
@IsNotEmpty() // Ne peut pas être vide
email: string;

@IsString()
@MinLength(8) // Minimum 8 caractères
@Matches(/^(?=._[A-Z])(?=._[0-9])/) // Au moins 1 majuscule et 1 chiffre
password: string;

@IsString()
@MinLength(2)
@MaxLength(50)
firstName: string;

@IsString()
@MinLength(2)
@MaxLength(50)
lastName: string;

@IsOptional() // Ce champ est optionnel
@IsString()
phone?: string;
}
