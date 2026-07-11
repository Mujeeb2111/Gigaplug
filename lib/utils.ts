export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "₦0";
  return `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateReference(prefix = "gigaplug"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isEuCountry(country: string): boolean {
  const eu = [
    "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech",
    "denmark", "estonia", "finland", "france", "germany", "greece",
    "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg",
    "malta", "netherlands", "poland", "portugal", "romania", "slovakia",
    "slovenia", "spain", "sweden",
  ];
  const c = country.toLowerCase().trim();
  return c === "usa" || c === "united states" || eu.includes(c);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
