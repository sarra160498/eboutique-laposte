import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from '../../core/services/team.service';
import { ROLE_LABEL } from '../../core/models/user.model';
import { MyTeam } from '../../core/models/team.model';

/**
 * Profil de l'utilisateur : photo modifiable, nom/prénom, informations
 * d'identité fixes et accès rapides. Le contenu s'adapte au type de compte :
 * un client voit son espace client (commandes, réclamations, e-Dinar…), le
 * personnel (agent, livreur, admin) voit son espace pro (outils de travail).
 */
@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly teams = inject(TeamService);

  readonly user = this.auth.user;
  /** Membre du personnel (tout sauf client). */
  readonly isStaff = this.auth.isStaff;
  /** Accès à l'administration (vrai admin ou équipe « admin »). */
  readonly hasAdminAccess = this.auth.hasAdminAccess;
  /** Peut traiter les réclamations (admin ou équipe « SAV »). */
  readonly canHandleClaims = this.auth.canHandleClaims;
  /** Équipes auxquelles le membre du personnel est affecté. */
  readonly myTeams = signal<MyTeam[]>([]);

  // Édition des informations d'identité (CIN, téléphone).
  readonly editInfo = signal(false);
  readonly cinInput = signal('');
  readonly phoneInput = signal('');
  readonly savingInfo = signal(false);
  readonly infoError = signal<string | null>(null);
  readonly infoSaved = signal(false);

  constructor() {
    // Les équipes ne concernent que le personnel.
    if (this.isStaff()) {
      this.teams.mine().subscribe(list => this.myTeams.set(list));
    }
  }

  /** Ouvre le formulaire d'édition, pré-rempli avec les valeurs actuelles. */
  startEdit(): void {
    const u = this.user();
    this.cinInput.set(u?.cin ?? '');
    this.phoneInput.set(u?.phone ?? '');
    this.infoError.set(null);
    this.infoSaved.set(false);
    this.editInfo.set(true);
  }

  cancelEdit(): void {
    this.editInfo.set(false);
    this.infoError.set(null);
  }

  /** Valide et enregistre le CIN et le téléphone. */
  saveInfo(): void {
    const cin = this.cinInput().trim();
    const phone = this.phoneInput().trim();
    if (!/^[01]\d{7}$/.test(cin)) {
      this.infoError.set('Le CIN doit comporter 8 chiffres et commencer par 0 ou 1.');
      return;
    }
    if (!/^(5[2-5]|4[01])\d{6}$/.test(phone)) {
      this.infoError.set('Téléphone : 8 chiffres commençant par 52, 53, 54, 55, 40 ou 41.');
      return;
    }
    this.infoError.set(null);
    this.savingInfo.set(true);
    this.auth.updateProfile({ cin, phone }).subscribe({
      next: () => {
        this.savingInfo.set(false);
        this.editInfo.set(false);
        this.infoSaved.set(true);
      },
      error: err => {
        this.savingInfo.set(false);
        this.infoError.set(err?.error?.message ?? 'Enregistrement impossible.');
      },
    });
  }
  /** Libellé lisible du rôle (ex. « Livreur », « Chef de bureau »). */
  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ROLE_LABEL[role] : '';
  });
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  /** Initiales affichées si aucune photo. */
  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  });

  /** Sélection d'une nouvelle photo → conversion en data URL → envoi à l'API. */
  onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set(null);

    if (!file.type.startsWith('image/')) {
      this.error.set('Veuillez choisir une image.');
      return;
    }
    if (file.size > 1_400_000) {
      this.error.set('Image trop lourde (max ~1,4 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.uploading.set(true);
      this.auth.updateAvatar(reader.result as string).subscribe({
        next: () => this.uploading.set(false),
        error: err => {
          this.uploading.set(false);
          this.error.set(err?.error?.message ?? 'Envoi impossible.');
        },
      });
    };
    reader.readAsDataURL(file);
  }

  /** Supprime la photo (revient aux initiales). */
  removePhoto(): void {
    this.uploading.set(true);
    this.auth.updateAvatar(null).subscribe({
      next: () => this.uploading.set(false),
      error: () => this.uploading.set(false),
    });
  }
}
