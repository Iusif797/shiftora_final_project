import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

interface UploadResult {
  file: {
    id: string;
    url: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
  };
}

const router = new Hono<AuthContext>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

router.post("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: { message: "No file provided" } }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: { message: "Файл слишком большой", code: "FILE_TOO_LARGE" } }, 413);
  }

  const mime = file.type?.toLowerCase();
  if (!mime || !ALLOWED_MIMES.includes(mime)) {
    return c.json({ error: { message: "Недопустимый тип файла", code: "INVALID_FILE_TYPE" } }, 415);
  }

  const storageForm = new FormData();
  storageForm.append("file", file);

  const response = await fetch("https://storage.vibecodeapp.com/v1/files/upload", {
    method: "POST",
    body: storageForm,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({} as Record<string, unknown>));
    return c.json({ error: { message: (errBody as Record<string, unknown>).error || "Upload failed" } }, 500);
  }

  const result = (await response.json()) as UploadResult;

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

  const response = await fetch(`https://storage.vibecodeapp.com/v1/files/${asset.fileId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    return c.json({ error: { message: "Delete failed" } }, 500);
  }

  await prisma.asset.delete({
    where: { id },
  });

  return c.json({ data: { success: true } });
});

export { router as uploadRouter };
