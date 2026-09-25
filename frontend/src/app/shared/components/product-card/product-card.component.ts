import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Product } from '../../../core/models/product.model';
import { DinarPipe } from '../../pipes/dinar.pipe';
import { categoryGradient } from '../../category-visuals';

/**
 * Carte produit "présentationnelle" : elle reçoit un produit en entrée
 * (`product`) et émet un événement (`add`) quand l'utilisateur clique sur
 * « Ajouter ». Elle ne connaît donc pas le panier — c'est le composant parent
 * (la boutique) qui décide quoi faire. Le favori est un état local d'affichage.
 */
@Component({
  selector: 'app-product-card',
  imports: [DinarPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  /** Produit à afficher (obligatoire). */
  readonly product = input.required<Product>();

  /** Émis quand l'utilisateur veut ajouter le produit au panier. */
  readonly add = output<Product>();

  /** État local : produit mis en favori ou non. */
  readonly liked = signal(false);

  /** Dégradé CSS prêt à l'emploi pour la vignette. */
  readonly gradient = computed(() => categoryGradient(this.product().category));

  toggleLike(): void {
    this.liked.update(value => !value);
  }

  onAdd(): void {
    this.add.emit(this.product());
  }
}
