import { Role } from './user.model';

/** Un interlocuteur autorisé dans la messagerie. */
export interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  role: Role;
  bureauCity: string | null;
  regionName: string | null;
}

/** Une fiche de l'annuaire du personnel (Contact + e-mail + équipes). */
export interface DirectoryEntry extends Contact {
  email: string;
  teams: string[];
}

/** Un message d'une conversation (déchiffré côté serveur pour l'affichage). */
export interface Message {
  id: number;
  fromMe: boolean;
  content: string;
  createdAt: string;
}
