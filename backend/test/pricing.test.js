const test = require('node:test');
const assert = require('node:assert/strict');
const { volumetricWeight, billedKgFor, computeTotal } = require('../src/utils/pricing');

test('poids volumétrique = L×l×h / 5000', () => {
  // 50 × 40 × 30 = 60 000 → 60 000 / 5000 = 12 kg
  assert.equal(volumetricWeight(50, 40, 30), 12);
});

test('poids volumétrique = 0 si une dimension manque', () => {
  assert.equal(volumetricWeight(50, 40, 0), 0);
});

test('poids facturé : on prend le poids réel s\'il est plus grand', () => {
  // colis lourd et petit : 5 kg réels vs 0 volumétrique → 5
  assert.equal(billedKgFor(5, 10, 10, 10), 5);
});

test('poids facturé : on prend le volumétrique s\'il est plus grand (colis léger et gros)', () => {
  // 2 kg réels vs 12 kg volumétriques → 12
  assert.equal(billedKgFor(2, 50, 40, 30), 12);
});

test('poids facturé : arrondi au kilo supérieur', () => {
  // 3,2 kg réels → 4
  assert.equal(billedKgFor(3.2, 0, 0, 0), 4);
});

test('poids facturé : minimum de 1 kg', () => {
  assert.equal(billedKgFor(0.3, 0, 0, 0), 1);
});

test('total standard = base + billedKg × prix/kg', () => {
  // 5 + 2 × 1.5 = 8
  const total = computeTotal({ basePrice: 5, pricePerKg: 1.5, urgentMultiplier: 2, billedKg: 2, urgent: false });
  assert.equal(total, 8);
});

test('total urgent = sous-total × coefficient d\'urgence', () => {
  // (5 + 2 × 1.5) × 2 = 16
  const total = computeTotal({ basePrice: 5, pricePerKg: 1.5, urgentMultiplier: 2, billedKg: 2, urgent: true });
  assert.equal(total, 16);
});
