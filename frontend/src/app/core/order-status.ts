import { OrderStatus } from './models/order.model';
import { Role } from './models/user.model';

/** Libellé lisible de chaque statut. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'À régler au guichet',
  paid: 'Payé',
  received: 'Reçu au bureau',
  in_transit: 'En transit',
  out_for_delivery: 'En livraison',
  delivered: 'Livré',
};

/** Une action de changement de statut proposée dans l'espace pro. */
export interface StatusAction {
  status: OrderStatus;
  label: string;
}

/**
 * Étape(s) suivante(s) possible(s) à partir d'un statut donné (chaîne logique
 * du parcours d'un colis). Sert de base aux actions proposées au personnel.
 */
function chainActions(status: OrderStatus): StatusAction[] {
  switch (status) {
    case 'pending':          return [{ status: 'paid', label: 'Confirmer le paiement' }, { status: 'received', label: 'Marquer reçu' }];
    case 'paid':             return [{ status: 'received', label: 'Marquer reçu' }];
    case 'received':         return [{ status: 'in_transit', label: 'Remettre au transporteur' }];
    case 'in_transit':       return [{ status: 'out_for_delivery', label: 'Prendre en livraison' }];
    case 'out_for_delivery': return [{ status: 'delivered', label: 'Marquer livré' }];
    default:                 return [];
  }
}

/** Statuts qu'un rôle a le droit de poser (miroir du back-end). */
const ROLE_STATUSES: Partial<Record<Role, OrderStatus[]>> = {
  agent: ['paid', 'received', 'in_transit'],
  livreur: ['out_for_delivery', 'delivered'],
};

/**
 * Actions de statut autorisées pour un rôle sur une commande donnée.
 * L'admin peut faire avancer toute la chaîne ; l'agent et le livreur ne voient
 * que les transitions qui les concernent.
 */
export function nextActions(status: OrderStatus, role: Role): StatusAction[] {
  // L'admin général supervise : il ne fait pas les opérations terrain.
  // Seuls l'agent (au guichet) et le livreur font avancer le colis.
  const allowed = ROLE_STATUSES[role];
  return allowed ? chainActions(status).filter(action => allowed.includes(action.status)) : [];
}
