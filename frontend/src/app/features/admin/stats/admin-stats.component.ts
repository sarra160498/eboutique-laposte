import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { StatsService } from '../../../core/services/stats.service';
import { DashboardStats } from '../../../core/models/stats.model';
import { STATUS_LABEL } from '../../../core/order-status';
import { CLAIM_STATUS_LABEL } from '../../../core/models/claim.model';
import { OrderStatus } from '../../../core/models/order.model';
import { ClaimStatus } from '../../../core/models/claim.model';

/** Une part de graphique en anneau (réclamations). */
interface DonutSegment {
  label: string;
  count: number;
  color: string;
  dash: number;
  offset: number;
}

/** Tableau de bord : chiffres clés et graphiques (colis, revenus, réclamations). */
@Component({
  selector: 'app-admin-stats',
  imports: [],
  templateUrl: './admin-stats.component.html',
  styleUrl: './admin-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatsComponent {
  private readonly statsService = inject(StatsService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly statusLabel = STATUS_LABEL;
  readonly claimStatusLabel = CLAIM_STATUS_LABEL;

  /** Couleurs par statut de colis (pour les barres). */
  private readonly statusColor: Record<string, string> = {
    pending: '#e6a700',
    paid: '#2f6df0',
    received: '#8155d6',
    in_transit: '#00a3a3',
    out_for_delivery: '#d9822b',
    delivered: '#1f7a52',
  };
  private readonly claimColor: Record<string, string> = {
    open: '#e6a700',
    in_review: '#2f6df0',
    resolved: '#1f7a52',
  };

  private readonly R = 54;
  private readonly C = 2 * Math.PI * this.R;
  readonly circumference = this.C;
  readonly radius = this.R;

  constructor() {
    this.statsService.dashboard().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  colorFor(status: string): string {
    return this.statusColor[status] ?? '#888';
  }

  labelForStatus(status: string): string {
    return this.statusLabel[status as OrderStatus] ?? status;
  }
  labelForClaim(status: string): string {
    return this.claimStatusLabel[status as ClaimStatus] ?? status;
  }

  /** Plus grand effectif « colis par statut » (pour dimensionner les barres). */
  readonly maxOrderStatus = computed(() =>
    Math.max(1, ...(this.stats()?.ordersByStatus.map(r => r.count) ?? [0])));

  readonly maxRegion = computed(() =>
    Math.max(1, ...(this.stats()?.ordersByRegion.map(r => r.count) ?? [0])));

  readonly maxBureau = computed(() =>
    Math.max(1, ...(this.stats()?.ordersByBureau.map(r => r.count) ?? [0])));

  readonly maxMonthRevenue = computed(() =>
    Math.max(1, ...(this.stats()?.revenueByMonth.map(r => r.revenue) ?? [0])));

  /** Total de réclamations (pour le centre de l'anneau). */
  readonly claimsTotal = computed(() =>
    (this.stats()?.claimsByStatus ?? []).reduce((s, r) => s + r.count, 0));

  /** Segments de l'anneau des réclamations. */
  readonly claimSegments = computed<DonutSegment[]>(() => {
    const rows = this.stats()?.claimsByStatus ?? [];
    const total = this.claimsTotal();
    if (total === 0) return [];
    let acc = 0;
    return rows.map(r => {
      const dash = (r.count / total) * this.C;
      const seg: DonutSegment = {
        label: this.labelForClaim(r.status),
        count: r.count,
        color: this.claimColor[r.status] ?? '#888',
        dash,
        offset: -acc,
      };
      acc += dash;
      return seg;
    });
  });

  /** Format monétaire (dinars). */
  money(n: number): string {
    return `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
  }

  /** « 2026-01 » → « janv. 26 ». */
  monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  }

  methodLabel(method: string): string {
    return method === 'online' ? 'Paiement en ligne' : method === 'onsite' ? 'Au guichet' : method;
  }

  barHeight(revenue: number): number {
    return Math.round((revenue / this.maxMonthRevenue()) * 100);
  }
}
