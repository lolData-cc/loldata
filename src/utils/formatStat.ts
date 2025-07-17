export function formatStat(num: number): string {
  if (!isFinite(num)) return "0";
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}