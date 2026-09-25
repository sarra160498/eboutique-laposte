import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BureauService } from '../../../core/services/bureau.service';
import { Bureau } from '../../../core/models/bureau.model';

/** Gestion des bureaux de poste : ajout, modification, suppression. */
@Component({
  selector: 'app-admin-bureaux',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-bureaux.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBureauxComponent {
  private readonly fb = inject(FormBuilder);
  private readonly bureauService = inject(BureauService);

  readonly bureaux = signal<Bureau[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    governorate: ['', Validators.required],
    lat: [36.8, [Validators.required]],
    lng: [10.18, [Validators.required]],
  });

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.bureauService.getBureaux().subscribe(list => this.bureaux.set(list));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    const id = this.editingId();
    const request = id == null
      ? this.bureauService.create(payload)
      : this.bureauService.update(id, payload);

    request.subscribe(() => {
      this.reload();
      this.resetForm();
    });
  }

  edit(bureau: Bureau): void {
    this.editingId.set(bureau.id);
    this.form.setValue({
      name: bureau.name,
      address: bureau.address,
      city: bureau.city,
      governorate: bureau.governorate,
      lat: bureau.lat,
      lng: bureau.lng,
    });
  }

  remove(bureau: Bureau): void {
    this.bureauService.remove(bureau.id).subscribe(() => this.reload());
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', address: '', city: '', governorate: '', lat: 36.8, lng: 10.18 });
  }
}
