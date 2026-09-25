import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Garde de route : empêche d'accéder à une page si l'utilisateur n'est pas
 * connecté. On le redirige alors vers la page de connexion en mémorisant la
 * page demandée (`returnUrl`) pour y revenir après identification.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};
