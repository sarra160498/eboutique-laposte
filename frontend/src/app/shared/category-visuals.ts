import { ProductCategory } from '../core/models/product.model';

/** Couleurs (début, fin) du dégradé de chaque catégorie. */
const CATEGORY_GRADIENT: Record<ProductCategory, [string, string]> = {
  timbres:    ['#2C44A0', '#1B2D6B'],
  emballages: ['#F2C200', '#D6A800'],
  envois:     ['#E5384B', '#B8273A'],
  services:   ['#1B2D6B', '#13204F'],
  fleurs:     ['#c0392b', '#8e1a10'],
};

/** Retourne un dégradé CSS prêt à poser sur `background`. */
export function categoryGradient(category: ProductCategory): string {
  const [from, to] = CATEGORY_GRADIENT[category];
  return `linear-gradient(150deg, ${from}, ${to})`;
}
