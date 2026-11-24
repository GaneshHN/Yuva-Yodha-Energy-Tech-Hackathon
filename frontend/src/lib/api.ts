export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};

export type Factory = {
  id: string;
  name: string;
  location: string | null;
  industry_type: string | null;
  timezone: string;
  is_demo: boolean;
};

export type User = { id: string; email: string };

export type EnergySummary = {
  total_energy_kwh: number;
  energy_per_unit: number;
  peak_demand_kw: number;
  energy_cost: number;
  estimated_co2_kg: number;
  production_units: number;
};

export type EnergyPoint = {
  timestamp: string;
  energy_kwh: number;
  peak_demand_kw: number;
};

export type Machine = {
  id: string;
  name: string;
  machine_type: string;
  rated_power_kw: number;
  status: "available" | "running" | "maintenance" | "offline";
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store" });
  } catch {
    throw new Error("Could not reach the EnerPilot API. Check that the backend service is running.");
  }

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "The request could not be completed.");
  }
  return payload.data;
}

export function formatMetric(value: number | undefined, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value ?? 0);
}
