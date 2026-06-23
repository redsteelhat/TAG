import { AuthResponse } from "./api-client";

export interface StoredAuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  role?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  timezone?: string;
}

export function getAccessToken() {
  return localStorage.getItem("tag.accessToken");
}

export function getStoredUser() {
  const storedValue = localStorage.getItem("tag.user");

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function getStoredUserRole() {
  return getStoredUser()?.role ?? getAccessTokenRole();
}

export function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function persistAuthSession(authResponse: AuthResponse) {
  localStorage.setItem("tag.accessToken", authResponse.data.accessToken);
  localStorage.setItem("tag.refreshToken", authResponse.data.refreshToken);

  if (authResponse.data.user) {
    localStorage.setItem("tag.user", JSON.stringify(authResponse.data.user));
  }
}

function getAccessTokenRole() {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = window.atob(
      normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        "=",
      ),
    );
    const parsedPayload = JSON.parse(decodedPayload) as { role?: string };

    return parsedPayload.role ?? null;
  } catch {
    return null;
  }
}
