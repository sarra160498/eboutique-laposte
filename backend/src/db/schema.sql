-- Schéma de la base de données — e-Boutique La Poste Tunisienne
-- (exécuté automatiquement au démarrage du serveur, fourni ici pour référence
--  et pour pouvoir l'importer manuellement, p. ex. via phpMyAdmin).

CREATE DATABASE IF NOT EXISTS laposte_eboutique
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE laposte_eboutique;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
