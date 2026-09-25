const pool = require('../config/db');

/**
 * Construit la chronologie de suivi à partir du statut courant de la commande
 * et du bureau de dépôt réel.
 */
function buildSteps(status, bureauName) {
  const lieu = bureauName || 'Bureau de poste';

  const all = [
    {
      key: 'received',
      title: 'Pris en charge',
      detail: `${lieu} · dépôt enregistré`,
    },
    {
      key: 'in_transit',
      title: 'En transit',
      detail: 'En acheminement vers le centre de distribution',
    },
    {
      key: 'out_for_delivery',
      title: 'En cours de livraison',
      detail: 'Remis au livreur',
    },
    {
      key: 'delivered',
      title: 'Livré',
      detail: 'Colis remis au destinataire',
    },
  ];

  // Ordre logique des statuts pour déterminer les étapes passées/actives.
  const order = ['pending', 'paid', 'received', 'in_transit', 'out_for_delivery', 'delivered'];
  const currentIndex = order.indexOf(status);

  // Correspondance statut → étape de la timeline.
  const statusToStep = {
    received: 0,
    in_transit: 1,
    out_for_delivery: 2,
    delivered: 3,
  };

  return all.map((step, i) => {
    // Trouve quel statut correspond à cette étape.
    const stepStatuses = Object.entries(statusToStep)
      .filter(([, idx]) => idx === i)
      .map(([s]) => s);

    const stepStatusIndex = Math.max(...stepStatuses.map(s => order.indexOf(s)));

    if (currentIndex > stepStatusIndex) return { ...step, state: 'done' };
    if (currentIndex === stepStatusIndex) return { ...step, state: 'active' };
    return { ...step, state: 'pending' };
  });
}

/** GET /api/tracking/:reference — suivi public d'un colis par sa référence. */
async function track(req, res) {
  const { reference } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT o.*, b.name AS bureau_name, b.city AS bureau_city
       FROM orders o
       LEFT JOIN bureaux b ON b.id = o.bureau_id
       WHERE o.reference = ?`,
      [reference.trim().toUpperCase()],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Aucun envoi trouvé pour cette référence.' });
    }

    const order = rows[0];

    // Seuls les dépôts de colis (type 'depot') sont suivables.
    const bureauLabel = order.bureau_city
      ? `${order.bureau_name} · ${order.bureau_city}`
      : (order.bureau_name || null);

    const steps = buildSteps(order.status, bureauLabel);

    // Si le colis n'a pas encore été reçu au bureau, on n'affiche pas encore
    // la timeline (statut pending / paid).
    const readyStatuses = ['received', 'in_transit', 'out_for_delivery', 'delivered'];
    if (!readyStatuses.includes(order.status)) {
      return res.json({
        trackingNumber: order.reference,
        service: order.type === 'depot' ? 'Rapid-Poste' : 'e-Boutique',
        status: order.status,
        pending: true,
        steps: [],
      });
    }

    return res.json({
      trackingNumber: order.reference,
      service: order.type === 'depot' ? 'Rapid-Poste' : 'e-Boutique',
      status: order.status,
      pending: false,
      steps,
    });
  } catch (error) {
    console.error('tracking error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { track };
