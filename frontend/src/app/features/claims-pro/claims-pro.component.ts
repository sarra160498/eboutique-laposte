import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminClaimsComponent } from '../admin/claims/admin-claims.component';

/**
 * Page « Traitement des réclamations » pour le service après-vente (hors
 * administration). Elle réutilise le tableau de gestion des réclamations
 * (AdminClaimsComponent) mais l'habille du cadre de l'espace pro (en-tête,
 * marges), car ce composant est normalement affiché dans la coquille admin.
 */
@Component({
  selector: 'app-claims-pro',
  imports: [AdminClaimsComponent],
  template: `
    <section class="section">
      <div class="wrap">
        <div class="head">
          <span class="kicker">Espace pro — Service après-vente</span>
          <h2>Traitement des réclamations <span class="ar">معالجة الشكاوى</span></h2>
          <p>Les réclamations envoyées par les clients arrivent ici. Traitez-les et mettez à jour leur statut.</p>
        </div>

        <app-admin-claims />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimsProComponent {}
