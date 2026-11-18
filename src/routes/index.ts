import { Router } from "express";
import { verifyToken } from "../middlewares/auth.js";

export const routes = Router();

routes.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Returns the verified user. Used to check the whole sign-in -> JWT -> API chain.
routes.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});
