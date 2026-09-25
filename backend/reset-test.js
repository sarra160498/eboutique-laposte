/**
 * Script utilitaire de TEST — supprime un compte pour pouvoir se réinscrire.
 *
 * Utilisation :
 *   node reset-test.js                         → supprime benayedsarra1604@gmail.com
 *   node reset-test.js une.autre@adresse.com   → supprime l'adresse donnée
 *
 * (À exécuter depuis le dossier backend/.)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const email = process.argv[2] || 'benayedsarra1604@gmail.com';

(async () => {
  const cx = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laposte_eboutique',
  });

  const [rows] = await cx.query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    console.log(`Aucun compte trouvé avec l'e-mail ${email} (déjà supprimé).`);
  } else {
    await cx.query('DELETE FROM users WHERE email = ?', [email]);
    console.log(`✅ Compte ${email} (id ${rows[0].id}) supprimé. Tu peux te réinscrire.`);
  }
  await cx.end();
})().catch(e => console.error('Erreur:', e.message));
