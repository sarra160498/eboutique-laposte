import { Injectable, signal } from '@angular/core';
import { PaymentIntent } from '../models/payment.model';

/**
 * Garde l'« intention de paiement » courante : le montant qu'une page veut
 * faire régler en ligne. Une page (dépôt de colis, panier) appelle `start()`
 * puis redirige vers `/e-dinar` ; la page e-Dinar lit `intent()` pour savoir
 * quoi encaisser, puis appelle `clear()` une fois le paiement effectué.
 *
 * C'est ce service qui relie les différentes étapes du « circuit » postal
 * (commande -> paiement e-Dinar) sans les coupler directement entre elles.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly _intent = signal<PaymentIntent | null>(null);
  readonly intent = this._intent.asReadonly();

  start(intent: PaymentIntent): void {
    this._intent.set(intent);
  }

  clear(): void {
    this._intent.set(null);
  }
}
