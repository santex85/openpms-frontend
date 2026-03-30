/** Агрегаты для главной панели (GET /dashboard/summary). */
export interface DashboardSummary {
  period_start: string;
  period_end: string;
  active_bookings: number;
  arrivals_today: number;
  departures_today: number;
  occupied_rooms: number;
  total_rooms: number;
  revenue_total: string;
  currency: string;
}
