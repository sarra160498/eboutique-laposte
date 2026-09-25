import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { DashboardStats } from '../models/stats.model';

/** Statistiques du tableau de bord (réservé aux administrateurs). */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/stats`;

  dashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.base);
  }
}
