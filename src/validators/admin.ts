import { USER_ROLES } from "../constants/users.js";
import { fail, oneOf } from "./common.js";

const readField = (body: unknown, field: string): unknown => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  return (body as Record<string, unknown>)[field];
};

export const parseRole = (body: unknown) => oneOf(readField(body, "role"), USER_ROLES, "Role");

export const parseApprovalDecision = (body: unknown) =>
  oneOf(readField(body, "approvalStatus"), ["approved", "rejected"] as const, "Approval status");

export const parseAvailability = (body: unknown): boolean => {
  const isAvailable = readField(body, "isAvailable");
  if (typeof isAvailable !== "boolean") return fail("isAvailable must be true or false");
  return isAvailable;
};
