import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClaimsService } from '../../core/services/claims.service';
import {
  Claim, ClaimType, CLAIM_TYPE_LABEL, CLAIM_STATUS_LABEL,
} from '../../core/models/claim.model';

/**
 * Espace client — Mes réclamations : déclarer un colis abîmé / perdu et suivre
 * le traitement de ses réclamations.
 */
@Component({
  selector: 'app-claims',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './claims.component.html',
  styleUrl: './claims.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly claims = inject(ClaimsService);

  readonly typeLabel = CLAIM_TYPE_LABEL;
  readonly statusLabel = CLAIM_STATUS_LABEL;

  readonly list = signal<Claim[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    reference: [''],
    type: ['damaged' as ClaimType, Validators.required],
    description: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.claims.list().subscribe({
      next: rows => { this.list.set(rows); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  submit(): void {
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.sent.set(false);

    const v = this.form.getRawValue();
    this.claims.create({
      reference: v.reference.trim() || undefined,
      type: v.type,
      description: v.description.trim(),
    }).subscribe({
      next: claim => {
        this.sending.set(false);
        this.sent.set(true);
        // Ajoute la nouvelle réclamation en tête de liste.
        this.list.update(rows => [claim, ...rows]);
        this.form.reset({ reference: '', type: 'damaged', description: '' });
      },
      error: err => {
        this.sending.set(false);
        this.error.set(err?.error?.message ?? 'Envoi impossible. Réessayez.');
      },
    });
  }
}
