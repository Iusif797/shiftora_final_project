import * as Sentry from "@sentry/react-native";
import { fetch } from "expo/fetch";
import { router } from "expo-router";
import { authClient } from "../auth/auth-client";
import { BACKEND_URL } from "../config";

const baseUrl = BACKEND_URL;

export class NetworkError extends Error {
  constructor() {
    super("No internet connection");
    this.name = "NetworkError";
  }
}

export class AuthError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "AuthError";
  }
}

export class SubscriptionError extends Error {
  code: string;

  constructor(message: string, code = "SUBSCRIPTION_REQUIRED") {
    super(message);
    this.name = "SubscriptionError";
    this.code = code;
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

  if (response.status === 402 && json && typeof json === "object" && "error" in json) {
    const err = json as { error?: { message?: string; code?: string } };
    throw new SubscriptionError(
      err.error?.message ?? "Subscription upgrade required",
      err.error?.code ?? "SUBSCRIPTION_REQUIRED",
    );
  }

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
    request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
