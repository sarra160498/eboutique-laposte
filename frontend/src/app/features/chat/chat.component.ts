import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { Contact, Message } from '../../core/models/message.model';
import { ROLE_LABEL } from '../../core/models/user.model';

/**
 * Messagerie interne. Liste des interlocuteurs autorisés à gauche, conversation
 * à droite. Les messages sont chiffrés côté serveur (et purgés après 180 jours).
 * La conversation se rafraîchit toutes les 4 s (polling simple).
 */
@Component({
  selector: 'app-chat',
  imports: [DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnDestroy {
  private readonly chat = inject(ChatService);

  readonly roleLabel = ROLE_LABEL;
  readonly contacts = signal<Contact[]>([]);
  readonly active = signal<Contact | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly draft = signal('');

  /** Recherche parmi les conversations (nom, fonction, bureau, région). */
  readonly search = signal('');
  readonly filteredContacts = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.contacts();
    if (!q) return list;
    return list.filter(c => {
      const haystack = [
        c.firstName,
        c.lastName,
        ROLE_LABEL[c.role],
        c.bureauCity ?? '',
        c.regionName ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  private poll?: ReturnType<typeof setInterval>;

  constructor() {
    this.loadContacts();

    // Ouverture directe d'une conversation depuis l'annuaire (bouton
    // « Contacter ») : le contact est transmis via l'état de navigation.
    const fromDirectory = history.state?.contact as Contact | undefined;
    if (fromDirectory?.id) {
      this.open(fromDirectory);
    }

    // Rafraîchit la conversation ouverte et la liste des interlocuteurs
    // régulièrement : ainsi, un nouveau correspondant (ex. un admin qui écrit
    // le premier) apparaît sans avoir à recharger la page.
    this.poll = setInterval(() => {
      this.loadContacts();
      const c = this.active();
      if (c) {
        this.loadMessages(c.id);
      }
    }, 4000);
  }

  private loadContacts(): void {
    this.chat.contacts().subscribe(list => this.contacts.set(list));
  }

  ngOnDestroy(): void {
    clearInterval(this.poll);
  }

  open(contact: Contact): void {
    this.active.set(contact);
    this.messages.set([]);
    this.loadMessages(contact.id);
  }

  private loadMessages(userId: number): void {
    this.chat.conversation(userId).subscribe(list => this.messages.set(list));
  }

  send(): void {
    const contact = this.active();
    const text = this.draft().trim();
    if (!contact || !text) return;
    this.chat.send(contact.id, text).subscribe(message => {
      this.messages.update(list => [...list, message]);
      this.draft.set('');
    });
  }

  location(contact: Contact): string {
    return contact.bureauCity ?? (contact.regionName ? 'Région ' + contact.regionName : 'National');
  }
}
