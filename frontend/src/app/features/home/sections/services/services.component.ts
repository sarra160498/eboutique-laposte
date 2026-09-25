import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/** Une carte de service. `icon` identifie le pictogramme à afficher. */
interface ServiceItem {
  number: string;
  title: string;
  text: string;
  icon: 'colis' | 'carte' | 'mandat' | 'bureau';
  /** Route optionnelle : si présente, la carte devient cliquable. */
  link?: string;
}

/** Section "Des services, pas que des timbres" : 4 cartes de services. */
@Component({
  selector: 'app-services',
  imports: [RevealDirective, RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent {
  readonly services: ServiceItem[] = [
    { number: '01', title: 'Colis & Rapid-Poste', text: 'Express national et international, suivi inclus.', icon: 'colis' },
    { number: '02', title: 'e-Dinar & CCP',        text: 'Paiements et recharges 100% en ligne.',        icon: 'carte' },
    { number: '03', title: 'Mandats & transferts',  text: 'Western Union et mandats minute.',             icon: 'mandat' },
    { number: '04', title: 'Déposer un colis',      text: 'Trouvez un bureau sur la carte et déposez.',   icon: 'bureau', link: '/deposer' },
    { number: '05', title: 'Fleurs de la Poste',    text: 'Livraison de bouquets partout en Tunisie.',    icon: 'carte',  link: '/fleurs' },
  ];
}
