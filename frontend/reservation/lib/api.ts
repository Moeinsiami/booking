export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export interface ServiceItem {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface DayAvailability {
  date: string;
  status: "open" | "full" | "closed";
}

export interface SlotsResponse {
  date: string;
  duration_minutes: number;
  total_price: number;
  deposit_amount: number;
  slots: string[]; // UTC HH:MM
}

export interface CheckoutResponse {
  appointment_id: string;
  expires_at: string;
  total_price: number;
  deposit_amount: number;
  payment_url: string;
}

export interface AppointmentItem {
  id: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  barber_name: string;
  services: ServiceItem[];
  start_datetime: string;
  end_datetime: string;
  total_price: number;
  deposit_amount: number;
  can_cancel: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.detail ||
      Object.values(data).flat().join(" ") ||
      "خطایی در ارتباط با سرور رخ داد.";
    throw new Error(msg);
  }
  return data as T;
}

/** Format Date as Gregorian YYYY-MM-DD in Asia/Tehran timezone for backend queries */
export function toGregorianDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Format Date as Gregorian YYYY-MM in Asia/Tehran timezone */
export function toGregorianMonth(date: Date): string {
  return toGregorianDate(date).slice(0, 7);
}

/** Convert backend UTC HH:MM slot on a Gregorian date to Persian Tehran clock string */
export function utcSlotToTehran(dateStr: string, utcHHMM: string): string {
  const dt = new Date(`${dateStr}T${utcHHMM}:00Z`);
  return dt.toLocaleTimeString("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format ISO UTC datetime string into Persian date + Tehran time */
export function formatTehranDateTime(isoUtc: string): string {
  const dt = new Date(isoUtc);
  return dt.toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format Rials to Persian formatted string */
export function formatPrice(rials: number): string {
  return `${rials.toLocaleString("fa-IR")} ریال`;
}
