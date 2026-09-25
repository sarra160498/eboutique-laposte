import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard, adminAccessGuard, claimsAccessGuard } from './core/guards/role.guard';

/**
 * Routes de l'application.
 *
 * La page d'accueil est chargée en "lazy loading" : son code n'est téléchargé
 * que lorsqu'on visite la route. C'est la bonne pratique pour garder un
 * démarrage rapide quand de nouvelles pages seront ajoutées (fiche produit,
 * panier, paiement, espace client...).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
    title: 'e-Boutique — La Poste Tunisienne',
  },
  {
    path: 'suivi',
    loadComponent: () =>
      import('./features/tracking/tracking.component').then(m => m.TrackingComponent),
    title: 'Suivre un colis — La Poste Tunisienne',
  },
  {
    path: 'fleurs',
    loadComponent: () =>
      import('./features/fleurs/fleurs.component').then(m => m.FleursComponent),
    title: 'Fleurs de la Poste — La Poste Tunisienne',
  },
  {
    path: 'deposer',
    loadComponent: () =>
      import('./features/bureaux/bureaux.component').then(m => m.BureauxComponent),
    title: 'Déposer un colis — La Poste Tunisienne',
  },
  {
    path: 'e-dinar',
    loadComponent: () =>
      import('./features/edinar/edinar.component').then(m => m.EdinarComponent),
    title: 'Guichet e-Dinar — La Poste Tunisienne',
    // Payer en ligne crée une opération liée au compte : connexion requise.
    canActivate: [authGuard],
  },
  {
    path: 'mes-commandes',
    loadComponent: () =>
      import('./features/orders/orders.component').then(m => m.OrdersComponent),
    title: 'Mes commandes & dépôts — La Poste Tunisienne',
    // Page réservée : accessible uniquement si l'utilisateur est connecté.
    canActivate: [authGuard],
  },
  {
    path: 'virements',
    loadComponent: () =>
      import('./features/wallet/wallet.component').then(m => m.WalletComponent),
    title: 'Virements e-Dinar — La Poste Tunisienne',
    canActivate: [authGuard],
  },
  {
    path: 'compte',
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
    title: 'Mon profil — La Poste Tunisienne',
    canActivate: [authGuard],
  },
  {
    path: 'reclamations',
    loadComponent: () =>
      import('./features/claims/claims.component').then(m => m.ClaimsComponent),
    title: 'Mes réclamations — La Poste Tunisienne',
    // Page réservée : accessible uniquement si l'utilisateur est connecté.
    canActivate: [authGuard],
  },
  {
    path: 'connexion',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Connexion — La Poste Tunisienne',
  },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'Créer un compte — La Poste Tunisienne',
  },
  {
    path: 'verifier-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Confirmation de l\'e-mail — La Poste Tunisienne',
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Mot de passe oublié — La Poste Tunisienne',
  },
  {
    path: 'reinitialiser',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Réinitialiser le mot de passe — La Poste Tunisienne',
  },
  {
    // Espace pro : agents, livreurs, admin.
    path: 'pro',
    loadComponent: () =>
      import('./features/pro/pro.component').then(m => m.ProComponent),
    canActivate: [roleGuard('admin_general', 'admin_regional', 'admin_bureau', 'agent', 'livreur')],
    title: 'Espace pro — La Poste Tunisienne',
  },
  {
    // Messagerie interne : tout le personnel.
    path: 'messagerie',
    loadComponent: () =>
      import('./features/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [roleGuard('admin_general', 'admin_regional', 'admin_bureau', 'agent', 'livreur')],
    title: 'Messagerie — La Poste Tunisienne',
  },
  {
    // Annuaire du personnel : tout le personnel.
    path: 'annuaire',
    loadComponent: () =>
      import('./features/annuaire/annuaire.component').then(m => m.AnnuaireComponent),
    canActivate: [roleGuard('admin_general', 'admin_regional', 'admin_bureau', 'agent', 'livreur')],
    title: 'Annuaire — La Poste Tunisienne',
  },
  {
    // Traitement des réclamations : service après-vente (et admins).
    path: 'reclamations-pro',
    loadComponent: () =>
      import('./features/claims-pro/claims-pro.component').then(m => m.ClaimsProComponent),
    canActivate: [claimsAccessGuard],
    title: 'Traitement des réclamations — La Poste Tunisienne',
  },
  {
    // Administration : les trois niveaux d'admin, plus les équipes « admin ».
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminAccessGuard],
    title: 'Administration — La Poste Tunisienne',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      { path: 'tableau-de-bord', loadComponent: () => import('./features/admin/stats/admin-stats.component').then(m => m.AdminStatsComponent) },
      { path: 'produits', loadComponent: () => import('./features/admin/products/admin-products.component').then(m => m.AdminProductsComponent) },
      { path: 'bureaux', loadComponent: () => import('./features/admin/bureaux/admin-bureaux.component').then(m => m.AdminBureauxComponent) },
      { path: 'utilisateurs', loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'equipes', loadComponent: () => import('./features/admin/teams/admin-teams.component').then(m => m.AdminTeamsComponent) },
      { path: 'commandes', loadComponent: () => import('./features/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent) },
      { path: 'reclamations', loadComponent: () => import('./features/admin/claims/admin-claims.component').then(m => m.AdminClaimsComponent) },
    ],
  },
  // Redirige toute URL inconnue vers l'accueil.
  { path: '**', redirectTo: '' },
];
