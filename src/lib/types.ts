export type TenantId = "packaging" | "trading" | "homeware";
export interface ScheduledCash {
  day: number;
  amount: number;
  label: string;
}
export interface Supplier {
  id: string;
  name: string;
  approved: boolean;
  qty_cap: number;
  moq: number;
  pack: number;
  lead: number;
  price: number;
  freight: number;
  valid_until: string;
}
export interface Snapshot {
  id: string;
  tenant: TenantId;
  name: string;
  sector: string;
  as_of: string;
  age_hours: number;
  sku: string;
  unit: string;
  stock: number;
  cash: number;
  cash_floor: number;
  history: number[];
  synthetic: true;
  inbound: { day: number; qty: number; prepaid: true };
  receipts: ScheduledCash[];
  obligations: ScheduledCash[];
  suppliers: Supplier[];
  import_revision?: string;
}
export interface Scenario {
  delay: number;
  demand: number;
  freight: number;
  cash_floor: number;
}
export interface Forecast {
  method: string;
  series: number[];
  holdout_mae: number | null;
  baseline_mae: number | null;
  selected_holdout_mae?: number;
  model_version: string;
  training_days?: number;
  holdout_days?: number;
  uncertainty_note: string;
}
export interface Order {
  supplier_id: string;
  name: string;
  qty: number;
  lead: number;
  unit_price: number;
  freight: number;
  cost: number;
}
export interface DailyRow {
  day: number;
  demand: number;
  stock: number;
  cash: number;
  fulfilled: number;
  lost: number;
}
export interface Plan {
  id: string;
  label: string;
  orders: Order[];
  spend: number;
  fulfilled: number;
  lost: number;
  stockout_days: number;
  min_cash: number;
  feasible: boolean;
  reasons: string[];
  daily: DailyRow[];
}
export interface Calculation {
  tenant: TenantId;
  version: string;
  scenario: Scenario;
  forecast: Forecast;
  baseline: Plan;
  plans: Plan[];
  recommended_id: string | null;
  evaluated: number;
  excluded_suppliers: { id: string; reason: string }[];
  blocked: string[];
  synthetic: true;
  calc_version: string;
  input_hash: string;
  assumptions: string[];
}
