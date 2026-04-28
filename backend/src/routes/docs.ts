import { Hono } from "hono";
import { buildOpenApiSpec } from "../lib/openapi";

/**
 * Документация API:
 *   • GET /api/openapi.json — сырая OpenAPI 3.0 спека (для Postman/Insomnia)
 *   • GET /api/docs         — Swagger UI (через CDN, никаких зависимостей)
 *
 * Подключается в src/index.ts: app.route("/api", docsRouter)
 */
export const docsRouter = new Hono();

docsRouter.get("/openapi.json", (c) => c.json(buildOpenApiSpec()));

docsRouter.get("/docs", (c) =>
  c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Shiftora API · Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b0b10; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
        });
      };
    </script>
  </body>
</html>`),
);
