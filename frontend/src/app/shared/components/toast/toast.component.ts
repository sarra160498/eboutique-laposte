import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Affiche la notification éphémère du ToastService en bas de l'écran.
 * Visible uniquement quand un message est présent.
 */
@Component({
  selector: 'app-toast',
  template: `
    <div class="toast" [class.show]="toast.message() !== null">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>
      <span>{{ toast.message() }}</span>
    </div>
  `,
  styles: [`
    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(24px);
      background: var(--bleu);
      color: #fff;
      padding: 15px 24px;
      font-weight: 700;
      font-size: 14px;
      opacity: 0;
      pointer-events: none;
      transition: .35s var(--ease);
      z-index: 120;
      display: flex;
      align-items: center;
      gap: 11px;
      border: 2px solid var(--ink);
      box-shadow: 5px 5px 0 var(--jaune);
    }
    .toast.show { opacity: 1; transform: translateX(-50%); }
    .toast svg { width: 18px; height: 18px; color: var(--jaune); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
