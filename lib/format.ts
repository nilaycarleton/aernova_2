export function currency(value: number | null | undefined) {
  return `$${(value ?? 0).toLocaleString()}`;
}