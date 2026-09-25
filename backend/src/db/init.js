const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const productsSeed = require('../data/products.seed');
const bureauxSeed = require('../data/bureaux.seed');

/** Répartition des gouvernorats par région (pour les admins régionaux). */
const REGIONS = [
  { id: 1, name: 'Nord', governorates: ['Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Zaghouan', 'Nabeul'] },
  { id: 2, name: 'Centre', governorates: ['Sousse', 'Monastir', 'Mahdia', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Sfax'] },
  { id: 3, name: 'Sud', governorates: ['Gabès', 'Médenine', 'Tataouine', 'Tozeur', 'Kébili', 'Gafsa'] },
];

/**
 * Crée la base, les tables, applique les migrations et insère les données de
 * départ (produits, bureaux, régions, comptes de démonstration par rôle).
 */
async function initDb() {
  const {
    DB_HOST = 'localhost', DB_PORT = 3306, DB_USER = 'root',
    DB_PASSWORD = '', DB_NAME = 'laposte_eboutique',
  } = process.env;

  const cx = await mysql.createConnection({ host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD });
  await cx.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await cx.changeUser({ database: DB_NAME });

  await cx.query(`
    CREATE TABLE IF NOT EXISTS regions (
      id   INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(60) NOT NULL UNIQUE
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL,
      cin VARCHAR(20) NULL,
      phone VARCHAR(20) NULL,
      ccp VARCHAR(30) NULL,
      edinar_code VARCHAR(40) NULL,
      avatar LONGTEXT NULL,
      balance DECIMAL(12,3) NOT NULL DEFAULT 100.000,
      email VARCHAR(160) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'client',
      bureau_id INT NULL,
      region_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(40) NOT NULL,
      category_label VARCHAR(60) NOT NULL,
      name VARCHAR(160) NOT NULL,
      description VARCHAR(255) NOT NULL,
      price DECIMAL(10,3) NOT NULL,
      badge VARCHAR(40) NULL
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS bureaux (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      address VARCHAR(160) NOT NULL,
      city VARCHAR(80) NOT NULL,
      governorate VARCHAR(80) NOT NULL,
      region_id INT NULL,
      lat DECIMAL(9,6) NOT NULL,
      lng DECIMAL(9,6) NOT NULL
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bureau_id INT NULL,
      reference VARCHAR(40) NOT NULL,
      type VARCHAR(20) NOT NULL,
      label VARCHAR(160) NOT NULL,
      amount DECIMAL(10,3) NOT NULL,
      status VARCHAR(20) NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      lines_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      reference VARCHAR(40) NULL,
      type VARCHAR(20) NOT NULL,
      description VARCHAR(1000) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      recipient_id INT NOT NULL,
      amount DECIMAL(12,3) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) NULL,
      responsible_user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      recipient_id INT NOT NULL,
      content_cipher TEXT NOT NULL,
      iv VARCHAR(32) NOT NULL,
      tag VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS shipping_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      zone VARCHAR(20) NOT NULL UNIQUE,
      label VARCHAR(80) NOT NULL,
      base_price DECIMAL(10,3) NOT NULL,
      price_per_kg DECIMAL(10,3) NOT NULL,
      urgent_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.50
    )`);

  await cx.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

  // Migrations (bases déjà existantes).
  await ensureColumn(cx, DB_NAME, 'users', 'cin', 'VARCHAR(20) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'phone', 'VARCHAR(20) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'ccp', 'VARCHAR(30) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'edinar_code', 'VARCHAR(40) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'avatar', 'LONGTEXT NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'balance', 'DECIMAL(12,3) NOT NULL DEFAULT 100.000');
  await ensureColumn(cx, DB_NAME, 'users', 'role', "VARCHAR(20) NOT NULL DEFAULT 'client'");
  await ensureColumn(cx, DB_NAME, 'users', 'bureau_id', 'INT NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'region_id', 'INT NULL');
  await ensureColumn(cx, DB_NAME, 'orders', 'bureau_id', 'INT NULL');
  await ensureColumn(cx, DB_NAME, 'bureaux', 'region_id', 'INT NULL');
  // L'ancien rôle "admin" devient "admin_general".
  await cx.query("UPDATE users SET role = 'admin_general' WHERE role = 'admin'");

  // Mission (fonction) d'une équipe : 'none' (aucune), 'admin' (droits
  // d'administration), 'sav' (service après-vente : traite les réclamations).
  await ensureColumn(cx, DB_NAME, 'teams', 'mission', "VARCHAR(20) NOT NULL DEFAULT 'none'");
  // Attribue une fois la mission SAV à l'équipe service après-vente existante
  // (tant qu'aucune équipe n'a déjà cette mission, pour ne pas écraser un choix).
  const [[{ savCount }]] = await cx.query("SELECT COUNT(*) AS savCount FROM teams WHERE mission = 'sav'");
  if (savCount === 0) {
    await cx.query("UPDATE teams SET mission = 'sav' WHERE name = 'Service après-vente'");
  }

  // Réponse du service après-vente à une réclamation (message reçu par le client).
  await ensureColumn(cx, DB_NAME, 'claims', 'response', 'TEXT NULL');
  await ensureColumn(cx, DB_NAME, 'claims', 'responded_at', 'DATETIME NULL');
  await ensureColumn(cx, DB_NAME, 'claims', 'responded_by', 'INT NULL');

  // Sécurité du compte : vérification d'e-mail, réinitialisation de mot de passe
  // et authentification à deux facteurs (2FA par code OTP).
  await ensureColumn(cx, DB_NAME, 'users', 'email_verified', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn(cx, DB_NAME, 'users', 'verify_token', 'VARCHAR(64) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'verify_expires', 'DATETIME NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'reset_token', 'VARCHAR(64) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'reset_expires', 'DATETIME NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'twofa_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn(cx, DB_NAME, 'users', 'otp_code', 'VARCHAR(6) NULL');
  await ensureColumn(cx, DB_NAME, 'users', 'otp_expires', 'DATETIME NULL');
  // Les comptes déjà en base (dont les comptes de démo) sont considérés comme
  // vérifiés, pour ne pas bloquer la connexion existante.
  await cx.query('UPDATE users SET email_verified = 1 WHERE email_verified = 0 AND verify_token IS NULL');
  // La 2FA est activée par défaut pour les comptes d'administration (sensibles),
  // sauf le compte admin de démonstration (pour faciliter les tests).
  await cx.query("UPDATE users SET twofa_enabled = 1 WHERE role LIKE 'admin_%' AND email <> 'admin@laposte.tn'");
  await cx.query("UPDATE users SET twofa_enabled = 0, otp_code = NULL, otp_expires = NULL WHERE email = 'admin@laposte.tn'");

  await seedIfEmpty(cx, 'products', productsSeed,
    ['id', 'category', 'category_label', 'name', 'description', 'price', 'badge']);
  await seedIfEmpty(cx, 'bureaux', bureauxSeed,
    ['id', 'name', 'address', 'city', 'governorate', 'lat', 'lng']);

  await seedRegions(cx);
  await assignBureauRegions(cx);
  // Backfill : un employé rattaché à un bureau hérite de la région de ce bureau.
  await cx.query(`
    UPDATE users u JOIN bureaux b ON b.id = u.bureau_id
    SET u.region_id = b.region_id
    WHERE u.region_id IS NULL AND u.bureau_id IS NOT NULL`);
  await seedStaff(cx);
  await seedTeams(cx);
  await seedShippingRates(cx);

  await cx.end();
}

async function ensureColumn(cx, db, table, column, definition) {
  const [rows] = await cx.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column]);
  if (rows[0].c === 0) {
    await cx.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function seedIfEmpty(cx, table, rows, columns) {
  const [[{ count }]] = await cx.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  if (count > 0) return;
  const values = rows.map(row => columns.map(c => row[c]));
  await cx.query(`INSERT INTO \`${table}\` (${columns.join(', ')}) VALUES ?`, [values]);
}

async function seedRegions(cx) {
  for (const region of REGIONS) {
    await cx.query('INSERT IGNORE INTO regions (id, name) VALUES (?, ?)', [region.id, region.name]);
  }
}

/** Rattache chaque bureau à sa région d'après son gouvernorat. */
async function assignBureauRegions(cx) {
  for (const region of REGIONS) {
    await cx.query(
      `UPDATE bureaux SET region_id = ?
       WHERE region_id IS NULL AND governorate IN (?)`,
      [region.id, region.governorates]);
  }
}

/** Comptes de démonstration, un par niveau de la hiérarchie. */
async function seedStaff(cx) {
  const staff = [
    { firstName: 'Admin', lastName: 'Général', email: 'admin@laposte.tn', password: 'admin123', role: 'admin_general', bureauId: null, regionId: null },
    { firstName: 'Admin', lastName: 'Centre', email: 'admin.centre@laposte.tn', password: 'region123', role: 'admin_regional', bureauId: null, regionId: 2 },
    { firstName: 'Chef', lastName: 'Bureau Sfax', email: 'chef.sfax@laposte.tn', password: 'chef123', role: 'admin_bureau', bureauId: 5, regionId: 2 },
    { firstName: 'Agent', lastName: 'Sfax', email: 'agent.sfax@laposte.tn', password: 'agent123', role: 'agent', bureauId: 5, regionId: 2 },
    { firstName: 'Livreur', lastName: 'Poste', email: 'livreur@laposte.tn', password: 'livreur123', role: 'livreur', bureauId: null, regionId: null },
  ];
  for (const m of staff) {
    const [exists] = await cx.query('SELECT id FROM users WHERE email = ?', [m.email]);
    if (exists.length > 0) continue;
    const hash = await bcrypt.hash(m.password, 10);
    await cx.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role, bureau_id, region_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.firstName, m.lastName, m.email, hash, m.role, m.bureauId, m.regionId]);
  }
}

/** Crée quelques équipes transverses de démonstration. */
async function seedTeams(cx) {
  const [[{ count }]] = await cx.query('SELECT COUNT(*) AS count FROM teams');
  if (count > 0) return;
  await cx.query(
    'INSERT INTO teams (name, description, mission) VALUES ?',
    [[
      ['Service après-vente', 'Gestion des réclamations clients', 'sav'],
      ['Logistique', 'Acheminement et tournées de livraison', 'none'],
    ]]);
}

/** Grille tarifaire des frais d'envoi, par zone (insérée si la table est vide). */
async function seedShippingRates(cx) {
  const [[{ count }]] = await cx.query('SELECT COUNT(*) AS count FROM shipping_rates');
  if (count > 0) return;
  await cx.query(
    'INSERT INTO shipping_rates (zone, label, base_price, price_per_kg, urgent_multiplier) VALUES ?',
    [[
      ['locale',         'Locale (même gouvernorat)',      4.0,  1.5, 1.50],
      ['regionale',      'Régionale (même région)',        6.0,  2.0, 1.50],
      ['nationale',      'Nationale (autre région)',       8.0,  2.5, 1.50],
      ['internationale', 'Internationale (étranger)',     25.0,  8.0, 1.75],
    ]],
  );
}

module.exports = initDb;
