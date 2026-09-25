import { Injectable, computed, signal } from '@angular/core';

/** Langues prises en charge par l'interface. */
export type Lang = 'FR' | 'EN' | 'AR';

/**
 * Service d'internationalisation léger (sans dépendance externe).
 *
 * - `lang` : langue courante (persistée dans localStorage) ;
 * - `t(key)` : renvoie la traduction de la clé pour la langue courante ;
 *   comme il lit le signal `lang`, tout texte `{{ i18n.t('...') }}` dans un
 *   template se met à jour automatiquement au changement de langue ;
 * - `dir` : sens d'écriture (rtl pour l'arabe) pour l'attribut dir du document.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly KEY = 'lpt-lang';
  readonly lang = signal<Lang>(this.load());
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.lang() === 'AR' ? 'rtl' : 'ltr'));

  constructor() {
    this.apply(this.lang());
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try { localStorage.setItem(this.KEY, lang); } catch { /* ignore */ }
    this.apply(lang);
  }

  /** Traduction d'une clé (repli sur le français, puis sur la clé brute). */
  t(key: string): string {
    const l = this.lang();
    return DICT[l]?.[key] ?? DICT.FR[key] ?? key;
  }

  private apply(lang: Lang): void {
    const html = document.documentElement;
    html.setAttribute('lang', lang.toLowerCase());
    html.setAttribute('dir', lang === 'AR' ? 'rtl' : 'ltr');
  }

  private load(): Lang {
    try {
      const v = localStorage.getItem(this.KEY) as Lang | null;
      if (v === 'FR' || v === 'EN' || v === 'AR') return v;
    } catch { /* ignore */ }
    return 'FR';
  }
}

/** Dictionnaire des traductions (FR = référence). */
const DICT: Record<Lang, Record<string, string>> = {
  FR: {
    'top.official': 'Intégration officielle — e-Dinar Poste & Rapid-Poste Tunisie',
    'top.track': 'Suivre un envoi',
    'top.ssl': 'Certificat SSL validé',
    'nav.shop': 'Boutique',
    'nav.tracking': 'Suivi',
    'nav.edinar': 'e-Dinar',
    'nav.deposit': 'Déposer un colis',
    'nav.transfers': 'Virements',
    'nav.claims': 'Réclamations',
    'nav.account': 'Espace client',
    'nav.pro': 'Espace pro',
    'nav.messaging': 'Messagerie',
    'nav.directory': 'Annuaire',
    'nav.admin': 'Admin',
    'nav.login': 'Se connecter',
    'foot.tagline': "L'opérateur postal national. Courrier, colis, services financiers et numériques au service de tous les Tunisiens.",
    'foot.shop': 'BOUTIQUE',
    'foot.services': 'SERVICES',
    'foot.help': 'AIDE',
    'foot.contact': 'Contact',
    'foot.rights': 'Maquette de démonstration',
  },
  EN: {
    'top.official': 'Official integration — e-Dinar Poste & Rapid-Poste Tunisia',
    'top.track': 'Track a shipment',
    'top.ssl': 'SSL certificate verified',
    'nav.shop': 'Shop',
    'nav.tracking': 'Tracking',
    'nav.edinar': 'e-Dinar',
    'nav.deposit': 'Drop off a parcel',
    'nav.transfers': 'Transfers',
    'nav.claims': 'Claims',
    'nav.account': 'My account',
    'nav.pro': 'Staff area',
    'nav.messaging': 'Messaging',
    'nav.directory': 'Directory',
    'nav.admin': 'Admin',
    'nav.login': 'Log in',
    'foot.tagline': 'The national postal operator. Mail, parcels, financial and digital services for all Tunisians.',
    'foot.shop': 'SHOP',
    'foot.services': 'SERVICES',
    'foot.help': 'HELP',
    'foot.contact': 'Contact',
    'foot.rights': 'Demonstration mock-up',
  },
  AR: {
    'top.official': 'تكامل رسمي — e-Dinar البريد و Rapid-Poste تونس',
    'top.track': 'تتبّع إرسالية',
    'top.ssl': 'شهادة SSL مُوثّقة',
    'nav.shop': 'المتجر',
    'nav.tracking': 'التتبّع',
    'nav.edinar': 'e-Dinar',
    'nav.deposit': 'إيداع طرد',
    'nav.transfers': 'التحويلات',
    'nav.claims': 'الشكاوى',
    'nav.account': 'مساحة العميل',
    'nav.pro': 'مساحة الموظفين',
    'nav.messaging': 'المراسلة',
    'nav.directory': 'الدليل',
    'nav.admin': 'الإدارة',
    'nav.login': 'تسجيل الدخول',
    'foot.tagline': 'المشغّل البريدي الوطني. البريد والطرود والخدمات المالية والرقمية في خدمة كل التونسيين.',
    'foot.shop': 'المتجر',
    'foot.services': 'الخدمات',
    'foot.help': 'المساعدة',
    'foot.contact': 'اتصل بنا',
    'foot.rights': 'نموذج تجريبي',
  },
};
