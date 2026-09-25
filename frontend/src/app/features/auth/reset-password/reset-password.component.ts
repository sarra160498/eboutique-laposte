import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page atteinte via le lien reçu par e-mail : /reinitialiser?token=...
 * L'utilisateur choisit un nouveau mot de passe, validé côté serveur avec le jeton.
 */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  readonly loading = signal(false);
  readonly done = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly missingToken = signal(!this.token);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      this.error.set('Les deux mots de passe ne correspondent pas.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPassword(this.token, password).subscribe({
      next: res => {
        this.loading.set(false);
        this.done.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Impossible de réinitialiser le mot de passe.');
      },
    });
  }
}
