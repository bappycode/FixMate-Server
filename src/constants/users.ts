import type { UserRole } from "../types/auth.js";

export const USER_ROLES = ["customer", "technician", "admin"] as const satisfies readonly UserRole[];
