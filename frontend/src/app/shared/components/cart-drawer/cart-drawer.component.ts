import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ProductCategory } from '../../../core/models/product.model';
import { categoryGradient } from '../../category-visuals';
import { DinarPipe } from '../../pipes/dinar.pipe';

/**
 * Tiroir latéral du panier. Il lit tout son état depuis le CartService
 * (lignes, totaux, ouverture) et lui délègue toutes les actions. Le composant
 * lui-même ne stocke aucune donnée : il se contente d'afficher et de relayer
 * les clics.
 */
@Component({
  selector: 'app-cart-drawer',
  imports: [DinarPipe],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartService);
  private readonly payment = inject(PaymentService);
  private readonly router = inject(Router);

  /** Ferme le tiroir avec la touche Échap. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cart.close();
  }

  /** Passe la commande : crée l'intention de paiement et ouvre le guichet e-Dinar. */
  checkout(): void {
    this.payment.start({
      reference: `CMD-${Math.floor(100000 + Math.random() * 900000)}`,
      label: 'Commande boutique',
      amount: this.cart.total(),
      type: 'order',
      lines: this.cart.lines().map(line => `${line.product.name} ×${line.quantity}`),
    });
    this.cart.close();
    this.router.navigate(['/e-dinar']);
  }

  /** Dégradé de la petite vignette d'une ligne. */
  gradient(category: ProductCategory): string {
    return categoryGradient(category);
  }

  /** Première lettre du nom (sans guillemets/espaces) pour l'avatar. */
  initial(name: string): string {
    return name.replace(/[«»"\s]/g, '').charAt(0);
  }
}
