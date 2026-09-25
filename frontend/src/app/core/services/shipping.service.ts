import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  ShippingQuote, ShippingQuoteRequest, ShippingRatesResponse,
} from '../models/shipping.model';

/**
 * Frais d'envoi : consulte la grille tarifaire et calcule le tarif d'un colis
 * (le calcul est fait côté serveur, à partir de la grille stockée en base).
 */
@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/shipping`;

  /** Grille tarifaire + liste des gouvernorats. */
  getRates(): Observable<ShippingRatesResponse> {
    return this.http.get<ShippingRatesResponse>(`${this.base}/rates`);
  }

  /** Calcule les frais d'envoi d'un colis. */
  quote(payload: ShippingQuoteRequest): Observable<ShippingQuote> {
    return this.http.post<ShippingQuote>(`${this.base}/quote`, payload);
  }
}
