import { Injectable, computed, effect, signal } from '@angular/core';
import { Product } from '../models/product.model';

/** Une ligne du panier : un produit + sa quantité. */
export interface CartLine {
  product: Product;
  quantity: number;
}

/**
 * État du panier, géré avec les "signals" d'Angular.
 *
 * - `lines` est l'état de base (la liste des articles).
 * - `count`, `subtotal`, `total`… sont des `computed` : ils se recalculent
 *   automatiquement quand `lines` change. Les composants n'ont donc rien à
 *   synchroniser manuellement, ils lisent simplement ces valeurs.
 * - L'ouverture du tiroir (drawer) est aussi un signal, pour que le header
 *   et le tiroir partagent le même état.
 */
@Injectable({ providedIn: 'root' })
export class CartService {

  /** Frais d'envoi forfaitaires (en dinars). */
  private readonly SHIPPING_FEE = 2.5;
  private readonly STORAGE_KEY = 'lpt-cart';

  /** État de base : les lignes du panier. `_` = privé/modifiable. */
  private readonly _lines = signal<CartLine[]>(this.load());
  /** Version lecture seule exposée aux composants. */
  readonly lines = this._lines.asReadonly();

  constructor() {
    // Persiste le panier à chaque changement : il survit ainsi au rechargement
    // de la page et n'est vidé qu'après un paiement (ou via clear()).
    effect(() => {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._lines()));
      } catch {
        /* localStorage indisponible : on ignore. */
      }
    });
  }

  private load(): CartLine[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  }

  /** Ouverture du tiroir latéral du panier. */
  private readonly _isOpen = signal(false);
  readonly isOpen = this._isOpen.asReadonly();

  /** Nombre total d'articles (badge du header). */
  readonly count = computed(() =>
    this._lines().reduce((sum, line) => sum + line.quantity, 0));

  /** Le panier est-il vide ? */
  readonly isEmpty = computed(() => this._lines().length === 0);

  /** Sous-total des articles. */
  readonly subtotal = computed(() =>
    this._lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0));

  /** Frais d'envoi : 0 si le panier est vide. */
  readonly shipping = computed(() => (this.isEmpty() ? 0 : this.SHIPPING_FEE));

  /** Total à payer. */
  readonly total = computed(() => this.subtotal() + this.shipping());

  /** Ajoute un produit (ou incrémente sa quantité s'il est déjà présent). */
  add(product: Product): void {
    this._lines.update(lines => {
      const existing = lines.find(line => line.product.id === product.id);
      if (existing) {
        return lines.map(line =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line);
      }
      return [...lines, { product, quantity: 1 }];
    });
  }

  /** Modifie la quantité d'une ligne ; la retire si elle tombe à zéro. */
  changeQuantity(productId: number, delta: number): void {
    this._lines.update(lines =>
      lines
        .map(line =>
          line.product.id === productId
            ? { ...line, quantity: line.quantity + delta }
            : line)
        .filter(line => line.quantity > 0));
  }

  /** Retire complètement une ligne du panier. */
  remove(productId: number): void {
    this._lines.update(lines => lines.filter(line => line.product.id !== productId));
  }

  /** Vide le panier. */
  clear(): void {
    this._lines.set([]);
  }

  open(): void { this._isOpen.set(true); }
  close(): void { this._isOpen.set(false); }
}
