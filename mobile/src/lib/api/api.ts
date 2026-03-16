import * as Sentry from "@sentry/react-native";
import { fetch } from "expo/fetch";
import { router } from "expo-router";
import { authClient } from "../auth/auth-client";

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

export class NetworkError extends Error {
  constructor() {
    super("Нет подключения к интернету");
    this.name = "NetworkError";
  }
}

export class AuthError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "AuthError";
  }
}

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${url}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Cookie: authClient.getCookie(),
      },
    });
  } catch (e) {
    if (e instanceof TypeError && (e.message.includes("fetch") || e.message.includes("network"))) {
      throw new NetworkError();
    }
    throw e;
  }

  if (response.status === 401) {
    await authClient.signOut();
    router.replace("/welcome");
    throw new AuthError("Session expired");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  if (json && typeof json === "object" && "error" in json) {
    const err = json as { error?: { message?: string } };
    const error = new Error(err.error?.message ?? "Request failed");
    Sentry.captureException(error);
    throw error;
  }

  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }

  return json as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
