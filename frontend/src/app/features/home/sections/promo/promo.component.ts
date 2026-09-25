import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/** Bannière promotionnelle : abonnement philatélie. */
@Component({
  selector: 'app-promo',
  imports: [RevealDirective],
  template: `
    <section class="section" style="padding-top: 0">
      <div class="promo" appReveal>
        <div class="text">
          <span class="kk">Nouveau · 2026</span>
          <h3>Abonnement Philatélie</h3>
          <p>Recevez chaque nouvelle émission de timbres tunisiens chez vous, avant tout le monde.</p>
        </div>
        <a href="#" class="cta">
          S'abonner
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>
    </section>
  `,
  styleUrl: './promo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoComponent {}
