export { formatCurrency } from "@/lib/utils";

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n);
}

/** "+12.3%" / "-4.5%". Pass withSign=false for a bare "12.3%". */
export function formatPercentage(n: number, withSign = true): string {
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** "jun 14" — short month + day, used for chart axis labels. */
export function formatDateLabel(d: Date): string {
  return `${d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")} ${d.getDate()}`;
}
