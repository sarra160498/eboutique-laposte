const pool = require('../config/db');
const { GOVERNORATES, resolveZone } = require('../utils/geo');
const { VOLUMETRIC_DIVISOR, volumetricWeight, billedKgFor, computeTotal } = require('../utils/pricing');

/** GET /api/shipping/rates — grille tarifaire + liste des gouvernorats. */
async function rates(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM shipping_rates ORDER BY base_price');
    return res.json({
      governorates: GOVERNORATES,
      rates: rows.map(r => ({
        zone: r.zone,
        label: r.label,
        basePrice: Number(r.base_price),
        pricePerKg: Number(r.price_per_kg),
        urgentMultiplier: Number(r.urgent_multiplier),
      })),
    });
  } catch (error) {
    console.error('shipping rates error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * POST /api/shipping/quote — calcule les frais d'envoi d'un colis.
 *
 * Corps attendu :
 *  { originGovernorate?, bureauId?, destinationGovernorate, scope,
 *    weightKg, length, width, height, urgent }
 *
 * Le tarif = prix de base de la zone + (poids facturé arrondi au kg supérieur ×
 * prix au kilo), majoré si l'envoi est urgent.
 */
async function quote(req, res) {
  try {
    const {
      bureauId, scope = 'national', destinationGovernorate,
      weightKg, length, width, height, urgent = false,
    } = req.body;

    let originGovernorate = req.body.originGovernorate || null;

    const realWeight = Number(weightKg);
    if (!realWeight || realWeight <= 0) {
      return res.status(400).json({ message: 'Poids invalide.' });
    }
    if (scope !== 'international' && !destinationGovernorate) {
      return res.status(400).json({ message: 'Gouvernorat de destination requis.' });
    }

    // Gouvernorat d'origine : déduit du bureau de dépôt si non fourni.
    if (!originGovernorate && bureauId) {
      const [b] = await pool.query('SELECT governorate FROM bureaux WHERE id = ?', [bureauId]);
      if (b.length > 0) originGovernorate = b[0].governorate;
    }

    // Poids volumétrique (si les dimensions sont fournies).
    const volWeight = volumetricWeight(length, width, height);
    const chargeableWeight = Math.max(realWeight, volWeight);
    const billedKg = billedKgFor(realWeight, length, width, height);

    // Zone tarifaire + tarif correspondant en base.
    const zone = resolveZone(originGovernorate, destinationGovernorate, scope);
    const [rows] = await pool.query('SELECT * FROM shipping_rates WHERE zone = ?', [zone]);
    if (rows.length === 0) {
      return res.status(500).json({ message: 'Grille tarifaire indisponible.' });
    }
    const rate = rows[0];
    const basePrice = Number(rate.base_price);
    const pricePerKg = Number(rate.price_per_kg);
    const urgentMultiplier = Number(rate.urgent_multiplier);

    const weightCost = billedKg * pricePerKg;
    const subtotal = basePrice + weightCost;
    const total = computeTotal({ basePrice, pricePerKg, urgentMultiplier, billedKg, urgent });

    return res.json({
      zone,
      zoneLabel: rate.label,
      originGovernorate,
      destinationGovernorate: destinationGovernorate || null,
      realWeightKg: Number(realWeight.toFixed(2)),
      volumetricWeightKg: Number(volWeight.toFixed(2)),
      chargeableWeightKg: Number(chargeableWeight.toFixed(2)),
      billedKg,
      basePrice,
      pricePerKg,
      weightCost: Number(weightCost.toFixed(3)),
      subtotal: Number(subtotal.toFixed(3)),
      urgent: Boolean(urgent),
      urgentMultiplier,
      total: Number(total.toFixed(3)),
    });
  } catch (error) {
    console.error('shipping quote error:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { rates, quote };
