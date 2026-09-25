import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Bandeau défilant (marquee) listant les services. La liste est dupliquée
 * dans le template pour que le défilement en boucle soit continu.
 */
@Component({
  selector: 'app-ticker',
  template: `
    <div class="ticker">
      <div class="run">
        @for (label of loop; track $index) {
          <span>{{ label }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .ticker { background: var(--bleu); color: #fff; overflow: hidden; margin-top: 28px; }
    .run { display: flex; white-space: nowrap; animation: run 28s linear infinite; }
    span {
      font-family: 'Fraunces', serif;
      font-weight: 600;
      font-size: 17px;
      padding: 13px 0;
      display: inline-flex;
      align-items: center;
    }
    span::after { content: '✦'; color: var(--jaune); margin: 0 28px; font-size: 12px; }
    @keyframes run { to { transform: translateX(-50%); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TickerComponent {
  private readonly items = ['RAPID-POSTE', 'e-DINAR', 'PHILATÉLIE', 'MANDATS', 'COLIS INTERNATIONAL', 'CCP EN LIGNE'];

  /** Liste dupliquée pour une boucle de défilement sans coupure. */
  readonly loop = [...this.items, ...this.items];
}
