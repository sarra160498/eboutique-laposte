import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Contact, DirectoryEntry, Message } from '../models/message.model';

/** Messagerie interne du personnel. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/messages`;

  /** Conversations existantes (personnes déjà contactées au moins une fois). */
  contacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.base}/contacts`);
  }

  /** Annuaire : tout le personnel joignable (selon la hiérarchie). */
  directory(): Observable<DirectoryEntry[]> {
    return this.http.get<DirectoryEntry[]>(`${this.base}/directory`);
  }

  /** Conversation avec un interlocuteur. */
  conversation(userId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.base}/${userId}`);
  }

  /** Envoie un message (chiffré côté serveur). */
  send(toUserId: number, content: string): Observable<Message> {
    return this.http.post<Message>(this.base, { toUserId, content });
  }
}
