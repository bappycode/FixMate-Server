import type { Request, RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
import type { UserRole } from "../types/auth.js";
import { HttpError } from "../utils/httpError.js";

// Better Auth (running in the Next.js client) publishes its public keys here.
// jose fetches them once, caches them, and refetches if it sees an unknown key id.
const jwks = createRemoteJWKSet(new URL(`${env.authBaseUrl}/api/auth/jwks`));

const getBearerToken = (req: Request): string | null => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  return scheme === "Bearer" && token ? token : null;
};

/** 401 unless the request carries a valid, unexpired access token. */
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

  // The role is read from the database, not trusted from the token, so a role
  // change made by an admin applies immediately.
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

// Always use these after verifyToken.
export const verifyCustomer = requireRole("customer");
export const verifyTechnician = requireRole("technician");
export const verifyAdmin = requireRole("admin");
