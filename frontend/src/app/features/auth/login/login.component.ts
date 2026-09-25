import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page de connexion.
 *
 * Le parcours peut comporter deux étapes :
 *  1. email + mot de passe → si la 2FA est activée, l'API renvoie `twoFactor`
 *     et un code OTP est envoyé par e-mail ;
 *  2. saisie du code OTP → ouverture de la session.
 *
 * Gère aussi le cas d'un e-mail non vérifié (proposition de renvoi du lien).
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  /** Étape courante : 'credentials' (identifiants) ou 'otp' (code 2FA). */
  readonly step = signal<'credentials' | 'otp'>('credentials');
  /** Vrai si l'erreur vient d'un e-mail non confirmé (propose le renvoi). */
  readonly needVerification = signal(false);
  /** Message d'information (renvoi d'e-mail, etc.). */
  readonly info = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);
    this.needVerification.set(false);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: result => {
        this.loading.set(false);
        if (result.twoFactor) {
          // La 2FA est activée : on passe à l'écran de saisie du code.
          this.step.set('otp');
          this.info.set(result.message ?? 'Un code de vérification vous a été envoyé.');
          return;
        }
        this.redirectAfterLogin();
      },
      error: err => {
        this.loading.set(false);
        if (err?.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.needVerification.set(true);
        }
        this.error.set(err?.error?.message ?? 'Connexion impossible. Réessayez.');
      },
    });
  }

  submitOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth.verifyOtp(this.form.getRawValue().email, this.otpForm.getRawValue().code).subscribe({
      next: () => this.redirectAfterLogin(),
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Code invalide. Réessayez.');
      },
    });
  }

  /** Renvoie l'e-mail de confirmation au compte non vérifié. */
  resendVerification(): void {
    this.error.set(null);
    this.auth.resendVerification(this.form.getRawValue().email).subscribe({
      next: res => this.info.set(res.message),
      error: () => this.info.set('Si un compte non vérifié existe, un e-mail a été renvoyé.'),
    });
  }

  /** Revient à l'écran identifiants depuis l'écran OTP. */
  backToCredentials(): void {
    this.step.set('credentials');
    this.otpForm.reset();
    this.error.set(null);
  }

  private redirectAfterLogin(): void {
    // Si un returnUrl est fourni (ex. par un garde de route), on le respecte.
    // Sinon, on choisit la page d'accueil selon le type de compte : le personnel
    // (admin, agent, livreur) arrive sur l'Espace pro, le client sur ses commandes.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')
      ?? (this.auth.isStaff() ? '/pro' : '/mes-commandes');
    this.router.navigateByUrl(returnUrl);
  }
}
