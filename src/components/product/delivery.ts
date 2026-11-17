import { warehouseLabels } from "@/config/store";

export function daysRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min == null || max == null || min === max) return `${min ?? max}`;
  return `${min}–${max}`;
}

export function deliveryShort(p: {
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  warehouseCountry: string;
}): string {
  const range = daysRange(p.deliveryMinDays, p.deliveryMaxDays);
  const from = p.warehouseCountry === "GB" ? "UK stock" : (warehouseLabels[p.warehouseCountry] ?? "Ships");
  return range ? `${from} · est. ${range} working days` : from;
}
