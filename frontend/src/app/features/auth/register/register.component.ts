import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page d'inscription. Crée un compte via l'API ; en cas de succès, l'utilisateur
 * est automatiquement connecté (le jeton est renvoyé) et redirigé vers son
 * espace client.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  /** Renseigné après l'inscription : message « vérifiez votre e-mail ». */
  readonly done = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    // CIN tunisien : 8 chiffres commençant par 0 ou 1.
    cin: ['', [Validators.required, Validators.pattern(/^[01]\d{7}$/)]],
    // Téléphone : 8 chiffres commençant par 52, 53, 54, 55, 40 ou 41.
    phone: ['', [Validators.required, Validators.pattern(/^(5[2-5]|4[01])\d{6}$/)]],
    // CCP facultatif : RIP tunisien de 20 chiffres.
    ccp: ['', [Validators.pattern(/^\d{20}$/)]],
    // Code e-Dinar : rattaché à l'identité, généré automatiquement à partir de
    // la CIN (lecture seule — le client ne le saisit pas).
    edinarCode: [{ value: '', disabled: true }],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // Dès que la CIN est valide, on renseigne par défaut le code e-Dinar
    // (le e-Dinar est lié à l'identité du client, via sa CIN).
    this.form.controls.cin.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(cin => {
        const code = /^[01]\d{7}$/.test(cin) ? this.makeEdinarCode(cin) : '';
        this.form.controls.edinarCode.setValue(code);
      });
  }

  /** Code e-Dinar déterministe dérivé de la CIN (17 = identifiant La Poste). */
  private makeEdinarCode(cin: string): string {
    const check = cin.split('').reduce((s, d) => s + Number(d), 0) % 10;
    return `EDN-17-${cin}-${check}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: res => {
        this.loading.set(false);
        // Plus de connexion automatique : on invite à confirmer l'e-mail.
        this.done.set(res.message ?? 'Un e-mail de confirmation vous a été envoyé.');
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Inscription impossible. Réessayez.');
      },
    });
  }
}
