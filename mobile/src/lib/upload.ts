import { authClient } from "./auth/auth-client";
import { BACKEND_URL } from "./config";

type UploadResult = { id: string; url: string; filename: string; contentType: string; sizeBytes: number };

export async function uploadFile(uri: string, filename: string, mimeType: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", { uri, type: mimeType, name: filename } as any);

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: { Cookie: authClient.getCookie() },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.error || "Upload failed");
  return data.data;
}
