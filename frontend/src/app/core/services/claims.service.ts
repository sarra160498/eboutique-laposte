import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Claim, ClaimPayload, ClaimStatus, ManagedClaim } from '../models/claim.model';

/** Réclamations du client (déclarer un colis abîmé / perdu, suivre le traitement). */
@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/claims`;

  /** Liste les réclamations de l'utilisateur connecté. */
  list(): Observable<Claim[]> {
    return this.http.get<Claim[]>(this.base);
  }

  /** Dépose une nouvelle réclamation. */
  create(payload: ClaimPayload): Observable<Claim> {
    return this.http.post<Claim>(this.base, payload);
  }

  /** Personnel/admin : toutes les réclamations reçues. */
  manage(): Observable<ManagedClaim[]> {
    return this.http.get<ManagedClaim[]>(`${this.base}/manage`);
  }

  /**
   * Personnel/admin : traite une réclamation — nouveau statut et/ou réponse
   * écrite au client (au moins l'un des deux).
   */
  process(id: number, payload: { status?: ClaimStatus; response?: string }): Observable<Claim> {
    return this.http.patch<Claim>(`${this.base}/${id}/status`, payload);
  }
}
