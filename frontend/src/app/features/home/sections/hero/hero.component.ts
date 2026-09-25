import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Section d'accueil. À gauche le discours et les chiffres clés, à droite le
 * visuel "timbre" qui est la signature graphique du site (style atelier),
 * recoloré aux couleurs de la Poste.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  /** Chiffres affichés sous le discours. */
  readonly stats = [
    { value: '1 000+', label: 'bureaux de poste' },
    { value: '24/48h', label: 'livraison express' },
    { value: '120',    label: 'pays desservis' },
  ];
}
