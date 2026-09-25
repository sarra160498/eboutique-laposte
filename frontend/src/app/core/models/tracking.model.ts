/** État d'une étape de suivi dans la chronologie. */
export type TrackingStepState = 'done' | 'active' | 'pending';

/** Une étape du parcours du colis. */
export interface TrackingStep {
  state: TrackingStepState;
  /** Intitulé de l'étape (« En transit »…). */
  title: string;
  /** Précision : lieu et date/heure. */
  detail: string;
}

/** Un envoi suivi par son numéro. */
export interface Shipment {
  trackingNumber: string;
  /** Service utilisé (« Rapid-Poste »…). */
  service: string;
  /** Statut courant (received, in_transit, out_for_delivery, delivered, pending…). */
  status?: string;
  /** Vrai si le colis n'est pas encore pris en charge au bureau. */
  pending?: boolean;
  /** Étapes, de la prise en charge à la livraison. */
  steps: TrackingStep[];
}
