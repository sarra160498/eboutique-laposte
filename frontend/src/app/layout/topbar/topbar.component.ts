import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, Lang } from '../../core/services/i18n.service';

/**
 * Barre supérieure (fond bleu foncé) : message officiel, lien de suivi,
 * mention SSL et sélecteur de langue. Le sélecteur change réellement la langue
 * de l'interface via I18nService.
 */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  protected readonly i18n = inject(I18nService);
  readonly languages: Lang[] = ['FR', 'AR', 'EN'];

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }
}
