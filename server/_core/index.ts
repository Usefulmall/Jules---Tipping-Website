import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPaystackWebhook } from "../webhooks";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function getBaseUrl(req: any) {
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.origin;
    } catch (e) {}
  }
  return process.env.VITE_FRONTEND_URL || "http://localhost:3000";
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Paystack webhook
  registerPaystackWebhook(app);
  
  // REST endpoint for PDF generation
  app.get("/api/pdf/generate-tip-card", async (req, res) => {
    try {
      const workerUrl = req.query.workerUrl as string;
      if (!workerUrl) {
        return res.status(400).json({ error: "workerUrl is required" });
      }
      
      const db = await import("../db");
      const worker = await db.getWorkerByUniqueUrl(workerUrl);
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      
      const pdfGen = await import("../pdf-generator");
      const pdfBuffer = await pdfGen.generateTipCard({
        workerName: worker.fullName,
        role: worker.role,
        centre: `Employer ${worker.employerId}`,
        tipUrl: `${getBaseUrl(req)}/tip/${worker.uniqueUrl}`,
      });
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${worker.fullName.replace(/\s+/g, "_")}_tip_card.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
