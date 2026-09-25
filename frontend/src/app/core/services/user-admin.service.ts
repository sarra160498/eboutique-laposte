import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Role, User } from '../models/user.model';

/** Gestion des comptes utilisateurs (réservé à l'admin). */
@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/users`;

  /** Liste de tous les comptes. */
  list(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  /** Change le rôle d'un compte (avec son bureau ou sa région selon le rôle). */
  updateRole(id: number, role: Role, bureauId: number | null, regionId: number | null): Observable<User> {
    return this.http.patch<User>(`${this.base}/${id}`, { role, bureauId, regionId });
  }
}
