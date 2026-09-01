import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerFormRoutes } from "../formRoutes";
import { registerPrivacyRoute } from "../privacyRoute";
import { registerSupportRoute } from "../supportRoute";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-commercial-token, x-admin-token",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);
  registerFormRoutes(app);
  registerPrivacyRoute(app);
  registerSupportRoute(app);

  // Comprobación ligera: confirma que el proceso de Render está vivo.
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, render: "ok", timestamp: Date.now() });
  });

  // Comprobación completa: confirma Render + conexión real con Supabase/Postgres.
  app.get("/api/health/full", async (_req, res) => {
    const startedAt = Date.now();

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({
          ok: false,
          render: "ok",
          database: "error",
          error: "Database connection unavailable",
          responseTimeMs: Date.now() - startedAt,
          timestamp: Date.now(),
        });
        return;
      }

      await db.execute(sql`SELECT 1`);

      res.json({
        ok: true,
        render: "ok",
        database: "ok",
        responseTimeMs: Date.now() - startedAt,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[Health] Full health check failed:", error);
      res.status(503).json({
        ok: false,
        render: "ok",
        database: "error",
        error: error instanceof Error ? error.message : "Unknown database error",
        responseTimeMs: Date.now() - startedAt,
        timestamp: Date.now(),
      });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
