import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Ajoute automatiquement le jeton JWT à chaque requête HTTP sortante :
 * « Authorization: Bearer <token> ». Les composants n'ont donc pas à s'en
 * occuper ; les routes protégées de l'API reçoivent toujours le jeton.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
