import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { BACKEND_URL } from "../config";

/** Префикс, под которым @better-auth/expo пишет в SecureStore. */
export const SESSION_STORAGE_PREFIX = "shiftora";
/** Ключ последней успешной сессии (@better-auth/expo: `${prefix}_session_data`). */
export const SESSION_CACHE_KEY = `${SESSION_STORAGE_PREFIX}_session_data`;

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    expoClient({
      scheme: "shiftora",
      storagePrefix: SESSION_STORAGE_PREFIX,
      storage: SecureStore,
    }),
  ],
});
