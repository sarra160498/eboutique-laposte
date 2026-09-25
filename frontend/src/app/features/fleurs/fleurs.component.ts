import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { OrdersService } from '../../core/services/orders.service';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../../core/models/product.model';
import { DinarPipe } from '../../shared/pipes/dinar.pipe';

/** Prix de la carte de vœux optionnelle. */
const CARD_PRICE = 5.0;

type Step = 'catalogue' | 'form' | 'payment';

@Component({
  selector: 'app-fleurs',
  templateUrl: './fleurs.component.html',
  styleUrl: './fleurs.component.scss',
  imports: [ReactiveFormsModule, DinarPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleursComponent {
  private readonly productService = inject(ProductService);
  private readonly orders = inject(OrdersService);
  private readonly payment = inject(PaymentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly CARD_PRICE = CARD_PRICE;

  /** Tous les produits "fleurs" chargés depuis l'API. */
  private readonly allProducts = toSignal(this.productService.getProducts(), { initialValue: [] as Product[] });
  readonly bouquets = computed(() => this.allProducts().filter(p => p.category === 'fleurs'));

  /** Étape courante du tunnel. */
  readonly step = signal<Step>('catalogue');

  /** Bouquet sélectionné. */
  readonly selected = signal<Product | null>(null);

  /** Formulaire de livraison + carte de vœux. */
  readonly form = this.fb.nonNullable.group({
    recipientName:  ['', Validators.required],
    recipientPhone: ['', Validators.required],
    address:        ['', Validators.required],
    city:           ['', Validators.required],
    withCard:       [false],
    cardMessage:    [''],
  });

  /** Montant total (bouquet + carte si cochée). */
  readonly total = computed(() => {
    const bouquet = this.selected();
    if (!bouquet) return 0;
    return bouquet.price + (this.form.getRawValue().withCard ? CARD_PRICE : 0);
  });

  /** Icônes SVG par occasion (pour l'affichage visuel des bouquets). */
  readonly flowerIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <path d="M12 22V12M12 12C12 12 7 10 7 6a5 5 0 0 1 10 0c0 4-5 6-5 6z"/>
      <path d="M12 12C12 12 8 8 4 10s2 8 8 6M12 12c0 0 4-4 8-2s-2 8-8 6"/>
    </svg>`;

  selectBouquet(bouquet: Product): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/connexion'], { queryParams: { returnUrl: '/fleurs' } });
      return;
    }
    this.selected.set(bouquet);
    this.step.set('form');
  }

  goToPayment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.step.set('payment');
  }

  back(): void {
    if (this.step() === 'form')    this.step.set('catalogue');
    if (this.step() === 'payment') this.step.set('form');
  }

  confirm(method: 'onsite' | 'online'): void {
    const bouquet = this.selected()!;
    const { recipientName, recipientPhone, address, city, withCard, cardMessage } = this.form.getRawValue();
    const amount = this.total();
    const reference = this.makeRef();

    const lines = [
      bouquet.name,
      `Livraison à : ${recipientName} — ${address}, ${city}`,
      `Tél. destinataire : ${recipientPhone}`,
      ...(withCard ? [`Carte de vœux : "${cardMessage}"`] : []),
    ];

    const label = `Fleurs de la Poste — ${bouquet.name}`;

    if (method === 'onsite') {
      this.orders.create({
        reference, type: 'order', label, amount,
        status: 'pending', paymentMethod: 'onsite', lines,
      }).subscribe(() => {
        this.toast.show('Commande enregistrée — paiement au guichet');
        this.router.navigate(['/mes-commandes']);
      });
    } else {
      this.payment.start({ reference, label, amount, type: 'order', lines });
      this.router.navigate(['/e-dinar']);
    }
  }

  private makeRef(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `FLP-${date}-${rand}`;
  }
}
