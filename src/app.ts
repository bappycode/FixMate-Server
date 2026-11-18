import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { routes } from "./routes/index.js";

const app = express();

// Vercel sits in front of the app; trust it so rate limiting sees real client IPs.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));

// The Stripe webhook route goes here later. It needs express.raw() and must be
// registered before express.json() so the signature can be verified.

app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ service: "FixMate API", status: "running" });
});
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

// Vercel runs the exported app. Locally, src/dev.ts starts the listener.
export default app;
