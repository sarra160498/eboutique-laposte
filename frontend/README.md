# e-Boutique — La Poste Tunisienne (Front-end Angular)

Front-end du site e-commerce de la Poste Tunisienne (projet PFE).
Stack global : **Angular** (ce dépôt) · **Node.js** · **MySQL**.

Le design fusionne deux maquettes :
- le **style « atelier »** (titres serif Fraunces, bordures nettes, ombres
  décalées, visuel « timbre ») ;
- les **couleurs officielles** bleu marine `#1B2D6B` et jaune `#F2C200`.

## Démarrer

```bash
npm install      # une seule fois
npm start        # = ng serve, puis ouvrir http://localhost:4200
```

Autres commandes utiles : `ng build` (production), `ng test` (tests unitaires).

## Architecture

Application **standalone** (sans NgModule) avec **signals** pour l'état.
Tout vit dans `src/app/` :

```
core/                  Logique métier et données, AUCUNE interface
  models/              Types TypeScript (Product, CartLine…)
  services/            ProductService (catalogue), CartService (panier),
                       ToastService (notifications)

layout/                Ossature visible sur toutes les pages
  topbar/              Bandeau supérieur + langues
  header/              Logo, navigation, bouton panier
  footer/              Pied de page

features/home/         La page d'accueil…
  home.component.ts    …qui assemble les sections ci-dessous :
  sections/
    hero/              Accroche + visuel « timbre »
    ticker/            Bandeau défilant
    services/          Les 4 services
    shop/              Filtres + grille de produits (cœur interactif)
    promo/             Bannière abonnement
    trust/             Chiffres clés

shared/                Briques réutilisables
  components/
    product-card/      Carte produit (présentationnelle)
    cart-drawer/       Tiroir latéral du panier
    toast/             Notification éphémère
  pipes/dinar.pipe.ts        Formate les prix : 6.5 -> "6,500 DT"
  directives/reveal.directive.ts   Animation d'apparition au défilement
  category-visuals.ts        Dégradé de couleur par catégorie
```

### Idées clés à retenir (pour la soutenance)

- **Séparation des responsabilités.** `core/` ne contient que la logique et les
  données ; les composants ne font qu'afficher. La carte produit
  (`ProductCardComponent`) ne connaît même pas le panier : elle **émet** un
  événement `add`, et c'est la boutique (`ShopComponent`) qui décide de
  l'ajouter au panier et d'afficher la confirmation.

- **État réactif avec les signals.** Le `CartService` expose un signal de base
  (`lines`) et des valeurs **calculées** (`count`, `subtotal`, `total`…). Quand
  on ajoute un article, le badge du header, le tiroir et le total se mettent à
  jour automatiquement — aucun code de synchronisation à écrire.

- **Système de design centralisé.** Les couleurs et réglages sont des variables
  CSS définies une seule fois dans `src/styles.scss` (`--bleu`, `--jaune`…).
  Pour changer une couleur de marque, on modifie une seule ligne.

### Brancher le back-end plus tard

Aujourd'hui les produits sont codés en dur dans `ProductService`. Pour les lire
depuis l'API Node.js/MySQL, il suffira de remplacer le tableau par un appel
HTTP, **sans toucher aux composants** :

```ts
// product.service.ts
private http = inject(HttpClient);
getProducts() {
  return this.http.get<Product[]>('http://localhost:3000/api/products');
}
```

`HttpClient` est déjà activé dans `src/app/app.config.ts`.
