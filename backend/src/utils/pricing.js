/**
 * Logique de tarification des envois — fonctions pures (sans base de données),
 * pour pouvoir être testées unitairement et réutilisées par le contrôleur.
 */

/**
 * Diviseur du poids volumétrique (standard international : L×l×h en cm / 5000).
 * Le poids facturé est le plus grand entre le poids réel et le poids volumétrique.
 */
const VOLUMETRIC_DIVISOR = 5000;

/**
 * Poids volumétrique d'un colis à partir de ses dimensions (en cm).
 * Retourne 0 si une dimension manque.
 */
function volumetricWeight(length, width, height) {
  const L = Number(length) || 0;
  const W = Number(width) || 0;
  const H = Number(height) || 0;
  return (L * W * H) / VOLUMETRIC_DIVISOR;
}

/**
 * Poids facturé : le maximum entre le poids réel et le poids volumétrique,
 * arrondi au kilo supérieur, avec un minimum de 1 kg.
 */
function billedKgFor(realWeight, length, width, height) {
  const chargeable = Math.max(Number(realWeight) || 0, volumetricWeight(length, width, height));
  return Math.max(1, Math.ceil(chargeable));
}

/**
 * Total à payer : (prix de base + poids facturé × prix au kilo),
 * majoré par le coefficient d'urgence si l'envoi est urgent.
 */
function computeTotal({ basePrice, pricePerKg, urgentMultiplier, billedKg, urgent }) {
  const subtotal = Number(basePrice) + billedKg * Number(pricePerKg);
  return urgent ? subtotal * Number(urgentMultiplier) : subtotal;
}

module.exports = { VOLUMETRIC_DIVISOR, volumetricWeight, billedKgFor, computeTotal };
