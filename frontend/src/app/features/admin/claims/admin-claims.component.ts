import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ClaimsService } from '../../../core/services/claims.service';
import {
  ManagedClaim, ClaimStatus, CLAIM_TYPE_LABEL, CLAIM_STATUS_LABEL, CLAIM_CANNED_REPLIES,
} from '../../../core/models/claim.model';

/** Administration — réclamations reçues des clients et leur traitement. */
@Component({
  selector: 'app-admin-claims',
  imports: [DatePipe],
  templateUrl: './admin-claims.component.html',
  styles: [`
    .desc-cell {
      max-width: 360px;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.45;
    }
    .actions { min-width: 250px; vertical-align: top; }
    .reply { display: flex; flex-direction: column; gap: 8px; }
    .canned {
      width: 100%;
      border: 1.5px solid var(--line, #e2e7f0);
      border-radius: 9px;
      padding: 8px 10px;
      font-family: inherit;
      font-size: 12.5px;
      background: #fff;
      color: var(--ink, #141a2e);
      cursor: pointer;
    }
    .canned:focus { outline: none; border-color: var(--bleu, #1B2D6B); }
    .reply-box {
      width: 100%;
      border: 1.5px solid var(--line, #e2e7f0);
      border-radius: 9px;
      padding: 9px 11px;
      font-family: inherit;
      font-size: 12.5px;
      line-height: 1.4;
      resize: vertical;
      background: #fff;
      color: var(--ink, #141a2e);
      transition: border-color .15s ease;
    }
    .reply-box:focus { outline: none; border-color: var(--bleu, #1B2D6B); }
    .action-btns { display: flex; flex-wrap: wrap; gap: 7px; }
    .action-btns .btn {
      border: none;
      border-radius: 8px;
      padding: 8px 13px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: filter .15s ease;
    }
    .action-btns .btn:hover:not(:disabled) { filter: brightness(.95); }
    .action-btns .btn:disabled { opacity: .45; cursor: default; }
    .btn.reply-btn { background: var(--bleu, #1B2D6B); color: #fff; }
    .btn.take { background: var(--wash-2, #eef1f8); color: var(--bleu, #1B2D6B); }
    .btn.ok { background: #e6f4ea; color: #1f7a52; }
    .done { color: #1f7a52; font-weight: 700; font-size: 13px; white-space: nowrap; }
    .reply-sent {
      margin-top: 8px;
      max-width: 360px;
      padding: 9px 12px;
      background: #f3f5fb;
      border-left: 3px solid var(--bleu, #1B2D6B);
      border-radius: 7px;
      font-size: 12.5px;
      font-weight: 400;
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .reply-sent b { color: var(--bleu, #1B2D6B); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminClaimsComponent {
  private readonly claims = inject(ClaimsService);

  readonly typeLabel = CLAIM_TYPE_LABEL;
  readonly statusLabel = CLAIM_STATUS_LABEL;
  readonly cannedReplies = CLAIM_CANNED_REPLIES;

  readonly all = signal<ManagedClaim[]>([]);
  readonly loading = signal(true);
  /** Brouillons de réponse en cours de saisie, par identifiant de réclamation. */
  readonly drafts = signal<Record<number, string>>({});
  readonly sending = signal<number | null>(null);

  constructor() {
    this.claims.manage().subscribe({
      next: rows => { this.all.set(rows); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** Nombre de réclamations encore ouvertes (badge d'en-tête). */
  openCount(): number {
    return this.all().filter(c => c.status === 'open').length;
  }

  draft(id: number): string {
    return this.drafts()[id] ?? '';
  }

  setDraft(id: number, value: string): void {
    this.drafts.update(d => ({ ...d, [id]: value }));
  }

  /**
   * Traite une réclamation : applique le nouveau statut (facultatif) et envoie
   * le message de réponse saisi (facultatif). Le client reçoit le message.
   */
  apply(claim: ManagedClaim, status?: ClaimStatus): void {
    const response = this.draft(claim.id).trim();
    if (!status && !response) return;
    this.sending.set(claim.id);
    this.claims.process(claim.id, { status, response: response || undefined }).subscribe({
      next: updated => {
        this.sending.set(null);
        this.all.update(list => list.map(c => (c.id === claim.id ? { ...c, ...updated } : c)));
        if (response) this.setDraft(claim.id, '');
      },
      error: () => this.sending.set(null),
    });
  }
}
