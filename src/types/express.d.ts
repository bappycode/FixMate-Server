import type { AuthUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by verifyToken once the access token has been checked. */
      user?: AuthUser;
    }
  }
}

export {};
