import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

/**
 * Garde de route par rôle. À utiliser ainsi dans les routes :
 *   canActivate: [roleGuard('admin')]
 *   canActivate: [roleGuard('admin', 'agent', 'livreur')]
 *
 * Si l'utilisateur n'est pas connecté, on l'envoie à la connexion ; s'il est
 * connecté mais sans le bon rôle, on le renvoie à l'accueil.
 */
export function roleGuard(...allowedRoles: Role[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();

    if (!role) {
      return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
    }
    return allowedRoles.includes(role) ? true : router.createUrlTree(['/']);
  };
}

/**
 * Garde générique fondée sur une condition (ex. accès admin via équipe, accès
 * réclamations). Redirige vers la connexion si déconnecté, sinon vers l'accueil.
 */
function conditionGuard(allowed: (auth: AuthService) => boolean): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
    }
    return allowed(auth) ? true : router.createUrlTree(['/']);
  };
}

/** Accès à l'administration : vrai admin OU membre d'une équipe « admin ». */
export const adminAccessGuard: CanActivateFn = conditionGuard(auth => auth.hasAdminAccess());

/** Accès au traitement des réclamations : admin ou équipe « admin »/« SAV ». */
export const claimsAccessGuard: CanActivateFn = conditionGuard(auth => auth.canHandleClaims());
