import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { CategoryFilter, Product } from '../models/product.model';

/**
 * Catalogue produits, lu depuis l'API Node.js (`GET /api/products`).
 * Les filtres de catégories restent côté front (simple configuration d'affichage).
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API_BASE_URL}/products`;

  /** Récupère le catalogue depuis l'API. */
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.base);
  }

  /** Crée un produit (admin). */
  create(product: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<Product>(this.base, product);
  }

  /** Met à jour un produit (admin). */
  update(id: number, product: Omit<Product, 'id'>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}`, product);
  }

  /** Supprime un produit (admin). */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Filtres affichés au-dessus de la grille de produits. */
  getFilters(): CategoryFilter[] {
    return [
      { value: 'all',        label: 'Tout' },
      { value: 'timbres',    label: 'Timbres & Philatélie' },
      { value: 'emballages', label: 'Emballages' },
      { value: 'envois',     label: 'Affranchissement' },
      { value: 'services',   label: 'Services en ligne' },
    ];
  }
}
