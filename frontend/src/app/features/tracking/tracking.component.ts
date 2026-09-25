import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TrackingService } from '../../core/services/tracking.service';
import { Shipment } from '../../core/models/tracking.model';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingComponent {
  private readonly tracking = inject(TrackingService);

  readonly query = signal(this.tracking.exampleNumber);
  readonly shipment = signal<Shipment | null>(null);
  readonly searched = signal(false);
  readonly loading = signal(false);
  readonly pendingMessage = signal<string | null>(null);

  search(): void {
    const value = this.query().trim();
    if (!value) return;

    this.loading.set(true);
    this.searched.set(false);
    this.pendingMessage.set(null);

    this.tracking.getByNumber(value).subscribe(result => {
      this.loading.set(false);
      this.searched.set(true);

      if (result && (result as any)['pending']) {
        this.shipment.set(null);
        this.pendingMessage.set(
          `Votre colis (${result.trackingNumber}) a bien été enregistré mais n'a pas encore été pris en charge au bureau. Revenez plus tard.`
        );
      } else {
        this.shipment.set(result);
        this.pendingMessage.set(null);
      }
    });
  }
}
