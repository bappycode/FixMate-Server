import { Router } from "express";
import { db } from "../lib/db.js";
import { verifyToken } from "../middlewares/auth.js";
import { parseProfileUpdate } from "../validators/profile.js";
import { HttpError } from "../utils/httpError.js";

export const usersRouter = Router();

usersRouter.patch("/profile", verifyToken, async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new HttpError(401, "Not authenticated");

  const update = parseProfileUpdate(req.body);

  const updated = await db
    .collection("user")
    .findOneAndUpdate(
      { email: authUser.email },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
  if (!updated) throw new HttpError(404, "User not found");

  res.json({
    user: {
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email,
      image: updated.image ?? null,
      role: updated.role ?? "customer",
      phone: updated.phone ?? "",
      area: updated.area ?? "",
      bio: updated.bio ?? "",
    },
  });
});
