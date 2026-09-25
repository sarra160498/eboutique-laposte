# API — e-Boutique La Poste Tunisienne

Back-end **Node.js / Express / MySQL** du projet. Gère pour l'instant
l'**authentification** (inscription, connexion, profil).

## Prérequis

- Node.js 18+
- Un serveur **MySQL** démarré (par exemple via **XAMPP**, **WAMP**, ou le
  service MySQL). Aucune création manuelle de base n'est nécessaire : le serveur
  crée la base `laposte_eboutique` et la table `users` au démarrage.

## Démarrage

```bash
cd backend
npm install
# Copier la config et l'adapter (utilisateur/mot de passe MySQL) :
#   Windows : copy .env.example .env
cp .env.example .env
npm run dev        # démarrage avec rechargement auto (nodemon)
# ou : npm start
```

L'API écoute sur `http://localhost:3000`.

### Configuration (`.env`)

| Variable      | Rôle                                   | Défaut               |
|---------------|----------------------------------------|----------------------|
| `PORT`        | Port de l'API                          | 3000                 |
| `CLIENT_ORIGIN` | Origine autorisée (CORS)             | http://localhost:4200|
| `DB_HOST`     | Hôte MySQL                             | localhost            |
| `DB_USER`     | Utilisateur MySQL                      | root                 |
| `DB_PASSWORD` | Mot de passe MySQL                     | (vide)               |
| `DB_NAME`     | Nom de la base                         | laposte_eboutique    |
| `JWT_SECRET`  | Clé de signature des jetons JWT        | à changer            |

> Avec XAMPP, l'utilisateur est généralement `root` sans mot de passe.

## Points d'entrée (endpoints)

| Méthode | URL                  | Protégé | Description                     |
|---------|----------------------|---------|---------------------------------|
| GET     | `/api/health`        | non     | Vérifie que l'API tourne        |
| POST    | `/api/auth/register` | non     | Crée un compte                  |
| POST    | `/api/auth/login`    | non     | Connecte un utilisateur         |
| GET     | `/api/auth/me`       | **oui** | Profil de l'utilisateur courant |

### Exemple

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Sarra","lastName":"Ben Ayed","email":"sarra@example.tn","password":"secret123"}'
```

La réponse contient un `token` (JWT) à envoyer ensuite dans l'en-tête
`Authorization: Bearer <token>` pour accéder aux routes protégées.

## Sécurité

- Mots de passe stockés **hachés** (bcrypt), jamais en clair.
- Authentification par **JWT** (jeton signé, expiration 7 jours).
- Le secret `JWT_SECRET` doit être changé pour une vraie valeur en production.

## Architecture

```
src/
  server.js              point d'entrée (Express, CORS, routes)
  config/db.js           pool de connexions MySQL
  db/
    init.js              crée la base + les tables au démarrage
    schema.sql           le schéma SQL (référence / import manuel)
  middleware/auth.js     vérifie le jeton JWT (routes protégées)
  controllers/
    auth.controller.js   logique register / login / me
  routes/auth.routes.js  déclaration des routes /api/auth
```
