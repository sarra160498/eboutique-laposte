import { PaymentMethod } from './payment.model';

/** Un bureau de poste, avec ses coordonnées GPS pour l'affichage sur la carte. */
export interface Bureau {
  id: number;
  name: string;
  address: string;
  city: string;
  governorate: string;
  /** Région de rattachement (Nord / Centre / Sud). */
  regionId?: number | null;
  /** Latitude (coordonnée Nord). */
  lat: number;
  /** Longitude (coordonnée Est). */
  lng: number;
}

/** Portée de l'envoi : à l'intérieur de la Tunisie ou vers l'étranger. */
export type ShipmentScope = 'national' | 'international';

/** Données saisies dans le formulaire de dépôt d'un colis. */
export interface DepositRequest {
  bureauId: number;
  firstName: string;
  lastName: string;
  /** Adresse complète de destination. */
  destination: string;
  /** Code postal de destination. */
  postalCode: string;
  /** Ville de destination. */
  city: string;
  /** Gouvernorat de destination (Tunisie) — sert au calcul de la zone tarifaire. */
  destinationGovernorate?: string;
  /** Pays de destination — uniquement pour un envoi international. */
  country?: string;
  /** Poids du colis en kilogrammes. */
  weightKg: number;
  /** Dimensions du colis en centimètres (poids volumétrique). */
  length?: number;
  width?: number;
  height?: number;
  scope: ShipmentScope;
  /** Envoi express (Rapid-Poste). */
  urgent: boolean;
}

/** Résultat du formulaire de dépôt : la demande, son tarif et le mode de paiement. */
export interface DepositConfirmation {
  request: DepositRequest;
  /** Tarif calculé, en dinars. */
  amount: number;
  method: PaymentMethod;
}
