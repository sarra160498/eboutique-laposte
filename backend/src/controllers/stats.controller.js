const pool = require('../config/db');

/** Statuts de commande considérés comme « encaissés » (revenus). */
const PAID_STATUSES = ['paid', 'received', 'in_transit', 'out_for_delivery', 'delivered'];

/**
 * Périmètre des commandes selon le niveau de l'admin :
 *  - admin général (ou équipe « admin ») : tout le réseau ;
 *  - admin régional : les bureaux de sa région ;
 *  - admin de bureau : son bureau uniquement.
 * Les requêtes joignent toujours `bureaux b` (LEFT JOIN) pour pouvoir filtrer.
 */
function orderScope(user) {
  const isAdmin = user.role === 'admin_general' || (user.missions || []).includes('admin');
  if (isAdmin) return { clause: '', params: [] };
  if (user.role === 'admin_regional') return { clause: 'WHERE b.region_id = ?', params: [user.regionId] };
  return { clause: 'WHERE o.bureau_id = ?', params: [user.bureauId] };
}

/** GET /api/stats — chiffres et agrégats pour le tableau de bord admin. */
async function dashboard(req, res) {
  try {
    const { clause, params } = orderScope(req.user);
    const from = `FROM orders o LEFT JOIN bureaux b ON b.id = o.bureau_id`;

    // Commandes par statut (avec le chiffre d'affaires associé).
    const [byStatus] = await pool.query(
      `SELECT o.status, COUNT(*) AS count, COALESCE(SUM(o.amount), 0) AS revenue
       ${from} ${clause} GROUP BY o.status`, params);

    // Revenus par mode de paiement (uniquement commandes encaissées).
    const paidClause = clause ? `${clause} AND o.status IN (?)` : `WHERE o.status IN (?)`;
    const [byMethod] = await pool.query(
      `SELECT o.payment_method AS method, COALESCE(SUM(o.amount), 0) AS revenue, COUNT(*) AS count
       ${from} ${paidClause} GROUP BY o.payment_method`, [...params, PAID_STATUSES]);

    // Commandes par région.
    const [byRegion] = await pool.query(
      `SELECT COALESCE(r.name, 'Non rattaché') AS region, COUNT(*) AS count
       ${from} LEFT JOIN regions r ON r.id = b.region_id ${clause}
       GROUP BY region ORDER BY count DESC`, params);

    // Commandes par bureau (top 8).
    const [byBureau] = await pool.query(
      `SELECT b.name AS bureau, COUNT(*) AS count
       ${from} ${clause ? clause + ' AND' : 'WHERE'} o.bureau_id IS NOT NULL
       GROUP BY b.name ORDER BY count DESC LIMIT 8`, params);

    // Revenus par mois (12 derniers mois) pour la tendance.
    const [byMonth] = await pool.query(
      `SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS month, COALESCE(SUM(o.amount), 0) AS revenue
       ${from} ${paidClause} GROUP BY month ORDER BY month DESC LIMIT 12`,
      [...params, PAID_STATUSES]);

    // Réclamations par statut (non rattachées à un périmètre géographique).
    const [claims] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM claims GROUP BY status`);

    // Nombre de clients.
    const [[{ clients }]] = await pool.query(
      `SELECT COUNT(*) AS clients FROM users WHERE role = 'client'`);

    // ── Agrégats calculés ──────────────────────────────────────────────────
    const ordersByStatus = byStatus.map(r => ({ status: r.status, count: Number(r.count) }));
    const totalOrders = ordersByStatus.reduce((s, r) => s + r.count, 0);
    const revenue = byStatus
      .filter(r => PAID_STATUSES.includes(r.status))
      .reduce((s, r) => s + Number(r.revenue), 0);
    const claimsByStatus = claims.map(r => ({ status: r.status, count: Number(r.count) }));
    const claimsOpen = claimsByStatus
      .filter(r => r.status !== 'resolved')
      .reduce((s, r) => s + r.count, 0);

    return res.json({
      totals: {
        orders: totalOrders,
        revenue,
        clients: Number(clients),
        claimsOpen,
      },
      ordersByStatus,
      claimsByStatus,
      revenueByMethod: byMethod.map(r => ({ method: r.method, revenue: Number(r.revenue), count: Number(r.count) })),
      ordersByRegion: byRegion.map(r => ({ region: r.region, count: Number(r.count) })),
      ordersByBureau: byBureau.map(r => ({ bureau: r.bureau, count: Number(r.count) })),
      revenueByMonth: byMonth.map(r => ({ month: r.month, revenue: Number(r.revenue) })).reverse(),
    });
  } catch (error) {
    console.error('stats dashboard error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { dashboard };
