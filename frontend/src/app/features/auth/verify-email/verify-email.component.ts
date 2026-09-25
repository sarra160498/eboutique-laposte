import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page atteinte via le lien reçu par e-mail : /verifier-email?token=...
 * Elle appelle l'API pour confirmer l'adresse, puis affiche le résultat.
 */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly state = signal<'loading' | 'success' | 'error'>('loading');
  readonly message = signal<string>('Vérification en cours…');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      this.message.set('Lien invalide : jeton manquant.');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: res => {
        this.state.set('success');
        this.message.set(res.message);
      },
      error: err => {
        this.state.set('error');
        this.message.set(err?.error?.message ?? 'Lien de vérification invalide ou expiré.');
      },
    });
  }
}
