import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { BureauService } from '../../core/services/bureau.service';
import { Bureau, DepositConfirmation } from '../../core/models/bureau.model';
import { ToastService } from '../../core/services/toast.service';
import { PaymentService } from '../../core/services/payment.service';
import { OrdersService } from '../../core/services/orders.service';
import { AuthService } from '../../core/services/auth.service';
import { DepositFormComponent } from './deposit-form/deposit-form.component';

/**
 * Page « Déposer un colis ».
 *
 * Affiche tous les bureaux de poste sur une carte Leaflet (fonds de carte
 * OpenStreetMap, gratuits). L'utilisateur peut :
 *  - rechercher / cliquer un bureau dans la liste de gauche ;
 *  - cliquer une épingle : une petite bulle s'ouvre à côté avec l'adresse et
 *    un bouton « Déposer ici » ;
 *  - ce bouton ouvre le formulaire de dépôt (DepositFormComponent).
 *
 * Leaflet manipule le DOM en dehors d'Angular ; on repasse donc dans la zone
 * Angular (`NgZone.run`) quand un clic dans une bulle doit déclencher l'UI.
 */
@Component({
  selector: 'app-bureaux',
  imports: [DepositFormComponent],
  templateUrl: './bureaux.component.html',
  styleUrl: './bureaux.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BureauxComponent implements AfterViewInit, OnDestroy {
  private readonly bureauService = inject(BureauService);
  private readonly toast = inject(ToastService);
  private readonly payment = inject(PaymentService);
  private readonly orders = inject(OrdersService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  /** Conteneur DOM de la carte. */
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('mapEl');

  /** Texte de recherche. */
  readonly query = signal('');

  /** Bureaux chargés depuis l'API. */
  private readonly bureaux = signal<Bureau[]>([]);

  /** Bureaux affichés dans la liste, filtrés selon la recherche (nom, rue, ville…). */
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.bureaux();
    if (!q) {
      return all;
    }
    return all.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.governorate.toLowerCase().includes(q));
  });

  /** Bureau pour lequel le formulaire de dépôt est ouvert (null = fermé). */
  readonly formBureau = signal<Bureau | null>(null);

  private map?: L.Map;
  /** Marqueurs indexés par id de bureau, pour les retrouver depuis la liste. */
  private readonly markers = new Map<number, L.Marker>();

  constructor() {
    // On récupère les bureaux depuis l'API, puis on place les épingles.
    this.bureauService.getBureaux().subscribe(list => {
      this.bureaux.set(list);
      this.addMarkers();
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.addMarkers();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /** Crée la carte et le fond OpenStreetMap (sans les épingles, ajoutées ensuite). */
  private initMap(): void {
    // Vue centrée sur la Tunisie.
    this.map = L.map(this.mapEl().nativeElement, {
      center: [34.0, 9.6],
      zoom: 6,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(this.map);
  }

  /**
   * Place les épingles sur la carte. Appelée à la fois après la création de la
   * carte (ngAfterViewInit) et après l'arrivée des données (API), car ces deux
   * événements sont asynchrones : on agit dès que les deux sont prêts.
   */
  private addMarkers(): void {
    if (!this.map || this.markers.size > 0 || this.bureaux().length === 0) {
      return;
    }
    for (const bureau of this.bureaux()) {
      const marker = L.marker([bureau.lat, bureau.lng], { icon: this.pinIcon() })
        .addTo(this.map)
        .bindPopup(this.popupContent(bureau));
      this.markers.set(bureau.id, marker);
    }
  }

  /** Épingle personnalisée aux couleurs de la Poste (au lieu de l'icône par défaut). */
  private pinIcon(): L.DivIcon {
    return L.divIcon({
      className: 'bureau-pin',
      html: `<svg viewBox="0 0 24 24" width="34" height="34">
               <path d="M12 2c-3.9 0-7 3.1-7 7 0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7z"
                     fill="#1B2D6B" stroke="#F2C200" stroke-width="1.8"/>
               <circle cx="12" cy="9" r="2.6" fill="#F2C200"/>
             </svg>`,
      iconSize: [34, 34],
      iconAnchor: [17, 32],
      popupAnchor: [0, -30],
    });
  }

  /**
   * Construit le contenu de la bulle d'une épingle : adresse + bouton.
   * On crée un vrai élément DOM pour pouvoir brancher le clic du bouton sur
   * une méthode Angular.
   */
  private popupContent(bureau: Bureau): HTMLElement {
    const el = document.createElement('div');
    el.className = 'bureau-popup';
    el.innerHTML =
      `<strong>${bureau.name}</strong>` +
      `<span>${bureau.address} · ${bureau.city}</span>`;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Déposer ici';
    button.addEventListener('click', () => this.zone.run(() => this.openForm(bureau)));

    el.appendChild(button);
    return el;
  }

  /** Centre la carte sur un bureau et ouvre sa bulle (clic depuis la liste). */
  focusBureau(bureau: Bureau): void {
    this.map?.flyTo([bureau.lat, bureau.lng], 12, { duration: 0.6 });
    this.markers.get(bureau.id)?.openPopup();
  }

  /**
   * Ouvre le formulaire de dépôt pour un bureau. Déposer un colis crée une
   * opération liée au compte : on exige donc d'être connecté, sinon on redirige
   * vers la connexion (et on revient ici ensuite).
   */
  openForm(bureau: Bureau): void {
    this.map?.closePopup();
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/connexion'], { queryParams: { returnUrl: '/deposer' } });
      return;
    }
    this.formBureau.set(bureau);
  }

  closeForm(): void {
    this.formBureau.set(null);
  }

  /**
   * Reçoit la demande validée du formulaire et le mode de paiement choisi.
   *  - sur place : on confirme simplement, le client paiera au guichet ;
   *  - en ligne : on crée l'intention de paiement et on redirige vers e-Dinar.
   */
  onDeposit({ request, amount, method }: DepositConfirmation): void {
    this.closeForm();
    // Plus tard : this.http.post('/api/depots', request)
    console.log('Dépôt de colis', request);

    const reference = this.makeReference();
    const label = `Dépôt Rapid-Poste · ${request.city || request.destination}`;
    const lines = [
      `Colis ${request.weightKg} kg · ${request.scope === 'international' ? 'International' : 'National'}`,
      `Destination : ${request.city}${request.country ? ', ' + request.country : ''}`,
    ];

    if (method === 'onsite') {
      // Paiement au guichet : on enregistre le dépôt (en attente de paiement).
      this.orders.create({
        reference, type: 'deposit', label,
        amount, status: 'pending', paymentMethod: 'onsite', lines,
        bureauId: request.bureauId,
      }).subscribe();
      this.toast.show('Dépôt enregistré — paiement au guichet');
      return;
    }

    // Paiement en ligne : on passe par le guichet e-Dinar.
    this.payment.start({ reference, label, amount, type: 'deposit', lines, bureauId: request.bureauId });
    this.router.navigate(['/e-dinar']);
  }

  /** Génère une référence de dépôt du type « RP-20260614-8421 ». */
  private makeReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RP-${date}-${rand}`;
  }
}
