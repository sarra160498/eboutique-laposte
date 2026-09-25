import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrdersService } from '../../../core/services/orders.service';
import { OrderStatus } from '../../../core/models/order.model';
import { STATUS_LABEL } from '../../../core/order-status';
import { DinarPipe } from '../../../shared/pipes/dinar.pipe';

/** Vue d'ensemble (lecture seule) de toutes les commandes et dépôts. */
@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, DinarPipe],
  templateUrl: './admin-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent {
  private readonly orders = inject(OrdersService);

  readonly all = this.orders.managed;

  constructor() {
    // En tant qu'admin, la file « manage » renvoie toutes les commandes.
    this.orders.loadManaged();
  }

  statusLabel(status: OrderStatus): string {
    return STATUS_LABEL[status];
  }
}
