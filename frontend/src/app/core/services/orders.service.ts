import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ManagedOrder, Order, OrderStatus } from '../models/order.model';

/** Données envoyées pour créer une commande/un dépôt (la date est posée par le serveur). */
export type NewOrder = Omit<Order, 'date'>;

/**
 * Historique des commandes et dépôts de l'utilisateur connecté.
 *
 * Les données viennent de l'API (`/api/orders`, routes protégées : le serveur
 * ne renvoie que les commandes de l'utilisateur identifié par son jeton). Le
 * jeton est ajouté automatiquement par l'intercepteur HTTP.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/orders`;

  private readonly _orders = signal<Order[]>([]);
  readonly orders = this._orders.asReadonly();

  /** Charge les commandes de l'utilisateur depuis l'API. */
  load(): void {
    this.http.get<Order[]>(this.base).subscribe({
      next: list => this._orders.set(list),
      error: () => this._orders.set([]),
    });
  }

  /** Enregistre une commande/un dépôt et l'ajoute en tête de la liste locale. */
  create(order: NewOrder): Observable<Order> {
    return this.http
      .post<Order>(this.base, order)
      .pipe(tap(saved => this._orders.update(list => [saved, ...list])));
  }

  // --- Espace pro (personnel) ---

  private readonly _managed = signal<ManagedOrder[]>([]);
  /** File de travail du personnel (selon son rôle, renvoyée par l'API). */
  readonly managed = this._managed.asReadonly();

  /** Charge la file de travail (admin : tout ; agent : son bureau ; livreur : en transit). */
  loadManaged(): void {
    this.http.get<ManagedOrder[]>(`${this.base}/manage`).subscribe({
      next: list => this._managed.set(list),
      error: () => this._managed.set([]),
    });
  }

  /** Change le statut d'une commande puis met à jour la file locale. */
  updateStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.base}/${id}/status`, { status }).pipe(
      tap(updated =>
        this._managed.update(list =>
          list.map(order => (order.id === id ? { ...order, status: updated.status } : order)))),
    );
  }
}
