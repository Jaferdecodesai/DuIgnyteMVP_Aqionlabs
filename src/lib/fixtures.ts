import data from "./fixtures.json";
import type { Snapshot, TenantId } from "./types";
export function fixtures(): Record<TenantId, Snapshot> {
  return structuredClone(data) as Record<TenantId, Snapshot>;
}
