import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { OrdersService } from '../../core/services/orders.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { DinarPipe } from '../../shared/pipes/dinar.pipe';

/**
 * Guichet e-Dinar — la passerelle de paiement en ligne du projet.
 *
 * Deux situations :
 *  - on arrive avec une « intention de paiement » (depuis un dépôt de colis ou
 *    le panier) : on règle ce montant ;
 *  - on arrive directement (lien e-Dinar du menu) : mode « recharge », le
 *    montant est libre.
 *
 * Le formulaire (carte e-Dinar + code) est un Reactive Form. Aucun vrai
 * paiement n'est effectué : à la validation, on affiche un écran de
 * confirmation (la vraie transaction passera par l'API/le prestataire e-Dinar).
 */
/**
 * Validateur de date d'expiration au format JJ/MM/AAAA : vérifie que la date
 * est réelle (jour/mois valides) et qu'elle n'est pas déjà passée.
 */
function futureDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null; // le format est déjà géré par le pattern

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  // Date réellement valide (ex. refuse 31/02/2028).
  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!valid) return { invalidDate: true };

  // La date ne doit pas être déjà passée (aujourd'hui reste accepté).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return { pastDate: true };

  return null;
}

@Component({
  selector: 'app-edinar',
  imports: [ReactiveFormsModule, RouterLink, DinarPipe],
  templateUrl: './edinar.component.html',
  styleUrl: './edinar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EdinarComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payment = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly orders = inject(OrdersService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);

  /** Vrai quand la carte et le titulaire viennent du compte (champs verrouillés). */
  readonly fromAccount = signal(false);

  /** Paiement demandé par une autre page (null = recharge libre). */
  readonly intent = this.payment.intent;

  /** Solde e-Dinar (fictif, viendra du compte client via l'API). */
  readonly balance = signal(120.0);

  /** Paiement effectué : bascule vers l'écran de confirmation. */
  readonly paid = signal(false);
  readonly receipt = signal<{ reference: string; amount: number; label: string } | null>(null);

  readonly form = this.fb.nonNullable.group({
    amount: [20, [Validators.required, Validators.min(1)]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^[0-9 ]{16,23}$/)]],
    holder: ['', Validators.required],
    expiry: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/), futureDateValidator]],
    secretCode: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
  });

  /** Vrai si on règle une commande, faux si on recharge librement. */
  readonly isPayment = computed(() => this.intent() !== null);

  constructor() {
    const intent = this.intent();
    if (intent) {
      // Montant imposé par la commande : on le verrouille.
      this.form.controls.amount.setValue(intent.amount);
      this.form.controls.amount.disable();
    }

    // La carte e-Dinar est liée à l'identité : si un client est connecté, on
    // pré-remplit automatiquement le numéro de carte et le titulaire.
    const user = this.auth.user();
    if (user) {
      this.form.controls.holder.setValue(`${user.firstName} ${user.lastName}`);
      this.form.controls.cardNumber.setValue(this.buildCardNumber(user));
      this.fromAccount.set(true);
    }
  }

  /**
   * Numéro de carte e-Dinar (16 chiffres) déterministe, dérivé de l'identité :
   * 17 (identifiant La Poste) + CIN + complément, formaté par groupes de 4.
   */
  private buildCardNumber(user: User): string {
    const cin = (/(\d{8})/.exec(user.edinarCode ?? '') || [])[1] || String(user.id).padStart(8, '0');
    const digits = ('17' + cin + cin).slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  /** Numéro de carte formaté pour la carte virtuelle (groupes de 4, complété). */
  cardDisplay(): string {
    const digits = this.form.getRawValue().cardNumber.replace(/\D/g, '').slice(0, 16);
    const padded = digits.padEnd(16, '•');
    return padded.replace(/(.{4})/g, '$1 ').trim();
  }

  pay(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const amount = this.form.getRawValue().amount;
    const intent = this.intent();

    const reference = intent?.reference ?? this.makeReference();
    this.receipt.set({
      reference,
      amount,
      label: intent?.label ?? 'Recharge e-Dinar',
    });

    if (intent) {
      // Paiement d'une commande/d'un dépôt : on l'enregistre côté API.
      this.orders.create({
        reference,
        type: intent.type,
        label: intent.label,
        amount,
        status: 'paid',
        paymentMethod: 'online',
        lines: intent.lines ?? [],
        bureauId: intent.bureauId ?? null,
      }).subscribe();
      // Une commande boutique payée : on vide le panier.
      if (intent.type === 'order') {
        this.cart.clear();
      }
    } else {
      // Recharge : on crédite le solde.
      this.balance.update(b => b + amount);
    }

    this.payment.clear();
    this.paid.set(true);
    this.toast.show('Paiement effectué');
  }

  private makeReference(): string {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `EDN-${rand}`;
  }
}
