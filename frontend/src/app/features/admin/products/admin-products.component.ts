import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { Product, ProductCategory } from '../../../core/models/product.model';
import { DinarPipe } from '../../../shared/pipes/dinar.pipe';

/** Gestion du catalogue : ajout, modification et suppression de produits. */
@Component({
  selector: 'app-admin-products',
  imports: [ReactiveFormsModule, DinarPipe],
  templateUrl: './admin-products.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);

  readonly products = signal<Product[]>([]);
  /** Id du produit en cours d'édition (null = mode ajout). */
  readonly editingId = signal<number | null>(null);

  readonly categories: ProductCategory[] = ['timbres', 'emballages', 'envois', 'services'];

  readonly form = this.fb.nonNullable.group({
    category: ['timbres' as ProductCategory, Validators.required],
    categoryLabel: ['', Validators.required],
    name: ['', Validators.required],
    description: ['', Validators.required],
    price: [1, [Validators.required, Validators.min(0)]],
    badge: [''],
  });

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.productService.getProducts().subscribe(list => this.products.set(list));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload = { ...value, badge: value.badge || null };
    const id = this.editingId();
    const request = id == null
      ? this.productService.create(payload)
      : this.productService.update(id, payload);

    request.subscribe(() => {
      this.reload();
      this.resetForm();
    });
  }

  edit(product: Product): void {
    this.editingId.set(product.id);
    this.form.setValue({
      category: product.category,
      categoryLabel: product.categoryLabel,
      name: product.name,
      description: product.description,
      price: product.price,
      badge: product.badge ?? '',
    });
  }

  remove(product: Product): void {
    this.productService.remove(product.id).subscribe(() => this.reload());
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ category: 'timbres', categoryLabel: '', name: '', description: '', price: 1, badge: '' });
  }
}
