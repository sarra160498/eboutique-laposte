import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Product, ProductCategory } from '../../../../core/models/product.model';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/**
 * La boutique : barre de filtres + grille de produits.
 *
 * La catégorie sélectionnée est un signal ; `visibleProducts` est un `computed`
 * qui filtre la liste automatiquement quand la sélection change. Chaque carte
 * remonte un événement `add`, que ce composant transmet au panier et confirme
 * par une notification.
 */
@Component({
  selector: 'app-shop',
  imports: [ProductCardComponent, RevealDirective],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent {
  private readonly productService = inject(ProductService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);

  readonly filters = this.productService.getFilters();

  /** Catalogue chargé depuis l'API (signal alimenté par l'Observable HTTP). */
  private readonly products = toSignal(this.productService.getProducts(), { initialValue: [] as Product[] });

  /** Filtre actif ('all' par défaut). */
  readonly activeFilter = signal<ProductCategory | 'all'>('all');

  /** Produits affichés, recalculés selon le filtre actif. */
  readonly visibleProducts = computed(() => {
    const filter = this.activeFilter();
    const list = this.products();
    return filter === 'all'
      ? list
      : list.filter(product => product.category === filter);
  });

  selectFilter(value: ProductCategory | 'all'): void {
    this.activeFilter.set(value);
  }

  /** Ajoute au panier et affiche une confirmation. */
  addToCart(product: Product): void {
    this.cart.add(product);
    this.toast.show('Ajouté au panier');
  }
}
