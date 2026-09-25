import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  AuthResponse, LoginPayload, LoginResult, MessageResponse, RegisterPayload, User,
} from '../models/user.model';

/**
 * Gère l'authentification côté front.
 *
 * - `register` / `login` appellent l'API ; en cas de succès, on mémorise le
 *   jeton (JWT) et l'utilisateur dans localStorage et dans un signal.
 * - `user` (signal) et `isAuthenticated` (computed) permettent au reste de
 *   l'app de réagir à l'état de connexion (header, garde de route...).
 * - Au rechargement de la page, on restaure la session depuis localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/auth`;

  private readonly TOKEN_KEY = 'lpt-token';
  private readonly USER_KEY = 'lpt-user';

  private readonly _user = signal<User | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Rôle de l'utilisateur courant (ou null). */
  readonly role = computed(() => this._user()?.role ?? null);
  /** Un des trois niveaux d'administration. */
  readonly isAdmin = computed(() => this.role()?.startsWith('admin_') ?? false);
  readonly isGeneralAdmin = computed(() => this.role() === 'admin_general');
  /** Membre du personnel (tout sauf client) — accès à l'espace pro. */
  readonly isStaff = computed(() => {
    const role = this.role();
    return role !== null && role !== 'client';
  });

  /** Missions des équipes de l'utilisateur (ex. ['admin', 'sav']). */
  readonly missions = computed(() => this._user()?.missions ?? []);
  /** Accès à l'administration : vrai admin OU membre d'une équipe « admin ». */
  readonly hasAdminAccess = computed(() => this.isAdmin() || this.missions().includes('admin'));
  /** Peut traiter les réclamations : admin, équipe « admin » ou équipe « SAV ». */
  readonly canHandleClaims = computed(() =>
    this.hasAdminAccess() || this.missions().includes('sav'));

  /**
   * Inscription : ne connecte plus automatiquement. Le compte doit d'abord être
   * activé via le lien reçu par e-mail (renvoie un simple message).
   */
  register(payload: RegisterPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/register`, payload);
  }

  /**
   * Connexion : peut renvoyer soit une session (token + user), soit une demande
   * de 2FA (`twoFactor: true`). On n'ouvre la session que si un token est reçu.
   */
  login(payload: LoginPayload): Observable<LoginResult> {
    return this.http
      .post<LoginResult>(`${this.base}/login`, payload)
      .pipe(tap(result => {
        if (result.token && result.user) {
          this.openSession(result as AuthResponse);
        }
      }));
  }

  /** Étape 2 de la 2FA : valide le code OTP et ouvre la session. */
  verifyOtp(email: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/verify-otp`, { email, code })
      .pipe(tap(response => this.openSession(response)));
  }

  /** Met à jour la photo de profil (data URL) et rafraîchit la session. */
  updateAvatar(avatar: string | null): Observable<{ user: User }> {
    return this.http
      .patch<{ user: User }>(`${this.base}/me/avatar`, { avatar })
      .pipe(tap(res => this.setUser(res.user)));
  }

  /** Met à jour les infos d'identité modifiables (CIN, téléphone). */
  updateProfile(data: { cin: string; phone: string }): Observable<{ user: User }> {
    return this.http
      .patch<{ user: User }>(`${this.base}/me/profile`, data)
      .pipe(tap(res => this.setUser(res.user)));
  }

  /** Remplace l'utilisateur mémorisé (session) et notifie l'app. */
  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  /** Confirme l'adresse e-mail à partir du jeton reçu par lien. */
  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${this.base}/verify-email`, { params: { token } });
  }

  /** Renvoie l'e-mail de confirmation. */
  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/resend-verification`, { email });
  }

  /** Demande un lien de réinitialisation de mot de passe. */
  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/forgot-password`, { email });
  }

  /** Définit un nouveau mot de passe à partir du jeton reçu par lien. */
  resetPassword(token: string, password: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/reset-password`, { token, password });
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }

  /** Jeton courant, utilisé par l'intercepteur HTTP. */
  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Mémorise la session après une connexion/inscription réussie. */
  private openSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this._user.set(response.user);
  }

  /** Restaure l'utilisateur depuis localStorage au démarrage. */
  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
