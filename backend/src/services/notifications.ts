const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

function isValidExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") && token.endsWith("]");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string
): Promise<void> {
  if (!isValidExpoToken(pushToken)) {
    console.error(`[Push] Invalid token format: ${pushToken}`);
    return;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: pushToken, title, body, sound: "default" }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const json = (await response.json()) as {
        data?: { status: string; message?: string }[];
      };

      // Expo returns 200 even for delivery errors — check payload
      const ticket = json.data?.[0];
      if (ticket?.status === "error") {
        throw new Error(`Expo error: ${ticket.message ?? "unknown"}`);
      }

      return; // success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isLastAttempt = attempt === MAX_RETRIES;

      if (!isLastAttempt) {
        const delay = RETRY_BASE_MS * 2 ** (attempt - 1); // 500ms, 1s, 2s
        console.warn(
          `[Push] Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms. Reason: ${lastError.message}`
        );
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — log so Sentry/Render picks it up
  console.error(
    `[Push] Failed to deliver notification after ${MAX_RETRIES} attempts. Token: ${pushToken.slice(0, 30)}... Error: ${lastError?.message}`
  );
}
