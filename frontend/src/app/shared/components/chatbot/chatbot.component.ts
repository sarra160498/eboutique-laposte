import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackingService } from '../../../core/services/tracking.service';
import { Shipment } from '../../../core/models/tracking.model';

/** Un message affiché dans la conversation. */
interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

/** Intentions reconnues à partir du message du client. */
type Intent = 'greet' | 'position' | 'delay' | 'damage' | 'problem' | 'help';

/**
 * Assistant colis : chatbot flottant, branché sur le suivi réel.
 *
 * Parcours guidé :
 *  1. le client décrit son besoin (ou dit « j'ai un problème ») ;
 *  2. le bot demande le numéro de colis ;
 *  3. une fois le numéro donné, il affiche le statut et invite à choisir une
 *     des trois questions (position / retard / état) ;
 *  4. chaque question renvoie une réponse adaptée, à partir du suivi réel.
 */
@Component({
  selector: 'app-chatbot',
  imports: [FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent {
  private readonly tracking = inject(TrackingService);

  readonly open = signal(false);
  readonly typing = signal(false);
  readonly draft = signal('');
  readonly messages = signal<ChatMessage[]>([
    { from: 'bot', text: 'Bonjour 👋 Comment puis-je vous aider ?' },
  ]);

  /** Dernier colis retrouvé (pour répondre aux questions de suivi). */
  private lastShipment: Shipment | null = null;

  private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  /** Invitation à choisir une des trois questions. */
  private readonly GUIDE = 'Que souhaitez-vous savoir sur ce colis ? Choisissez une question ci-dessous 👇';
  /** Demande du numéro de colis. */
  private readonly ASK_NUMBER = 'Indiquez-moi le numéro de votre colis et je vérifie son suivi.';

  toggle(): void {
    this.open.update(v => !v);
  }

  /** Envoi d'un message par le client. */
  send(): void {
    const text = this.draft().trim();
    if (!text || this.typing()) return;
    this.push('user', text);
    this.draft.set('');
    this.handle(text);
  }

  /** Réponse rapide (puce cliquable). */
  quick(text: string): void {
    if (this.typing()) return;
    this.push('user', text);
    this.handle(text);
  }

  // ---------- Logique du bot ----------

  private handle(text: string): void {
    const ref = this.extractRef(text);
    const intent = this.detectIntent(text);

    // Un numéro de colis est fourni : on interroge le suivi.
    if (ref) {
      this.lookup(ref, intent);
      return;
    }

    switch (intent) {
      case 'greet':
        this.reply('Avec plaisir ! ' + this.ASK_NUMBER);
        return;

      // Le client a une question précise ou signale un souci.
      case 'position':
      case 'delay':
      case 'damage':
      case 'problem':
        if (this.lastShipment) {
          this.reply(this.answer(intent));
        } else {
          this.reply(this.ASK_NUMBER);
        }
        return;

      default:
        this.reply(
          "Je peux vous renseigner sur votre colis : sa position, un éventuel retard ou son état. "
          + 'Donnez-moi son numéro de suivi (ex. RP-20260101-1234), ou décrivez votre problème.');
    }
  }

  /** Interroge l'API de suivi puis répond selon l'intention. */
  private lookup(ref: string, intent: Intent): void {
    this.typing.set(true);
    this.tracking.getByNumber(ref).subscribe(shipment => {
      this.typing.set(false);
      if (!shipment) {
        this.reply(`Je ne trouve aucun colis au numéro « ${ref} ». Vérifiez le numéro et réessayez.`);
        return;
      }
      this.lastShipment = shipment;

      // Question précise (position / retard / état) : réponse directe.
      if (intent === 'position' || intent === 'delay' || intent === 'damage') {
        this.reply(this.answer(intent));
        return;
      }
      // Simple numéro (ou salutation/souci) : on affiche le statut puis on
      // invite à choisir une des trois questions.
      this.reply(this.positionMsg() + '\n\n' + this.GUIDE);
    });
  }

  /** Détection de l'intention à partir du texte (normalisé sans accents). */
  private detectIntent(text: string): Intent {
    const t = this.normalize(text);
    if (/\b(bonjour|salut|bonsoir|coucou|hello|hi|slm|slem)\b/.test(t)) return 'greet';
    if (/(endommag|endomage|abim|casse|brise|degat|dechir|troue|perce|ouvert|ecrase|mouill|vole|perdu|reclam|plainte)/.test(t)) return 'damage';
    if (/(retard|delai|pourquoi|quand|combien)/.test(t)) return 'delay';
    if (/(\bou\b|arriv|position|suivi|statut|status|livr|recu)/.test(t)) return 'position';
    if (/(probleme|souci|question|aide|besoin)/.test(t)) return 'problem';
    return 'help';
  }

  /** Réponse adaptée à l'intention, pour le dernier colis retrouvé. */
  private answer(intent: Intent): string {
    switch (intent) {
      case 'delay': return this.delayMsg();
      case 'damage': return this.damageMsg();
      default: return this.positionMsg();
    }
  }

  /** Statut / position courante du colis. */
  private positionMsg(): string {
    const s = this.lastShipment!;
    const ref = s.trackingNumber;
    const status = s.status ?? (s.pending ? 'pending' : 'received');
    const base: Record<string, string> = {
      pending: `🕓 Le colis ${ref} est enregistré mais n'a pas encore été pris en charge au bureau.`,
      paid: `🕓 Le colis ${ref} est payé ; il sera bientôt pris en charge au bureau de dépôt.`,
      received: `📦 Le colis ${ref} a été pris en charge au bureau de poste.`,
      in_transit: `🚚 Le colis ${ref} est en transit vers le centre de distribution.`,
      out_for_delivery: `🛵 Le colis ${ref} est en cours de livraison — il devrait arriver très bientôt.`,
      delivered: `✅ Le colis ${ref} a bien été livré au destinataire.`,
    };
    return base[status] ?? base['received'];
  }

  /** Explication d'un éventuel retard, selon le statut. */
  private delayMsg(): string {
    const s = this.lastShipment!;
    const status = s.status ?? (s.pending ? 'pending' : 'received');
    const why: Record<string, string> = {
      pending: "Votre colis n'a pas encore démarré son acheminement (en attente de prise en charge au bureau).",
      paid: "L'acheminement commencera dès la prise en charge de votre colis au guichet.",
      received: "Votre colis vient d'être pris en charge ; l'acheminement va démarrer (comptez 24 à 72 h).",
      in_transit: "Votre colis est en cours d'acheminement entre les centres, ce qui prend en général 24 à 72 h.",
      out_for_delivery: "Aucun retard : votre colis est chez le livreur, livraison prévue dans la journée.",
      delivered: 'Il n\'y a plus de délai : votre colis a déjà été livré 🎉',
    };
    return `⏱️ ${why[status] ?? why['in_transit']}`;
  }

  /** Réponse en cas de colis endommagé / perdu : oriente vers une réclamation. */
  private damageMsg(): string {
    const ref = this.lastShipment?.trackingNumber ? ` (colis ${this.lastShipment.trackingNumber})` : '';
    return `Je suis désolé pour ce désagrément${ref}. `
      + `Si votre colis est endommagé ou perdu, déposez une réclamation depuis la page « Mes réclamations » `
      + `de votre espace client, en précisant le numéro du colis et une courte description. `
      + `Un administrateur la prendra en charge et vous serez notifié par e-mail à chaque étape.`;
  }

  // ---------- Utilitaires ----------

  private extractRef(text: string): string | null {
    // Un jeton contenant au moins 4 chiffres est considéré comme une référence.
    const token = text.split(/\s+/).find(w => (w.match(/\d/g) || []).length >= 4);
    return token ? token.replace(/[^A-Za-z0-9-]/g, '').toUpperCase() : null;
  }

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  private reply(text: string): void {
    this.push('bot', text);
  }

  private push(from: 'bot' | 'user', text: string): void {
    this.messages.update(list => [...list, { from, text }]);
    queueMicrotask(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
