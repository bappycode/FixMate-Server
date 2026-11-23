import type { UserRole } from "./auth.js";

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
