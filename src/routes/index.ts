import { Router } from "express";
import { verifyToken } from "../middlewares/auth.js";
import { adminRouter } from "./admin.js";
import { bookingsRouter } from "./bookings.js";
import { paymentsRouter } from "./payments.js";
import { servicesRouter } from "./services.js";
import { usersRouter } from "./users.js";

export const routes = Router();

routes.use("/admin", adminRouter);
routes.use("/bookings", bookingsRouter);
routes.use("/payments", paymentsRouter);
routes.use("/services", servicesRouter);
routes.use("/users", usersRouter);

routes.get("/health", (_req, res) => {
  res.json({ ok: true });
});

routes.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});
