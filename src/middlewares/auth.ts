import type { Request, RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
import type { AuthUser, UserRole } from "../types/auth.js";
import { HttpError } from "../utils/httpError.js";

const jwks = createRemoteJWKSet(new URL(`${env.authBaseUrl}/api/auth/jwks`));

const getBearerToken = (req: Request): string | null => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  return scheme === "Bearer" && token ? token : null;
};

export const verifyToken: RequestHandler = async (req, _res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Missing access token");
  }

  let email: unknown;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.authBaseUrl,
      audience: env.authBaseUrl,
    });
    email = payload.email;
  } catch {
    throw new HttpError(401, "Invalid or expired access token");
  }

  if (typeof email !== "string") {
    throw new HttpError(401, "Invalid access token");
  }

  const user = await db
    .collection<{ email: string; name: string; role?: UserRole }>("user")
    .findOne({ email });

  if (!user) {
    throw new HttpError(401, "User not found");
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role ?? "customer",
  };
  next();
};

const requireRole =
  (...allowedRoles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      throw new HttpError(401, "Not authenticated");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new HttpError(403, "You do not have permission to do this");
    }
    next();
  };

export const verifyCustomer = requireRole("customer");
export const verifyTechnician = requireRole("technician");
export const verifyAdmin = requireRole("admin");

export const getAuthUser = (req: Request): AuthUser => {
  if (!req.user) throw new HttpError(401, "Not authenticated");
  return req.user;
};
