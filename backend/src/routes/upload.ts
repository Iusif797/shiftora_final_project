import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

// Проверка реальной сигнатуры файла (magic bytes). Content-Type из multipart
// клиент может подделать (SVG/HTML под видом image/png → stored-XSS через CDN).
function detectedImageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

const uploadResultSchema = z.object({
  file: z.object({
    id: z.string().min(1).max(500),
    url: z.string().url().refine((value) => value.startsWith("https://")),
    originalFilename: z.string().min(1).max(500),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().nonnegative().max(MAX_FILE_SIZE),
  }),
});

router.post("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const declaredLength = Number(c.req.header("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FILE_SIZE + 1024 * 1024) {
    return c.json({ error: { message: "File is too large", code: "FILE_TOO_LARGE" } }, 413);
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: { message: "Invalid multipart body", code: "INVALID_UPLOAD" } }, 400);
  }
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: { message: "No file provided" } }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: { message: "File is too large", code: "FILE_TOO_LARGE" } }, 413);
  }

  const mime = file.type?.toLowerCase();
  if (!mime || !ALLOWED_MIMES.includes(mime)) {
    return c.json({ error: { message: "Unsupported file type", code: "INVALID_FILE_TYPE" } }, 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = bytes.subarray(0, 12);
  if (detectedImageMime(header) !== mime) {
    return c.json({ error: { message: "File content does not match its type", code: "INVALID_FILE_TYPE" } }, 415);
  }

  const storageForm = new FormData();
  storageForm.append("file", file);

  const response = await fetch("https://storage.vibecodeapp.com/v1/files/upload", {
    method: "POST",
    body: storageForm,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({} as Record<string, unknown>));
    return c.json({ error: { message: (errBody as Record<string, unknown>).error || "Upload failed" } }, 500);
  }

  const parsedResult = uploadResultSchema.safeParse(await response.json().catch(() => null));
  if (!parsedResult.success) {
    return c.json(
      { error: { message: "Storage returned an invalid response", code: "INVALID_STORAGE_RESPONSE" } },
      502,
    );
  }
  const result = parsedResult.data;

  const asset = await prisma.asset.create({
    data: {
      userId: user.id,
      fileId: result.file.id,
      url: result.file.url,
      filename: result.file.originalFilename,
      contentType: result.file.contentType,
      sizeBytes: result.file.sizeBytes,
    },
  });

  return c.json({ data: asset });
});

router.delete("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const { id } = c.req.param();

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset || asset.userId !== user.id) {
    return c.json({ error: { message: "Not found or forbidden" } }, 404);
  }

  const response = await fetch(`https://storage.vibecodeapp.com/v1/files/${encodeURIComponent(asset.fileId)}`, {
    method: "DELETE",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok && response.status !== 404) {
    return c.json({ error: { message: "Delete failed" } }, 500);
  }

  await prisma.asset.delete({
    where: { id },
  });

  return c.json({ data: { success: true } });
});

export { router as uploadRouter };
