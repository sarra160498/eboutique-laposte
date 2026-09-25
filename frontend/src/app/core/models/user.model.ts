/** Rôles possibles, du plus bas au plus haut dans la hiérarchie. */
export type Role =
  | 'client'
  | 'agent'
  | 'livreur'
  | 'admin_bureau'
  | 'admin_regional'
  | 'admin_general';

/** Libellé lisible de chaque rôle (affiché dans l'UI). */
export const ROLE_LABEL: Record<Role, string> = {
  client: 'Client',
  agent: 'Agent',
  livreur: 'Livreur',
  admin_bureau: 'Chef de bureau',
  admin_regional: 'Admin régional',
  admin_general: 'Admin général',
};

/** Utilisateur connecté (jamais le mot de passe). */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** Bureau de rattachement (agent, chef de bureau). */
  bureauId: number | null;
  /** Région de rattachement (admin régional, et hérité par les employés). */
  regionId: number | null;
  /** Carte d'identité nationale (fixe). */
  cin?: string | null;
  /** Numéro de téléphone (fixe). */
  phone?: string | null;
  /** Numéro de compte courant postal (fixe). */
  ccp?: string | null;
  /** Code e-Dinar rattaché à l'identité (dérivé de la CIN à l'inscription). */
  edinarCode?: string | null;
  /** Photo de profil (data URL), modifiable par le client. */
  avatar?: string | null;
  /** Missions des équipes de l'utilisateur (ex. ['admin', 'sav']). */
  missions?: string[];
}

/** Réponse de l'API après une connexion/OTP réussie (session ouverte). */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Réponse possible de la connexion : soit une session (token + user), soit une
 * demande de 2FA (code OTP à saisir), soit un message d'inscription.
 */
export interface LoginResult {
  token?: string;
  user?: User;
  twoFactor?: boolean;
  email?: string;
  message?: string;
}

/** Réponse générique porteuse d'un simple message. */
export interface MessageResponse {
  message: string;
  needVerification?: boolean;
}

/** Données envoyées pour s'inscrire. */
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  /** Carte d'identité nationale (8 chiffres). */
  cin: string;
  /** Numéro de téléphone (8 chiffres). */
  phone: string;
  /** Numéro de compte courant postal (facultatif). */
  ccp?: string;
  email: string;
  password: string;
}

/** Données envoyées pour se connecter. */
export interface LoginPayload {
  email: string;
  password: string;
}
