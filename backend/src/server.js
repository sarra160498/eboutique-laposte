require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDb = require('./db/init');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const bureauRoutes = require('./routes/bureau.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const regionRoutes = require('./routes/region.routes');
const teamRoutes = require('./routes/team.routes');
const messageRoutes = require('./routes/message.routes');
const trackingRoutes = require('./routes/tracking.routes');
const shippingRoutes = require('./routes/shipping.routes');
const claimRoutes = require('./routes/claim.routes');
const walletRoutes = require('./routes/wallet.routes');
const statsRoutes = require('./routes/stats.routes');
const { purgeOld } = require('./controllers/message.controller');

const app = express();

// Autorise le front Angular (http://localhost:4200) à appeler l'API.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());

// Petite route de santé pour vérifier que l'API tourne.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes de l'API.
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bureaux', bureauRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/stats', statsRoutes);

const PORT = Number(process.env.PORT) || 3000;

// On prépare la base (création DB + tables) puis on démarre le serveur.
// Si MySQL n'est pas joignable, on démarre quand même pour signaler l'erreur
// clairement plutôt que de planter en silence.
initDb()
  .then(() => console.log('Base de données prête.'))
  .catch(err => console.error('Impossible d\'initialiser la base de données:', err.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`API démarrée sur http://localhost:${PORT}`));
    // Rétention des messages : purge au démarrage puis une fois par jour.
    purgeOld();
    setInterval(purgeOld, 24 * 60 * 60 * 1000);
  });
