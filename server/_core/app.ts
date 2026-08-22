import "dotenv/config";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { webhookRouter } from "../webhooks";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createExpressApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  // Standard Security Headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Configure body parser with larger size limit for file uploads & webhooks
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Routes & Middlewares
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/webhooks", webhookRouter);

  // tRPC API Router
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

export const app = createExpressApp();
