Une Entity est une classe qui représente ton domaine métier. C'est la version "intelligente" de tes données avec des comportements et de la logique.

Modèle Prisma (dans schema.prisma)
prismamodel User {
id String @id @default(uuid())
email String @unique
password String
firstName String
lastName String
birthDate DateTime
createdAt DateTime @default(now())
isActive Boolean @default(true)
}

Entity (Entité Métier)

export class User {
id: string;
email: string;
private password: string; // Private !
firstName: string;
lastName: string;
birthDate: Date;
createdAt: Date;
isActive: boolean;

// LOGIQUE MÉTIER - C'est ça la différence !

getFullName(): string {
return `${this.firstName} ${this.lastName}`;
}

getAge(): number {
const today = new Date();
const birth = new Date(this.birthDate);
let age = today.getFullYear() - birth.getFullYear();
const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;

}

isAdult(): boolean {
return this.getAge() >= 18;
}

canChangeEmail(): boolean {
// Règle métier : email modifiable seulement après 30 jours
const daysSinceCreation = Math.floor(
(Date.now() - this.createdAt.getTime()) / (1000 _ 60 _ 60 \* 24)
);
return daysSinceCreation >= 30;
}

deactivate(): void {
this.isActive = false;
}

activate(): void {
this.isActive = true;
}

verifyPassword(plainPassword: string, hashFunction: Function): boolean {
return hashFunction(plainPassword, this.password);
}
}

relier l'orm a l'entity
