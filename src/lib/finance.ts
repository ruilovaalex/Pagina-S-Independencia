export function today(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export const currentMonth = (now = new Date()) => today(now).slice(0, 7);

function shiftMonth(month: string, offset: number): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mes inválido.");
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + number - 1 + offset;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12 + 12) % 12 + 1).padStart(2, "0")}`;
}

export function monthRange(month: string) {
  return { start: `${shiftMonth(month, 0)}-01`, end: `${shiftMonth(month, 1)}-01` };
}

export function recentMonthsRange(count: number, now = new Date()) {
  if (!Number.isInteger(count) || count < 1) throw new Error("Período inválido.");
  const month = currentMonth(now);
  return { start: `${shiftMonth(month, 1 - count)}-01`, end: monthRange(month).end };
}

export function isInMonth(date: string, month: string) {
  const { start, end } = monthRange(month);
  return date >= start && date < end;
}

export function sumMoney<T>(items: T[], amount: (item: T) => number): number {
  return items.reduce((cents, item) => cents + Math.round(amount(item) * 100), 0) / 100;
}

interface PricedProduct {
  quantity: number;
  estimated_price: number;
  paid_price: number | null;
  bought: boolean;
}

export function productTotals(products: PricedProduct[]) {
  return {
    estimated: sumMoney(products, p => p.quantity * p.estimated_price),
    spent: sumMoney(products.filter(p => p.bought), p => p.quantity * (p.paid_price ?? p.estimated_price)),
    pending: sumMoney(products.filter(p => !p.bought), p => p.quantity * p.estimated_price),
  };
}

export function validMoney(value: number, positive = false) {
  return Number.isFinite(value) && (positive ? value > 0 : value >= 0) && value <= 9999999999.99;
}

export function safeUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    if (/invalid login credentials/i.test(message)) return "El correo o la contraseña no coinciden.";
    if (/email not confirmed/i.test(message)) return "Tu correo todavía no está confirmado.";
    if (/failed to fetch|network|load failed/i.test(message)) return "No se pudo conectar. Revisa tu conexión e inténtalo otra vez.";
    if (/schema cache|does not exist/i.test(message)) return "Falta preparar las tablas de Supabase. Revisa la configuración de la base.";
    if (/row-level security|permission denied/i.test(message)) return "Tu cuenta no tiene permiso para esta operación.";
    return message;
  }
  return "No se pudo completar la operación. Inténtalo otra vez.";
}
