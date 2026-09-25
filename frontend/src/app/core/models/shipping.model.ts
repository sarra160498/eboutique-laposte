import { ShipmentScope } from './bureau.model';

/** Une ligne de la grille tarifaire (par zone). */
export interface ShippingRate {
  zone: string;
  label: string;
  basePrice: number;
  pricePerKg: number;
  urgentMultiplier: number;
}

/** Réponse de GET /api/shipping/rates. */
export interface ShippingRatesResponse {
  governorates: string[];
  rates: ShippingRate[];
}

/** Corps envoyé à POST /api/shipping/quote. */
export interface ShippingQuoteRequest {
  bureauId?: number;
  originGovernorate?: string;
  destinationGovernorate?: string;
  scope: ShipmentScope;
  weightKg: number;
  length?: number;
  width?: number;
  height?: number;
  urgent?: boolean;
}

/** Détail du tarif calculé, renvoyé par POST /api/shipping/quote. */
export interface ShippingQuote {
  zone: string;
  zoneLabel: string;
  originGovernorate: string | null;
  destinationGovernorate: string | null;
  realWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  billedKg: number;
  basePrice: number;
  pricePerKg: number;
  weightCost: number;
  subtotal: number;
  urgent: boolean;
  urgentMultiplier: number;
  total: number;
}
