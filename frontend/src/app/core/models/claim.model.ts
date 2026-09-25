/** Nature de la réclamation. */
export type ClaimType = 'damaged' | 'lost' | 'other';
/** Étape de traitement de la réclamation. */
export type ClaimStatus = 'open' | 'in_review' | 'resolved';

/** Une réclamation déposée par le client. */
export interface Claim {
  id: number;
  /** Numéro du colis concerné (facultatif). */
  reference: string | null;
  type: ClaimType;
  description: string;
  status: ClaimStatus;
  /** Date de dépôt (created_at). */
  date: string;
  /** Réponse écrite du service après-vente (null tant qu'il n'y en a pas). */
  response: string | null;
  /** Date de la réponse. */
  respondedAt: string | null;
}

/** Réclamation vue par le personnel (avec le client concerné). */
export interface ManagedClaim extends Claim {
  customer: string;
  email: string;
}

/** Données envoyées pour déposer une réclamation. */
export interface ClaimPayload {
  reference?: string;
  type: ClaimType;
  description: string;
}

/** Libellés lisibles (affichés dans l'UI). */
export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  damaged: 'Colis abîmé',
  lost: 'Colis perdu',
  other: 'Autre problème',
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  open: 'Ouverte',
  in_review: 'En cours de traitement',
  resolved: 'Résolue',
};

/**
 * Réponses prédéfinies que l'agent peut envoyer au client après avoir pris en
 * charge la réclamation et mené son enquête. Si aucune ne convient, il rédige
 * un message personnalisé.
 */
export const CLAIM_CANNED_REPLIES: { label: string; text: string }[] = [
  {
    label: 'Contenu illégal / interdit',
    text: "Après enquête, il s'avère que votre colis contenait des articles interdits ou illégaux. Conformément à la réglementation postale, il ne peut pas être acheminé et a été retenu par nos services.",
  },
  {
    label: 'Contenu sensible',
    text: "Après vérification, votre colis contenait des articles sensibles nécessitant un contrôle supplémentaire. Nous vous recontacterons dès la fin de cette vérification.",
  },
  {
    label: 'Colis localisé',
    text: 'Bonne nouvelle : après recherche, votre colis a été localisé. Il sera acheminé et livré dans les meilleurs délais.',
  },
  {
    label: 'Colis égaré — indemnisation',
    text: "Après enquête, votre colis a malheureusement été égaré. Nous en sommes désolés ; une procédure d'indemnisation va être engagée et vous sera communiquée.",
  },
  {
    label: 'Transmis au bureau concerné',
    text: 'Votre réclamation a bien été prise en compte et transmise au bureau concerné pour traitement. Nous revenons vers vous très prochainement.',
  },
];
