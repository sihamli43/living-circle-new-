import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

async function token(): Promise<string | null> {
  return await storage.getItem<string>("lc_token", "");
}

export async function setToken(t: string | null) {
  if (t) await storage.setItem("lc_token", t);
  else await storage.removeItem("lc_token");
}

async function request<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const t = await token();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (t) headers["Authorization"] = t;
  const res = await fetch(`${BASE}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    // Auto-clear token on auth failure so the user lands on the login screen.
    if (res.status === 401) {
      try { await setToken(null); } catch {}
    }
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  sendCode: (email: string) =>
    request<{ sent: boolean; dev_code?: string; hint?: string }>("/auth/send-code", {
      method: "POST",
      body: { email },
    }),
  verifyCode: (email: string, code: string) =>
    request<{ token: string; onboarded: boolean }>("/auth/verify-code", {
      method: "POST",
      body: { email, code },
    }),
  me: () => request("/profiles/me"),
  updateMe: (data: any) => request("/profiles/me", { method: "PUT", body: data }),
  cities: () => request<{ cities: string[]; localities: Record<string, string[]> }>("/meta/cities"),
  discover: (filters: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<any[]>(`/profiles/discover${qs ? `?${qs}` : ""}`);
  },
  profile: (id: string) => request(`/profiles/${id}`),
  swipe: (target_id: string, direction: "like" | "pass") =>
    request<{ ok: boolean; match: any }>("/swipes", {
      method: "POST",
      body: { target_id, direction },
    }),
  matches: () => request<any[]>("/matches"),
  messages: (matchId: string) => request<any[]>(`/messages/${matchId}`),
  sendMessage: (matchId: string, text: string) =>
    request(`/messages/${matchId}`, { method: "POST", body: { text } }),
  block: (id: string) => request(`/users/${id}/block`, { method: "POST", body: {} }),
  report: (id: string) => request(`/users/${id}/report`, { method: "POST", body: {} }),
  safetyReport: (id: string, reason: string, details?: string) =>
    request(`/users/${id}/safety-report`, { method: "POST", body: { reason, details } }),
  unmatch: (matchId: string) => request(`/matches/${matchId}`, { method: "DELETE" }),
  matchLocation: (matchId: string) => request<any>(`/matches/${matchId}/location`),
  requestLocation: (matchId: string) => request<any>(`/matches/${matchId}/request-location`, { method: "POST" }),
  geocode: (address: string) => request<any[]>("/geocode", { method: "POST", body: { address } }),
  testBotMatch: () => request<any>("/matches/test-bot", { method: "POST" }),
};
