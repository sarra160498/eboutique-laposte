import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Coquille de l'espace d'administration : un en-tête, des onglets, et la zone
 * de contenu (router-outlet) qui affiche la sous-page choisie (produits,
 * bureaux, utilisateurs, commandes).
 */
@Component({
  selector: 'app-admin',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <section class="section">
      <div class="wrap">
        <div class="head">
          <span class="kicker">Administration</span>
          <h2>Tableau de bord <span class="ar">الإدارة</span></h2>
        </div>

        <nav class="admin-tabs">
          <a routerLink="tableau-de-bord" routerLinkActive="on">Tableau de bord</a>
          <!-- Catalogue & réseau : national, donc réservé à l'admin général. -->
          @if (auth.isGeneralAdmin()) {
            <a routerLink="produits" routerLinkActive="on">Produits</a>
            <a routerLink="bureaux" routerLinkActive="on">Bureaux</a>
          }
          <a routerLink="utilisateurs" routerLinkActive="on">Personnel</a>
          @if (auth.isGeneralAdmin()) {
            <a routerLink="equipes" routerLinkActive="on">Équipes</a>
          }
          <a routerLink="commandes" routerLinkActive="on">Commandes</a>
          <a routerLink="reclamations" routerLinkActive="on">Réclamations</a>
        </nav>

        <router-outlet />
      </div>
    </section>
  `,
  styles: [`
    .admin-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
    .admin-tabs a {
      padding: 10px 18px;
      border: 2px solid var(--ink);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--ink);
      transition: .15s var(--ease);
    }
    .admin-tabs a:hover { background: rgba(20, 26, 46, .07); }
    .admin-tabs a.on { background: var(--bleu); color: #fff; border-color: var(--bleu); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  protected readonly auth = inject(AuthService);
}
