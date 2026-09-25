import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Bureau } from '../models/bureau.model';

/**
 * Bureaux de poste, lus depuis l'API Node.js (`GET /api/bureaux`).
 * Le filtrage par recherche se fait côté composant sur la liste reçue.
 */
@Injectable({ providedIn: 'root' })
export class BureauService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/bureaux`;

  getBureaux(): Observable<Bureau[]> {
    return this.http.get<Bureau[]>(this.base);
  }

  /** Crée un bureau (admin). */
  create(bureau: Omit<Bureau, 'id'>): Observable<Bureau> {
    return this.http.post<Bureau>(this.base, bureau);
  }

  /** Met à jour un bureau (admin). */
  update(id: number, bureau: Omit<Bureau, 'id'>): Observable<Bureau> {
    return this.http.put<Bureau>(`${this.base}/${id}`, bureau);
  }

  /** Supprime un bureau (admin). */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
