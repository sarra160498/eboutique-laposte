/**
 * Catégories de la boutique. Le type union garantit qu'on ne peut pas
 * utiliser une catégorie inconnue ailleurs dans le code.
 */
export type ProductCategory = 'timbres' | 'emballages' | 'envois' | 'services' | 'fleurs';

/** Un article du catalogue. */
export interface Product {
  id: number;
  category: ProductCategory;
  /** Libellé lisible de la catégorie, affiché sur la carte produit. */
  categoryLabel: string;
  name: string;
  description: string;
  /** Prix en dinars tunisiens. */
  price: number;
  /** Étiquette optionnelle (« Nouveau », « Collection »…). */
  badge?: string | null;
}

/** Un filtre de la barre de catégories (« Tout », « Timbres »…). */
export interface CategoryFilter {
  /** 'all' affiche tout, sinon une ProductCategory. */
  value: ProductCategory | 'all';
  label: string;
}
