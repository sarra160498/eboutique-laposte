import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../core/services/orders.service';
import { OrderStatus, OrderType } from '../../core/models/order.model';
import { STATUS_LABEL } from '../../core/order-status';
import { DinarPipe } from '../../shared/pipes/dinar.pipe';

/**
 * Espace client : historique des commandes boutique et des dépôts de colis.
 *
 * Les données viennent du `OrdersService` (signal persisté). Un filtre permet
 * de n'afficher que les commandes ou que les dépôts ; tout est recalculé
 * automatiquement par le `computed`.
 */
@Component({
  selector: 'app-orders',
  imports: [DatePipe, RouterLink, DinarPipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent {
  private readonly ordersService = inject(OrdersService);

  constructor() {
    // Charge les commandes de l'utilisateur dès l'ouverture de la page.
    this.ordersService.load();
  }

  /** Filtre actif. */
  readonly filter = signal<OrderType | 'all'>('all');

  readonly filters = [
    { value: 'all' as const, label: 'Tout' },
    { value: 'order' as const, label: 'Commandes' },
    { value: 'deposit' as const, label: 'Dépôts' },
  ];

  /** Opérations affichées selon le filtre. */
  readonly visible = computed(() => {
    const all = this.ordersService.orders();
    const f = this.filter();
    return f === 'all' ? all : all.filter(o => o.type === f);
  });

  statusLabel(status: OrderStatus): string {
    return STATUS_LABEL[status];
  }
}
