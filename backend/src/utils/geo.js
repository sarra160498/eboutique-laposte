/**
 * Utilitaires géographiques pour le calcul des frais d'envoi.
 *
 * On rattache chaque gouvernorat à sa région (Nord / Centre / Sud), ce qui
 * permet de déterminer la « zone tarifaire » d'un envoi en comparant le
 * gouvernorat d'origine (bureau de dépôt) et celui de destination.
 */

/** Les 24 gouvernorats de Tunisie, groupés par région. */
const GOVERNORATE_REGION = {
  // Nord
  'Tunis': 'Nord', 'Ariana': 'Nord', 'Ben Arous': 'Nord', 'Manouba': 'Nord',
  'Bizerte': 'Nord', 'Béja': 'Nord', 'Jendouba': 'Nord', 'Le Kef': 'Nord',
  'Siliana': 'Nord', 'Zaghouan': 'Nord', 'Nabeul': 'Nord',
  // Centre
  'Sousse': 'Centre', 'Monastir': 'Centre', 'Mahdia': 'Centre', 'Kairouan': 'Centre',
  'Kasserine': 'Centre', 'Sidi Bouzid': 'Centre', 'Sfax': 'Centre',
  // Sud
  'Gabès': 'Sud', 'Médenine': 'Sud', 'Tataouine': 'Sud', 'Tozeur': 'Sud',
  'Kébili': 'Sud', 'Gafsa': 'Sud',
};

/** Liste triée des gouvernorats (pour alimenter un menu déroulant côté front). */
const GOVERNORATES = Object.keys(GOVERNORATE_REGION);

/** Région d'un gouvernorat (ou null si inconnu). */
function regionOf(governorate) {
  return GOVERNORATE_REGION[governorate] || null;
}

/**
 * Détermine la zone tarifaire d'un envoi :
 *  - 'internationale' : envoi vers l'étranger ;
 *  - 'locale'         : même gouvernorat que le bureau de dépôt ;
 *  - 'regionale'      : gouvernorat différent mais même région ;
 *  - 'nationale'      : région différente.
 */
function resolveZone(originGovernorate, destinationGovernorate, scope) {
  if (scope === 'international') return 'internationale';
  if (!originGovernorate || !destinationGovernorate) return 'nationale';
  if (originGovernorate === destinationGovernorate) return 'locale';
  const ro = regionOf(originGovernorate);
  const rd = regionOf(destinationGovernorate);
  if (ro && rd && ro === rd) return 'regionale';
  return 'nationale';
}

module.exports = { GOVERNORATES, GOVERNORATE_REGION, regionOf, resolveZone };
