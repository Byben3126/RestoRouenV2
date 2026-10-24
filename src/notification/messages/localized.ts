import { Language } from '../../user/entities/app-user.entity';

/** Un texte dans chaque langue de l'app : TypeScript signale une traduction oubliée */
export type Localized = Record<Language, string>;
