const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidCin, isValidPhone, isValidCcp, edinarCodeFor } = require('../src/utils/validation');

test('CIN valide : 8 chiffres commençant par 0 ou 1', () => {
  assert.ok(isValidCin('01234567'));
  assert.ok(isValidCin('19876543'));
});

test('CIN invalide : mauvais préfixe, mauvaise longueur ou lettres', () => {
  assert.ok(!isValidCin('29876543'));   // commence par 2
  assert.ok(!isValidCin('0123456'));    // 7 chiffres
  assert.ok(!isValidCin('0123456a'));   // contient une lettre
});

test('Téléphone valide : préfixes 52,53,54,55,40,41', () => {
  assert.ok(isValidPhone('52123456'));
  assert.ok(isValidPhone('41123456'));
});

test('Téléphone invalide : mauvais préfixe ou longueur', () => {
  assert.ok(!isValidPhone('21123456'));  // préfixe interdit
  assert.ok(!isValidPhone('5212345'));   // 7 chiffres
});

test('CCP valide : exactement 20 chiffres', () => {
  assert.ok(isValidCcp('12345678901234567890'));
  assert.ok(!isValidCcp('1234567890'));   // trop court
});

test('Code e-Dinar dérivé de la CIN (clé = somme des chiffres mod 10)', () => {
  // 0+1+2+3+4+5+6+7 = 28 → 28 % 10 = 8
  assert.equal(edinarCodeFor('01234567'), 'EDN-17-01234567-8');
});
