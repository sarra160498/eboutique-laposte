import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Anime l'apparition d'un élément quand il entre dans le champ de vision.
 *
 * On l'ajoute sur n'importe quel élément : <div appReveal>...</div>
 * La directive pose la classe `.reveal` (état caché, défini dans styles.scss)
 * puis ajoute `.is-visible` dès que l'élément devient visible, via l'API
 * IntersectionObserver du navigateur.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
