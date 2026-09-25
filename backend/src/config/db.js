const mysql = require('mysql2/promise');

/**
 * Pool de connexions MySQL partagé par toute l'application.
 * Un pool réutilise les connexions au lieu d'en ouvrir une par requête : c'est
 * plus rapide et plus sûr sous charge.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'laposte_eboutique',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

module.exports = pool;
