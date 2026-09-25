import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WalletService } from '../../core/services/wallet.service';
import { Transfer } from '../../core/models/wallet.model';
import { DinarPipe } from '../../shared/pipes/dinar.pipe';

/**
 * Espace client — Virements e-Dinar : consulter son solde et envoyer un montant
 * à un autre compte (identifié par e-mail, téléphone ou code e-Dinar).
 */
@Component({
  selector: 'app-wallet',
  imports: [ReactiveFormsModule, DatePipe, DinarPipe],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletComponent {
  private readonly fb = inject(FormBuilder);
  private readonly wallet = inject(WalletService);

  readonly balance = signal(0);
  readonly history = signal<Transfer[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    recipient: ['', Validators.required],
    amount: [10, [Validators.required, Validators.min(0.1)]],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.wallet.get().subscribe({
      next: w => { this.balance.set(w.balance); this.history.set(w.history); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.success.set(null);

    const v = this.form.getRawValue();
    this.wallet.transfer({ recipient: v.recipient.trim(), amount: v.amount }).subscribe({
      next: res => {
        this.sending.set(false);
        this.balance.set(res.balance);
        this.success.set(res.message);
        this.form.reset({ recipient: '', amount: 10 });
        this.load();
      },
      error: err => {
        this.sending.set(false);
        this.error.set(err?.error?.message ?? 'Virement impossible. Réessayez.');
      },
    });
  }
}
