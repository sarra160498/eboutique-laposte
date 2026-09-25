import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, of, startWith, switchMap } from 'rxjs';
import { Bureau, DepositConfirmation, ShipmentScope } from '../../../core/models/bureau.model';
import { PaymentMethod } from '../../../core/models/payment.model';
import { ShippingQuote } from '../../../core/models/shipping.model';
import { ShippingService } from '../../../core/services/shipping.service';
import { AuthService } from '../../../core/services/auth.service';
import { DinarPipe } from '../../../shared/pipes/dinar.pipe';

/**
 * Formulaire de dépôt d'un colis, en deux étapes dans la même fenêtre :
 *  1. « form »    : saisie des informations du colis (Reactive Forms) ;
 *  2. « payment » : choix du mode de paiement, une fois le tarif calculé.
 *
 * Le tarif est calculé côté serveur (grille tarifaire en base) via
 * ShippingService, et mis à jour en temps réel quand l'utilisateur modifie le
 * poids, les dimensions, la destination ou l'option express.
 */
@Component({
  selector: 'app-deposit-form',
  imports: [ReactiveFormsModule, DinarPipe],
  templateUrl: './deposit-form.component.html',
  styleUrl: './deposit-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepositFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly shipping = inject(ShippingService);
  private readonly auth = inject(AuthService);

  /** Bureau de dépôt sélectionné sur la carte. */
  readonly bureau = input.required<Bureau>();

  /** Émis quand l'utilisateur confirme et choisit un mode de paiement. */
  readonly confirmed = output<DepositConfirmation>();

  /** Émis quand l'utilisateur ferme la modale. */
  readonly close = output<void>();

  /** Étape courante de la modale. */
  readonly step = signal<'form' | 'payment'>('form');

  /** Portée courante, pour adapter l'affichage (champ « Pays »). */
  readonly scope = signal<ShipmentScope>('national');

  /** Liste des gouvernorats (menu déroulant de destination). */
  readonly governorates = signal<string[]>([]);

  /** Estimation détaillée du tarif, recalculée en temps réel. */
  readonly quote = signal<ShippingQuote | null>(null);
  /** Vrai pendant un calcul de tarif. */
  readonly estimating = signal(false);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    weightKg: [1, [Validators.required, Validators.min(0.1)]],
    length: [20, [Validators.min(1)]],
    width: [15, [Validators.min(1)]],
    height: [10, [Validators.min(1)]],
    scope: ['national' as ShipmentScope, Validators.required],
    destination: ['', Validators.required],
    postalCode: ['', Validators.required],
    city: ['', Validators.required],
    destinationGovernorate: ['', Validators.required],
    // Pays : requis seulement si l'envoi est international (voir constructeur).
    country: [''],
    urgent: [false],
  });

  constructor() {
    // L'expéditeur, c'est le client connecté : on pré-remplit son nom/prénom.
    const user = this.auth.user();
    if (user) {
      this.form.patchValue({ firstName: user.firstName, lastName: user.lastName });
    }

    // Charge la grille (surtout la liste des gouvernorats) au démarrage.
    this.shipping.getRates().pipe(takeUntilDestroyed()).subscribe({
      next: res => this.governorates.set(res.governorates),
      error: () => this.governorates.set([]),
    });

    // Bascule national/international : gère les validateurs conditionnels.
    this.form.controls.scope.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => {
        this.scope.set(value);
        const country = this.form.controls.country;
        const gov = this.form.controls.destinationGovernorate;
        if (value === 'international') {
          country.setValidators(Validators.required);
          gov.clearValidators();
          gov.setValue('');
        } else {
          country.clearValidators();
          country.setValue('');
          gov.setValidators(Validators.required);
        }
        country.updateValueAndValidity();
        gov.updateValueAndValidity();
      });

    // Recalcule le tarif en temps réel à chaque changement pertinent.
    // NB : on capture l'erreur DANS le switchMap (of(null)) pour que le flux
    // survive à un calcul impossible (ex. gouvernorat pas encore choisi).
    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        debounceTime(350),
        switchMap(() => {
          const v = this.form.getRawValue();
          // Tant que les infos minimales manquent, on n'appelle pas le serveur.
          const ready = v.weightKg > 0 &&
            (v.scope === 'international' || !!v.destinationGovernorate);
          if (!ready) {
            this.estimating.set(false);
            return of(null);
          }
          this.estimating.set(true);
          return this.shipping.quote({
            bureauId: this.bureau().id,
            scope: v.scope,
            destinationGovernorate: v.scope === 'international' ? undefined : v.destinationGovernorate,
            weightKg: v.weightKg,
            length: v.length,
            width: v.width,
            height: v.height,
            urgent: v.urgent,
          }).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe(q => {
        this.quote.set(q);
        this.estimating.set(false);
      });
  }

  /** Étape 1 -> 2 : valide le formulaire (le tarif est déjà estimé). */
  goToPayment(): void {
    if (this.form.invalid || !this.quote()) {
      this.form.markAllAsTouched();
      return;
    }
    this.step.set('payment');
  }

  /** Montant à régler (tarif calculé par le serveur). */
  amount(): number {
    return this.quote()?.total ?? 0;
  }

  /** Étape 2 : l'utilisateur a choisi son mode de paiement. */
  choosePayment(method: PaymentMethod): void {
    const v = this.form.getRawValue();
    this.confirmed.emit({
      request: {
        bureauId: this.bureau().id,
        ...v,
        country: this.scope() === 'international' ? v.country : undefined,
        destinationGovernorate: this.scope() === 'international' ? undefined : v.destinationGovernorate,
      },
      amount: this.amount(),
      method,
    });
  }
}
