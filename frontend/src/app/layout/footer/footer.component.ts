import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Pied de page : marque, colonnes de liens, réseaux sociaux et mentions. */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  /** Colonnes de liens du pied de page (données -> rendu via @for). */
  readonly columns = [
    { title: 'Boutique', links: ['Timbres', 'Emballages', 'Affranchissement', 'Philatélie'] },
    { title: 'Services', links: ['e-Dinar', 'Suivi de colis', 'Mandats', 'CCP en ligne'] },
    { title: 'Aide',     links: ['Contact', 'Tarifs', 'FAQ', 'CGV'] },
  ];
}
