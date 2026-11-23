import { fail } from "./common.js";

export function parseCheckoutRequest(body: unknown): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  const { bookingId } = body as Record<string, unknown>;
  return typeof bookingId === "string" && bookingId !== "" ? bookingId : fail("Booking is required");
}

export function parseSessionId(value: unknown): string {
  if (typeof value !== "string" || !/^cs_(test|live)_[A-Za-z0-9_]+$/.test(value)) {
    return fail("A valid session_id is required");
  }
  return value;
}
