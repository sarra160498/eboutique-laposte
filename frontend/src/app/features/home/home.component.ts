import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './sections/hero/hero.component';
import { TickerComponent } from './sections/ticker/ticker.component';
import { ServicesComponent } from './sections/services/services.component';
import { ShopComponent } from './sections/shop/shop.component';
import { PromoComponent } from './sections/promo/promo.component';
import { TrustComponent } from './sections/trust/trust.component';

/**
 * Page d'accueil. Elle ne fait qu'assembler les différentes sections, dans
 * l'ordre d'affichage. Hero et ticker sont pleine largeur ; les autres
 * sections sont regroupées dans un conteneur centré (.wrap).
 */
@Component({
  selector: 'app-home',
  imports: [
    HeroComponent,
    TickerComponent,
    ServicesComponent,
    ShopComponent,
    PromoComponent,
    TrustComponent,
  ],
  template: `
    <app-hero />
    <app-ticker />
    <main class="wrap">
      <app-services />
      <app-shop />
      <app-promo />
      <app-trust />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
