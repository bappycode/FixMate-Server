import { USER_ROLES } from "../constants/users.js";
import { fail, oneOf } from "./common.js";

// Small validators for the admin and availability request bodies. Each reads one field
// from a JSON object and rejects (400) anything that is not exactly what is expected.

const readField = (body: unknown, field: string): unknown => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  return (body as Record<string, unknown>)[field];
};

/** PATCH /api/admin/users/:id/role  { role } */
export const parseRole = (body: unknown) => oneOf(readField(body, "role"), USER_ROLES, "Role");

/** PATCH /api/admin/services/:id/approval  { approvalStatus }. An admin decides: approve or reject. */
export const parseApprovalDecision = (body: unknown) =>
  oneOf(readField(body, "approvalStatus"), ["approved", "rejected"] as const, "Approval status");

/** PATCH /api/services/:id/availability  { isAvailable } */
export const parseAvailability = (body: unknown): boolean => {
  const isAvailable = readField(body, "isAvailable");
  if (typeof isAvailable !== "boolean") return fail("isAvailable must be true or false");
  return isAvailable;
};
