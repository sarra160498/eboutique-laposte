import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OrdersService } from '../../core/services/orders.service';
import { AuthService } from '../../core/services/auth.service';
import { ManagedOrder, OrderStatus } from '../../core/models/order.model';
import { STATUS_LABEL, StatusAction, nextActions } from '../../core/order-status';
import { DinarPipe } from '../../shared/pipes/dinar.pipe';

/**
 * Espace pro (personnel). Affiche la file de travail renvoyée par l'API selon
 * le rôle :
 *  - agent   : les dépôts de son bureau ;
 *  - livreur : les colis à livrer ;
 *  - admin   : toutes les commandes.
 * Chaque ligne propose les actions de statut autorisées pour le rôle.
 */
@Component({
  selector: 'app-pro',
  imports: [DinarPipe],
  templateUrl: './pro.component.html',
  styleUrl: './pro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProComponent {
  private readonly orders = inject(OrdersService);
  protected readonly auth = inject(AuthService);

  readonly queue = this.orders.managed;

  constructor() {
    this.orders.loadManaged();
  }

  /** Sous-titre selon le rôle. */
  get heading(): string {
    switch (this.auth.role()) {
      case 'agent':   return 'Dépôts de votre bureau à traiter';
      case 'livreur': return 'Colis à livrer';
      default:        return 'Supervision de toutes les commandes';
    }
  }

  statusLabel(status: OrderStatus): string {
    return STATUS_LABEL[status];
  }

  /** Actions de statut proposées pour une commande, selon le rôle. */
  actions(order: ManagedOrder): StatusAction[] {
    const role = this.auth.role();
    return role ? nextActions(order.status, role) : [];
  }

  apply(order: ManagedOrder, status: OrderStatus): void {
    if (order.id != null) {
      this.orders.updateStatus(order.id, status).subscribe();
    }
  }
}
