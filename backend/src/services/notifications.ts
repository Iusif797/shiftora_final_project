export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string
): Promise<void> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: pushToken,
      title,
      body,
      sound: "default",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Expo push failed: ${err}`);
  }
}
