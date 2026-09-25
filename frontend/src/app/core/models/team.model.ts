import { Role } from './user.model';

/** Mission (fonction) d'une équipe : détermine ses droits/attributions. */
export type TeamMission = 'none' | 'admin' | 'sav';

/** Libellé lisible de chaque mission d'équipe. */
export const TEAM_MISSION_LABEL: Record<TeamMission, string> = {
  none: 'Aucune mission',
  admin: 'Administration (tous droits)',
  sav: 'Service après-vente (réclamations)',
};

/** Une équipe transverse (ex. Service après-vente). */
export interface Team {
  id: number;
  name: string;
  description: string | null;
  mission: TeamMission;
  responsibleUserId: number | null;
  responsibleName: string | null;
  memberCount: number;
}

/** Un membre d'équipe. */
export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

/** Une équipe de l'utilisateur courant (vue « mes équipes »). */
export interface MyTeam {
  id: number;
  name: string;
  description: string | null;
  responsibleName: string | null;
  /** L'utilisateur courant est-il le responsable de cette équipe ? */
  isResponsible: boolean;
}
