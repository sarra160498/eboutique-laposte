import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formate un nombre en dinars tunisiens : 6.5 -> "6,500 DT".
 * (3 décimales et virgule, comme la convention monétaire tunisienne.)
 *
 * Usage dans un template : {{ produit.price | dinar }}
 */
@Pipe({ name: 'dinar' })
export class DinarPipe implements PipeTransform {
  transform(value: number): string {
    return value.toFixed(3).replace('.', ',') + ' DT';
  }
}
