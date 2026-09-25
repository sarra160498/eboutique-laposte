import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { DirectoryEntry } from '../../core/models/message.model';
import { ROLE_LABEL, Role } from '../../core/models/user.model';

/**
 * Annuaire du personnel : liste de tous les collègues joignables (selon la
 * hiérarchie), avec recherche libre et filtre par fonction. Le bouton
 * « Contacter » ouvre directement une conversation dans la messagerie.
 */
@Component({
  selector: 'app-annuaire',
  imports: [],
  templateUrl: './annuaire.component.html',
  styleUrl: './annuaire.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnuaireComponent {
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);

  readonly roleLabel = ROLE_LABEL;
  readonly entries = signal<DirectoryEntry[]>([]);
  readonly search = signal('');
  readonly roleFilter = signal('');
  readonly regionFilter = signal('');
  readonly teamFilter = signal('');

  /** Fonctions réellement présentes dans l'annuaire (ordre hiérarchique). */
  readonly roles = computed(() => {
    const present = new Set(this.entries().map(e => e.role));
    return (['agent', 'livreur', 'admin_bureau', 'admin_regional', 'admin_general'] as Role[])
      .filter(r => present.has(r));
  });

  /** Régions présentes dans l'annuaire (triées). */
  readonly regions = computed(() =>
    [...new Set(this.entries().map(e => e.regionName).filter((r): r is string => !!r))].sort());

  /** Équipes présentes dans l'annuaire (triées). */
  readonly teams = computed(() =>
    [...new Set(this.entries().flatMap(e => e.teams))].sort());

  /** Résultat filtré par recherche libre + fonction + région + équipe. */
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    const region = this.regionFilter();
    const team = this.teamFilter();
    return this.entries().filter(e => {
      if (role && e.role !== role) return false;
      if (region && e.regionName !== region) return false;
      if (team && !e.teams.includes(team)) return false;
      if (!q) return true;
      const haystack = [
        e.firstName, e.lastName, ROLE_LABEL[e.role],
        e.bureauCity ?? '', e.regionName ?? '', e.email, ...e.teams,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  constructor() {
    this.chat.directory().subscribe(list => this.entries.set(list));
  }

  /** Libellé d'affectation : bureau, sinon région, sinon national. */
  location(e: DirectoryEntry): string {
    return e.bureauCity ?? (e.regionName ? 'Région ' + e.regionName : 'National');
  }

  /** Ouvre la messagerie sur une nouvelle conversation avec ce collègue. */
  contact(e: DirectoryEntry): void {
    this.router.navigate(['/messagerie'], { state: { contact: e } });
  }
}
