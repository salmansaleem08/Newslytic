export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { user: AuthUser };
  return data.user;
}
