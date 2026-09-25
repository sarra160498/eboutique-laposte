import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/**
 * Configuration globale de l'application (équivalent de l'ancien AppModule).
 * On y branche le routeur et le client HTTP — ce dernier servira à appeler
 * l'API Node.js/MySQL lorsque le back-end sera connecté.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // Précharge les pages (lazy) en arrière-plan : les clics deviennent
      // instantanés au lieu d'attendre le téléchargement de la page.
      withPreloading(PreloadAllModules),
      // Remonte en haut à chaque navigation et gère les ancres (#boutique…).
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ]
};
