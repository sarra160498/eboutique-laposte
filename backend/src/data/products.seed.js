/**
 * Données initiales du catalogue (insérées une seule fois au démarrage si la
 * table est vide). Plus tard, ces produits seront gérés depuis une interface
 * d'administration.
 */
module.exports = [
  { id: 1,  category: 'timbres',    category_label: 'Philatélie',       name: 'Carnet « Jasmin de Tunisie »', description: '10 timbres à 0,650 DT — édition florale.',   price: 6.5,  badge: 'Collection' },
  { id: 2,  category: 'timbres',    category_label: 'Philatélie',       name: 'Bloc Médina de Tunis',          description: 'Timbre commémoratif, série patrimoine.',      price: 4.0,  badge: 'Édition' },
  { id: 3,  category: 'timbres',    category_label: 'Philatélie',       name: 'Premier Jour — Carthage',       description: 'Enveloppe 1er jour oblitérée, numérotée.',    price: 8.5,  badge: null },
  { id: 4,  category: 'emballages', category_label: 'Emballage',        name: 'Boîte Rapid-Poste — M',         description: 'Carton renforcé prêt-à-poster, 30×20×15.',    price: 3.2,  badge: null },
  { id: 5,  category: 'emballages', category_label: 'Emballage',        name: 'Pochettes matelassées ×5',      description: 'Enveloppes à bulles A4, anti-choc.',          price: 5.9,  badge: 'Lot' },
  { id: 6,  category: 'emballages', category_label: 'Emballage',        name: 'Ruban adhésif signé ×3',        description: "Rouleaux d'emballage, 50 m chacun.",          price: 7.0,  badge: null },
  { id: 7,  category: 'envois',     category_label: 'Affranchissement', name: 'Rapid-Poste National',          description: 'Express 24/48h avec suivi inclus.',           price: 9.5,  badge: 'Express' },
  { id: 8,  category: 'envois',     category_label: 'Affranchissement', name: 'Recommandé + AR',               description: 'Lettre avec avis de réception.',              price: 4.8,  badge: null },
  { id: 9,  category: 'envois',     category_label: 'Affranchissement', name: 'International — Europe',         description: "Colis jusqu'à 2 kg, suivi complet.",          price: 28.0, badge: null },
  { id: 12, category: 'services',   category_label: 'Service en ligne', name: 'Boîte postale numérique',       description: 'Adresse + notifications mobiles · 1 an.',     price: 45.0, badge: 'Nouveau' },
  { id: 13, category: 'fleurs',    category_label: 'Fleurs de la Poste', name: 'Bouquet Jasmin',                description: 'Bouquet de jasmin frais, symbole de la Tunisie.', price: 35.0, badge: 'Signature' },
  { id: 14, category: 'fleurs',    category_label: 'Fleurs de la Poste', name: 'Bouquet Rose Rouge',            description: '12 roses rouges — idéal pour la Saint-Valentin.', price: 45.0, badge: null },
  { id: 15, category: 'fleurs',    category_label: 'Fleurs de la Poste', name: 'Composition Mariage',           description: 'Bouquet blanc élégant, pivoine et lys.',          price: 75.0, badge: 'Mariage' },
  { id: 16, category: 'fleurs',    category_label: 'Fleurs de la Poste', name: 'Bouquet Naissance',             description: 'Composition pastel douce pour accueillir bébé.',  price: 40.0, badge: 'Naissance' },
  { id: 17, category: 'fleurs',    category_label: 'Fleurs de la Poste', name: 'Bouquet Anniversaire',          description: 'Mélange coloré festif pour toutes les occasions.', price: 38.0, badge: null },
  { id: 18, category: 'fleurs',    category_label: 'Fleurs de la Poste', name: 'Composition Deuil',             description: 'Arrangement sobre et respectueux, chrysanthèmes.', price: 55.0, badge: null },
];
