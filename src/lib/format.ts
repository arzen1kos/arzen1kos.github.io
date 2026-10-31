const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** 'YYYY-MM' -> 'December 2025' */
export function formatMonth(value: string): string {
  const [y, m] = value.split('-');
  const name = MONTHS[Number(m) - 1];
  return name ? `${name} ${y}` : value;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en', { notation: n >= 10000 ? 'compact' : 'standard' }).format(n);
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'never';
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}
