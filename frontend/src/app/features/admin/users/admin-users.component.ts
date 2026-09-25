import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UserAdminService } from '../../../core/services/user-admin.service';
import { BureauService } from '../../../core/services/bureau.service';
import { RegionService } from '../../../core/services/region.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role, ROLE_LABEL, User } from '../../../core/models/user.model';
import { Bureau } from '../../../core/models/bureau.model';
import { Region } from '../../../core/models/region.model';

interface Draft {
  role: Role;
  bureauId: number | null;
  regionId: number | null;
}

/** Rôles qu'un acteur peut attribuer (miroir des règles du back-end). */
const ASSIGNABLE: Record<string, Role[]> = {
  admin_general: ['client', 'agent', 'livreur', 'admin_bureau', 'admin_regional', 'admin_general'],
  admin_regional: ['client', 'agent', 'livreur', 'admin_bureau'],
  admin_bureau: ['client', 'agent', 'livreur'],
};

/** Ordre d'affichage des sous-onglets. */
const TAB_ORDER: Role[] = ['client', 'agent', 'livreur', 'admin_bureau', 'admin_regional', 'admin_general'];

/**
 * Gestion du personnel selon la hiérarchie. La liste et les rôles attribuables
 * dépendent du niveau de l'admin connecté (le back-end applique les mêmes
 * règles). Un changement est « préparé » puis appliqué via « Confirmer ».
 */
@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly userService = inject(UserAdminService);
  private readonly bureauService = inject(BureauService);
  private readonly regionService = inject(RegionService);
  private readonly auth = inject(AuthService);

  readonly roleLabel = ROLE_LABEL;

  readonly users = signal<User[]>([]);
  readonly bureaux = signal<Bureau[]>([]);
  readonly regions = signal<Region[]>([]);
  readonly activeTab = signal<Role>('client');

  private readonly drafts = signal<Record<number, Draft>>({});

  /** Rôles que l'admin courant peut attribuer. */
  readonly assignableRoles = computed<Role[]>(() => ASSIGNABLE[this.auth.role() ?? ''] ?? []);

  /** Sous-onglets visibles : les rôles effectivement présents dans la liste. */
  readonly tabs = computed(() => {
    const present = new Set(this.users().map(u => u.role));
    return TAB_ORDER.filter(role => present.has(role));
  });

  readonly filtered = computed(() => this.users().filter(u => u.role === this.activeTab()));

  /** Bureaux que l'admin courant peut affecter (selon son périmètre). */
  readonly bureauOptions = computed(() => {
    const me = this.auth.user();
    const all = this.bureaux();
    if (!me || me.role === 'admin_general') return all;
    if (me.role === 'admin_regional') return all.filter(b => b.regionId === me.regionId);
    return all.filter(b => b.id === me.bureauId);
  });

  constructor() {
    this.userService.list().subscribe(list => {
      this.users.set(list);
      const tabs = this.tabs();
      if (tabs.length && !tabs.includes(this.activeTab())) {
        this.activeTab.set(tabs[0]);
      }
    });
    this.bureauService.getBureaux().subscribe(list => this.bureaux.set(list));
    this.regionService.list().subscribe(list => this.regions.set(list));
  }

  countFor(role: Role): number {
    return this.users().filter(u => u.role === role).length;
  }

  needsBureau(role: Role): boolean {
    return role === 'agent' || role === 'admin_bureau';
  }
  needsRegion(role: Role): boolean {
    return role === 'admin_regional';
  }

  draftRole(user: User): Role {
    return this.drafts()[user.id]?.role ?? user.role;
  }
  draftBureau(user: User): number | null {
    const d = this.drafts()[user.id];
    return d ? d.bureauId : user.bureauId;
  }
  draftRegion(user: User): number | null {
    const d = this.drafts()[user.id];
    return d ? d.regionId : user.regionId;
  }

  hasChange(user: User): boolean {
    const d = this.drafts()[user.id];
    if (!d) return false;
    return d.role !== user.role
      || (this.needsBureau(d.role) && d.bureauId !== user.bureauId)
      || (this.needsRegion(d.role) && d.regionId !== user.regionId);
  }

  /** Libellé du rattachement actuel (bureau ou région), pour l'affichage. */
  attachmentLabel(user: User): string {
    if (user.bureauId) {
      return this.bureaux().find(b => b.id === user.bureauId)?.city ?? '—';
    }
    if (user.regionId) {
      return 'Région ' + (this.regions().find(r => r.id === user.regionId)?.name ?? '');
    }
    return '—';
  }

  stageRole(user: User, role: string): void {
    const r = role as Role;
    this.setDraft(user.id, {
      role: r,
      bureauId: this.draftBureau(user) ?? this.bureauOptions()[0]?.id ?? null,
      regionId: this.draftRegion(user) ?? this.regions()[0]?.id ?? null,
    });
  }
  stageBureau(user: User, bureauId: string): void {
    this.setDraft(user.id, { role: this.draftRole(user), bureauId: Number(bureauId), regionId: this.draftRegion(user) });
  }
  stageRegion(user: User, regionId: string): void {
    this.setDraft(user.id, { role: this.draftRole(user), bureauId: this.draftBureau(user), regionId: Number(regionId) });
  }

  confirm(user: User): void {
    const d = this.drafts()[user.id];
    if (!d) return;
    const bureauId = this.needsBureau(d.role) ? d.bureauId : null;
    const regionId = this.needsRegion(d.role) ? d.regionId : null;
    this.userService.updateRole(user.id, d.role, bureauId, regionId).subscribe(updated => {
      this.users.update(list => list.map(u => (u.id === user.id ? updated : u)));
      this.clearDraft(user.id);
    });
  }

  cancel(user: User): void {
    this.clearDraft(user.id);
  }

  private setDraft(id: number, draft: Draft): void {
    this.drafts.update(map => ({ ...map, [id]: draft }));
  }
  private clearDraft(id: number): void {
    this.drafts.update(map => {
      const copy = { ...map };
      delete copy[id];
      return copy;
    });
  }
}
