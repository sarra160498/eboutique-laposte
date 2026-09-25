/** Rôles de l'application et regroupements utiles. */
const ROLES = {
  CLIENT: 'client',
  AGENT: 'agent',
  LIVREUR: 'livreur',
  ADMIN_BUREAU: 'admin_bureau',
  ADMIN_REGIONAL: 'admin_regional',
  ADMIN_GENERAL: 'admin_general',
};

/** Les trois niveaux d'administration. */
const ADMIN_ROLES = [ROLES.ADMIN_BUREAU, ROLES.ADMIN_REGIONAL, ROLES.ADMIN_GENERAL];

/** Tout le personnel (employés + admins) — accès à l'espace pro. */
const STAFF_ROLES = [ROLES.AGENT, ROLES.LIVREUR, ...ADMIN_ROLES];

/** Rang hiérarchique : un acteur ne peut gérer que des rangs strictement inférieurs. */
const RANK = {
  client: 0,
  agent: 1,
  livreur: 1,
  admin_bureau: 2,
  admin_regional: 3,
  admin_general: 4,
};

/** Rôles qu'un acteur a le droit d'attribuer, selon son propre rôle. */
const ASSIGNABLE = {
  admin_general: ['client', 'agent', 'livreur', 'admin_bureau', 'admin_regional', 'admin_general'],
  admin_regional: ['client', 'agent', 'livreur', 'admin_bureau'],
  admin_bureau: ['client', 'agent', 'livreur'],
};

module.exports = { ROLES, ADMIN_ROLES, STAFF_ROLES, RANK, ASSIGNABLE };
