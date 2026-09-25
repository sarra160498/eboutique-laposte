import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';

/**
 * Coquille de l'application : barres fixes (topbar, header), zone de contenu
 * routée (<router-outlet>), pied de page, puis les éléments superposés
 * (tiroir du panier et notifications) qui doivent rester au-dessus du reste.
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    TopbarComponent,
    HeaderComponent,
    FooterComponent,
    CartDrawerComponent,
    ToastComponent,
    ChatbotComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
