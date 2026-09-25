import { PaymentMethod } from './payment.model';

/** Nature de l'opération : achat boutique ou dépôt de colis. */
export type OrderType = 'order' | 'deposit';

/**
 * Statut d'une commande/d'un dépôt, suivant le cycle de vie postal :
 * pending/paid → received (agent) → in_transit (agent) →
 * out_for_delivery (livreur) → delivered (livreur).
 */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'received'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered';

/** Une ligne de l'historique « Mes commandes & dépôts ». */
export interface Order {
  /** Identifiant en base (utile pour changer le statut côté pro). */
  id?: number;
  reference: string;
  type: OrderType;
  /** Libellé court (« Commande boutique », « Dépôt Rapid-Poste · Sfax »...). */
  label: string;
  /** Date ISO. */
  date: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Détails affichés (articles achetés, ou description du colis). */
  lines: string[];
  /** Bureau de dépôt (pour les colis). */
  bureauId?: number | null;
}

/** Commande enrichie pour l'espace pro (nom du client, bureau). */
export interface ManagedOrder extends Order {
  customer: string;
  bureauName: string | null;
}
