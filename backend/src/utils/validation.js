/**
 * Règles de validation des identifiants tunisiens et génération du code e-Dinar —
 * fonctions pures, testables unitairement et réutilisées par les contrôleurs.
 */

/** CIN : 8 chiffres commençant par 0 ou 1. */
function isValidCin(cin) {
  return /^[01]\d{7}$/.test(String(cin || ''));
}

/** Téléphone : 8 chiffres commençant par 52, 53, 54, 55, 40 ou 41. */
function isValidPhone(phone) {
  return /^(5[2-5]|4[01])\d{6}$/.test(String(phone || ''));
}

/** CCP (RIP) : 20 chiffres. */
function isValidCcp(ccp) {
  return /^\d{20}$/.test(String(ccp || ''));
}

/**
 * Code e-Dinar dérivé de la CIN (source de vérité côté serveur) :
 * EDN-17-<cin>-<clé>, où la clé = somme des chiffres de la CIN modulo 10.
 */
function edinarCodeFor(cin) {
  const check = String(cin).split('').reduce((s, d) => s + Number(d), 0) % 10;
  return `EDN-17-${cin}-${check}`;
}

module.exports = { isValidCin, isValidPhone, isValidCcp, edinarCodeFor };
