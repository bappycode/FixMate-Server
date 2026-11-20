import type { UserRole } from "./auth.js";

/** A document in Better Auth's "user" collection, which is our users collection. */
export interface UserDocument {
  name: string;
  email: string;
  image?: string | null;
  role?: UserRole;
  phone?: string;
  area?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
