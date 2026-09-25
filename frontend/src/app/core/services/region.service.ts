import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Region } from '../models/region.model';

/** Régions (lecture). Utilisé pour affecter un admin régional. */
@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly http = inject(HttpClient);

  list(): Observable<Region[]> {
    return this.http.get<Region[]>(`${API_BASE_URL}/regions`);
  }
}
