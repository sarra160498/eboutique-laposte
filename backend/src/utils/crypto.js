const crypto = require('crypto');

/**
 * Chiffrement des messages au repos (AES-256-GCM).
 *
 * Les messages sont stockés chiffrés en base : même avec un accès à la base,
 * on ne peut pas les lire sans la clé (dérivée de CHAT_SECRET). GCM fournit en
 * plus un tag d'authentification qui garantit l'intégrité du message.
 *
 * NB : c'est du chiffrement « au repos » (la clé est côté serveur). Pour du
 * bout-en-bout (E2EE), il faudrait gérer des clés par utilisateur côté client.
 */
const KEY = crypto.createHash('sha256')
  .update(process.env.CHAT_SECRET || 'dev-chat-secret-a-changer')
  .digest(); // 32 octets pour AES-256

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return {
    cipher: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decrypt({ cipher, iv, tag }) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(cipher, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '[message illisible]';
  }
}

module.exports = { encrypt, decrypt };
