import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { MyTeam, Team, TeamMember } from '../models/team.model';

/** Gestion des équipes (admin) et consultation de ses propres équipes. */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/teams`;

  list(): Observable<Team[]> {
    return this.http.get<Team[]>(this.base);
  }
  /** Équipes auxquelles l'utilisateur courant est affecté. */
  mine(): Observable<MyTeam[]> {
    return this.http.get<MyTeam[]>(`${this.base}/mine`);
  }
  members(teamId: number): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.base}/${teamId}/members`);
  }
  create(name: string, description: string, mission: string): Observable<Team> {
    return this.http.post<Team>(this.base, { name, description, mission });
  }
  update(teamId: number, data: { name: string; description: string; mission: string; responsibleUserId: number | null }): Observable<unknown> {
    return this.http.put(`${this.base}/${teamId}`, data);
  }
  remove(teamId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${teamId}`);
  }
  addMember(teamId: number, userId: number): Observable<unknown> {
    return this.http.post(`${this.base}/${teamId}/members`, { userId });
  }
  removeMember(teamId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${teamId}/members/${userId}`);
  }
}
