/**
 * WaterTrace AI — API client for FastAPI backend
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

// Reports
export const api = {
  reports: {
    create: (token: string, data: unknown) =>
      request("/api/v1/reports", { method: "POST", body: JSON.stringify(data), token }),
    list: (token: string, params?: Record<string, string>) =>
      request(`/api/v1/reports?${new URLSearchParams(params)}`, { token }),
    get: (token: string, id: string) =>
      request(`/api/v1/reports/${id}`, { token }),
    update: (token: string, id: string, data: unknown) =>
      request(`/api/v1/reports/${id}`, { method: "PATCH", body: JSON.stringify(data), token }),
    confirm: (token: string, id: string, category: string) =>
      request(`/api/v1/reports/${id}/confirm?confirmed_category=${category}`, { method: "POST", token }),
  },
  incidents: {
    list: (token?: string, params?: Record<string, string>) =>
      request(`/api/v1/incidents?${new URLSearchParams(params)}`, { token }),
    get: (token?: string, id?: string) =>
      request(`/api/v1/incidents/${id}`, { token }),
    getReports: (id: string) =>
      request(`/api/v1/incidents/${id}/reports`),
    getMap: () =>
      request("/api/v1/incidents/map"),
    analyze: (token: string) =>
      request("/api/v1/incidents/analyze", { method: "POST", token }),
    updateStatus: (token: string, id: string, data: unknown) =>
      request(`/api/v1/incidents/${id}/status`, { method: "PATCH", body: JSON.stringify(data), token }),
    getHistory: (token: string, id: string) =>
      request(`/api/v1/incidents/${id}/history`, { token }),
  },
  analytics: {
    summary: (token: string) =>
      request("/api/v1/dashboard/summary", { token }),
    categories: (token: string) =>
      request("/api/v1/analytics/categories", { token }),
    trends: (token: string) =>
      request("/api/v1/analytics/trends", { token }),
    hotspots: (token: string) =>
      request("/api/v1/analytics/hotspots", { token }),
  },
  notifications: {
    list: (token: string) =>
      request("/api/v1/notifications", { token }),
    markRead: (token: string, id: string) =>
      request(`/api/v1/notifications/${id}/read`, { method: "PATCH", token }),
    markAllRead: (token: string) =>
      request("/api/v1/notifications/read-all", { method: "PATCH", token }),
  },
};
