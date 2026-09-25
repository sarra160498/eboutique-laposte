import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Shipment } from '../models/tracking.model';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly http = inject(HttpClient);

  /** Numéro proposé par défaut dans le champ de recherche. */
  readonly exampleNumber = '';

  /**
   * Interroge l'API avec la référence saisie.
   * Retourne null si introuvable ou en cas d'erreur réseau.
   */
  getByNumber(reference: string): Observable<Shipment | null> {
    return this.http
      .get<Shipment>(`${API_BASE_URL}/tracking/${encodeURIComponent(reference.trim().toUpperCase())}`)
      .pipe(catchError(() => of(null)));
  }
}
