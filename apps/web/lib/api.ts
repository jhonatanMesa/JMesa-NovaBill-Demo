export type Row = { id: string; [key: string]: unknown };
export type User = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SELLER' | 'VIEWER';
};
export type Page = {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
  totalCents?: number;
};
let refreshing: Promise<Response> | null = null;
export async function api<T = Row>(
  path: string,
  method = 'GET',
  body?: unknown,
  retry = true,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Novabill-Request': '1' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401 && retry && (!path.startsWith('auth/') || path === 'auth/profile')) {
    refreshing ??= fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'X-Novabill-Request': '1' },
    }).finally(() => {
      refreshing = null;
    });
    const renewed = await refreshing;
    if (renewed.ok) return api<T>(path, method, body, false);
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join('. ')
        : (data.message ?? 'No se pudo completar la solicitud'),
    );
  return data as T;
}
export const money = (cents: unknown) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(cents ?? 0) / 100);
export const date = (value: unknown) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(String(value)),
  );
export const label = (value: unknown) => String(value ?? '—');
export const nested = (value: unknown) => value as Row;
