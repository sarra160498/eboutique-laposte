import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../core/services/team.service';
import { UserAdminService } from '../../../core/services/user-admin.service';
import { Team, TeamMember, TEAM_MISSION_LABEL } from '../../../core/models/team.model';
import { ROLE_LABEL, User } from '../../../core/models/user.model';

/** Gestion des équipes transverses : création, responsable, membres. */
@Component({
  selector: 'app-admin-teams',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-teams.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTeamsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly teamService = inject(TeamService);
  private readonly userService = inject(UserAdminService);

  readonly roleLabel = ROLE_LABEL;
  readonly missionLabel = TEAM_MISSION_LABEL;
  /** Missions proposées dans les listes déroulantes. */
  readonly missions = ['none', 'admin', 'sav'] as const;
  readonly teams = signal<Team[]>([]);
  /** Personnel (hors clients) — candidats aux équipes. */
  readonly staff = signal<User[]>([]);
  readonly selected = signal<Team | null>(null);
  readonly members = signal<TeamMember[]>([]);

  readonly createForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    mission: ['none'],
  });

  /** Personnel pas encore membre de l'équipe sélectionnée. */
  readonly candidates = computed(() => {
    const ids = new Set(this.members().map(m => m.id));
    return this.staff().filter(u => !ids.has(u.id));
  });

  constructor() {
    this.reloadTeams();
    this.userService.list().subscribe(list => this.staff.set(list.filter(u => u.role !== 'client')));
  }

  private reloadTeams(): void {
    this.teamService.list().subscribe(list => {
      this.teams.set(list);
      const sel = this.selected();
      if (sel) {
        this.selected.set(list.find(t => t.id === sel.id) ?? null);
      }
    });
  }

  select(team: Team): void {
    this.selected.set(team);
    this.teamService.members(team.id).subscribe(m => this.members.set(m));
  }

  createTeam(): void {
    if (this.createForm.invalid) return;
    const { name, description, mission } = this.createForm.getRawValue();
    this.teamService.create(name, description, mission).subscribe(() => {
      this.createForm.reset({ name: '', description: '', mission: 'none' });
      this.reloadTeams();
    });
  }

  removeTeam(team: Team): void {
    this.teamService.remove(team.id).subscribe(() => {
      if (this.selected()?.id === team.id) this.selected.set(null);
      this.reloadTeams();
    });
  }

  addMember(userId: string): void {
    const team = this.selected();
    if (!team || !userId) return;
    this.teamService.addMember(team.id, Number(userId)).subscribe(() => this.refresh(team));
  }

  removeMember(member: TeamMember): void {
    const team = this.selected();
    if (!team) return;
    this.teamService.removeMember(team.id, member.id).subscribe(() => this.refresh(team));
  }

  setResponsible(userId: string): void {
    const team = this.selected();
    if (!team) return;
    this.teamService
      .update(team.id, { name: team.name, description: team.description ?? '', mission: team.mission, responsibleUserId: userId ? Number(userId) : null })
      .subscribe(() => this.refresh(team));
  }

  /** Change la mission (fonction) de l'équipe sélectionnée. */
  setMission(mission: string): void {
    const team = this.selected();
    if (!team) return;
    this.teamService
      .update(team.id, { name: team.name, description: team.description ?? '', mission, responsibleUserId: team.responsibleUserId })
      .subscribe(() => this.refresh(team));
  }

  private refresh(team: Team): void {
    this.teamService.members(team.id).subscribe(m => this.members.set(m));
    this.reloadTeams();
  }
}
