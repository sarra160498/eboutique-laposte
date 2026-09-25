import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/** Bandeau de chiffres clés (preuve de confiance). */
@Component({
  selector: 'app-trust',
  imports: [RevealDirective],
  template: `
    <section class="section" style="padding-top: 0">
      <div class="trust" appReveal>
        @for (stat of stats; track stat.label) {
          <div class="item">
            <h4>{{ stat.value }}</h4>
            <p>{{ stat.label }}</p>
          </div>
        }
      </div>
    </section>
  `,
  styleUrl: './trust.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustComponent {
  readonly stats = [
    { value: '1 000+', label: 'Bureaux de poste' },
    { value: '24/48h', label: 'Rapid-Poste national' },
    { value: '120',    label: 'Pays desservis' },
    { value: '1847',   label: 'Premier service postal' },
  ];
}
