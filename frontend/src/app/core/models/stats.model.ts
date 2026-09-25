/** Données agrégées du tableau de bord admin. */
export interface DashboardStats {
  totals: {
    orders: number;
    revenue: number;
    clients: number;
    claimsOpen: number;
  };
  ordersByStatus: { status: string; count: number }[];
  claimsByStatus: { status: string; count: number }[];
  revenueByMethod: { method: string; revenue: number; count: number }[];
  ordersByRegion: { region: string; count: number }[];
  ordersByBureau: { bureau: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}
