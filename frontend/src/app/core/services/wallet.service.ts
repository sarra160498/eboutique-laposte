import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { Wallet, TransferPayload } from '../models/wallet.model';

/** Portefeuille e-Dinar : consultation du solde et virements entre comptes. */
@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/wallet`;

  /** Solde + historique des virements de l'utilisateur connecté. */
  get(): Observable<Wallet> {
    return this.http.get<Wallet>(this.base);
  }

  /** Effectue un virement ; renvoie le nouveau solde. */
  transfer(payload: TransferPayload): Observable<{ balance: number; message: string }> {
    return this.http.post<{ balance: number; message: string }>(`${this.base}/transfer`, payload);
  }
}
