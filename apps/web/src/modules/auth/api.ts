import { api } from "@/lib/api";
import type { AuthResponse, Registration, User } from "./types";

export async function register(values: Registration, signal: AbortSignal) {
  return (await api.post<AuthResponse>("/auth/register", values, { signal }))
    .data;
}

export async function login(
  values: { identifier: string; password: string },
  signal: AbortSignal,
) {
  return (await api.post<AuthResponse>("/auth/login", values, { signal })).data;
}

export async function getUser(token: string, signal: AbortSignal) {
  return (
    await api.get<User>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  ).data;
}
