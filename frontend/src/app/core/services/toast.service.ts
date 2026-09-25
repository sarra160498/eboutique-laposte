import { Injectable, signal } from '@angular/core';

/**
 * Petit service de notification : affiche un message éphémère en bas de
 * l'écran (« Ajouté au panier »). Le composant ToastComponent lit le signal
 * `message` et l'affiche ; le message disparaît tout seul après un délai.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {

  private readonly _message = signal<string | null>(null);
  readonly message = this._message.asReadonly();

  private timer?: ReturnType<typeof setTimeout>;

  /** Affiche `text` pendant `duration` millisecondes. */
  show(text: string, duration = 1700): void {
    this._message.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._message.set(null), duration);
  }
}
