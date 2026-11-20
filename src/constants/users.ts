import type { UserRole } from "../types/auth.js";

// The roles a user can have. Anyone who signs up starts as customer or technician;
// only an admin can change a role afterwards.
export const USER_ROLES = ["customer", "technician", "admin"] as const satisfies readonly UserRole[];
