const ADMIN_TOKEN_STORAGE_KEY = "geotab-admin-access-token";

export function getAdminAccessToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function setAdminAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getAdminAccessToken();

  if (token) {
    headers.set("x-admin-access-token", token);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));

    if (response.status === 401) {
      setAdminAccessToken("");
    }

    throw new Error(payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}
