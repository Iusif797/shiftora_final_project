import { Hono } from "hono";
import { prisma } from "../prisma";
import { env } from "../env";
import { type AuthContext, getAuthUser } from "../middleware/auth";
import {
  deleteStoredFile,
  etagFor,
  isValidFileId,
  newFileId,
  publicUrlForFileId,
  readStoredFile,
  writeStoredFile,
} from "../lib/storage";

const router = new Hono<AuthContext>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

// Проверка реальной сигнатуры файла (magic bytes). Content-Type из multipart
// клиент может подделать (SVG/HTML под видом image/png → stored-XSS).
function detectedImageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

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

  // Повторная проверка размера уже по фактически прочитанным байтам:
  // file.size — это заявленное значение, доверять ему одному нельзя.
  if (bytes.byteLength > MAX_FILE_SIZE) {
    return c.json({ error: { message: "File is too large", code: "FILE_TOO_LARGE" } }, 413);
  }

  // Файл сохраняется на наш диск. Раньше здесь был POST на
  // https://storage.vibecodeapp.com/v1/files/upload — данные пользователей
  // уходили третьей стороне.
  const fileId = newFileId();
  try {
    await writeStoredFile(fileId, mime, bytes);
  } catch {
    return c.json({ error: { message: "Failed to store file", code: "STORAGE_WRITE_FAILED" } }, 500);
  }

  const originalFilename =
    typeof file.name === "string" && file.name.length > 0 ? file.name.slice(0, 500) : "upload";

  try {
    const asset = await prisma.asset.create({
      data: {
        userId: user.id,
        fileId,
        url: publicUrlForFileId(env.BACKEND_URL, fileId),
        filename: originalFilename,
        contentType: mime,
        sizeBytes: bytes.byteLength,
      },
    });
    return c.json({ data: asset });
  } catch (err) {
    // Не оставляем осиротевший файл на диске, если строка в БД не создалась.
    await deleteStoredFile(fileId, mime).catch(() => {});
    throw err;
  }
});

/**
 * Отдача файла. Путь неугадываем (256 бит энтропии в fileId), поэтому
 * работает обычный <Image source={{uri}}> без заголовка авторизации — как и
 * раньше с CDN-ссылкой, но теперь байты лежат у нас.
 */
router.get("/f/:fileId", async (c) => {
  const { fileId } = c.req.param();
  if (!isValidFileId(fileId)) {
    return c.json({ error: { message: "Not found" } }, 404);
  }

  const asset = await prisma.asset.findFirst({
    where: { fileId },
    select: { contentType: true, filename: true },
  });
  if (!asset) {
    return c.json({ error: { message: "Not found" } }, 404);
  }

  const bytes = await readStoredFile(fileId, asset.contentType);
  if (!bytes) {
    // Строка есть, файла нет: это legacy-ассет, чьи байты остались у прежнего
    // стороннего хранилища, либо файл был удалён с диска.
    return c.json({ error: { message: "Not found" } }, 404);
  }

  const etag = etagFor(bytes);
  if (c.req.header("if-none-match") === etag) {
    return c.body(null, 304);
  }

  c.header("Content-Type", asset.contentType);
  c.header("Content-Length", String(bytes.byteLength));
  c.header("ETag", etag);
  // Содержимое иммутабельно: id уникален для каждой загрузки.
  c.header("Cache-Control", "private, max-age=31536000, immutable");
  c.header("X-Content-Type-Options", "nosniff");
  // Даже при провале валидации типа файл не должен исполниться в браузере.
  c.header("Content-Security-Policy", "default-src 'none'; sandbox");
  c.header("Content-Disposition", "inline");
  // c.body() принимает ArrayBuffer, а не Uint8Array. Вырезаем ровно тот кусок
  // буфера, который занимает файл: readFile может вернуть view на буфер
  // большего размера, и отдача bytes.buffer целиком слила бы чужую память.
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return c.body(body);
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

  // Для legacy-ассетов (fileId не наш формат) на диске ничего нет — просто
  // убираем строку. Сторонний вызов на удаление намеренно не выполняется.
  await deleteStoredFile(asset.fileId, asset.contentType).catch(() => {});

  await prisma.asset.delete({
    where: { id },
  });

  return c.json({ data: { success: true } });
});

export { router as uploadRouter };
