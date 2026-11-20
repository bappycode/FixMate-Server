import { BOOKING_STATUSES, type BookingStatus } from "../constants/bookings.js";
import { fail, oneOf, parsePositiveAmount, PHONE_PATTERN, requiredText } from "./common.js";

// Keep these equal to the limits in the client form (src/lib/booking-validation.ts).
const LIMITS = {
  address: { min: 5, max: 200 },
  problem: { min: 20, max: 1000 },
  maxAmount: 100000,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a customer sends to request a repair. Everything else on the booking is set by the server. */
interface BookingRequestInput {
  serviceId: string;
  customerPhone: string;
  address: string;
  preferredDate: Date;
  problemDescription: string;
}

const parsePreferredDate = (value: unknown): Date => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fail("Preferred date must be a date like 2026-12-31");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // Rejects impossible dates such as 2026-02-31, which JavaScript would roll over to March.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return fail("Preferred date is not a real date");
  }

  // "Today or later". One day of slack, because a customer in Bangladesh (UTC+6) can be on
  // "today" while it is still yesterday in UTC.
  const now = new Date();
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() < startOfTodayUtc - DAY_MS) return fail("Preferred date must be today or later");
  return date;
};

/** Validates the body of POST /api/bookings. */
export function parseBookingRequest(body: unknown): BookingRequestInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  const input = body as Record<string, unknown>;

  const customerPhone = requiredText(input.customerPhone, "Phone", { min: 1, max: 20 });
  if (!PHONE_PATTERN.test(customerPhone)) return fail("Enter a valid phone number");

  return {
    serviceId: typeof input.serviceId === "string" ? input.serviceId : fail("Service is required"),
    customerPhone,
    address: requiredText(input.address, "Address", LIMITS.address),
    preferredDate: parsePreferredDate(input.preferredDate),
    problemDescription: requiredText(input.problemDescription, "Problem description", LIMITS.problem),
  };
}

/** What a technician sends to move a job forward (PATCH /api/bookings/:id/status). */
interface StatusChangeInput {
  status: BookingStatus;
  /** Only used (and required) when the job is being completed. */
  finalAmount?: number;
}

export function parseStatusChange(body: unknown): StatusChangeInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  const input = body as Record<string, unknown>;

  return {
    status: oneOf(input.status, BOOKING_STATUSES, "Status"),
    finalAmount:
      input.finalAmount === undefined ? undefined : parsePositiveAmount(input.finalAmount, "Final amount", LIMITS.maxAmount),
  };
}
