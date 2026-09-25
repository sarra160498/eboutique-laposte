/** Mode de paiement choisi par l'utilisateur. */
export type PaymentMethod = 'online' | 'onsite';

/**
 * « Intention de paiement » : ce qu'il reste à régler en ligne.
 * Créée par une page (dépôt de colis, panier...) puis lue par la page e-Dinar.
 * Elle transporte aussi de quoi enregistrer l'opération dans l'historique une
 * fois le paiement effectué.
 */
export interface PaymentIntent {
  /** Référence de la commande/du dépôt (ex. « RP-20260614-8421 »). */
  reference: string;
  /** Libellé affiché (« Dépôt Rapid-Poste », « Commande boutique »...). */
  label: string;
  /** Montant à payer, en dinars. */
  amount: number;
  /** Nature de l'opération, pour l'historique. */
  type: 'order' | 'deposit';
  /** Détails (articles ou description du colis) repris dans l'historique. */
  lines?: string[];
  /** Bureau de dépôt (pour un colis), sinon null. */
  bureauId?: number | null;
}
