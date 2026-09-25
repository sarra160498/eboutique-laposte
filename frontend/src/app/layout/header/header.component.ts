import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';

/**
 * En-tête principal collant (sticky) : logo, navigation, et actions
 * (recherche, compte, panier). Le badge du panier et l'ouverture du tiroir
 * sont branchés sur le CartService partagé.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  /** Passe à true dès qu'on a défilé : ajoute une ombre/bordure au header. */
  readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 10);
  }

  /** Déconnexion : on efface la session et on retourne à l'accueil. */
  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
