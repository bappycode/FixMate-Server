import { BOOKING_STATUSES, type BookingStatus } from "../constants/bookings.js";
import { fail, oneOf, parsePositiveAmount, PHONE_PATTERN, requiredText } from "./common.js";

const LIMITS = {
  address: { min: 5, max: 200 },
  problem: { min: 20, max: 1000 },
  maxAmount: 100000,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return fail("Preferred date is not a real date");
  }

  const now = new Date();
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() < startOfTodayUtc - DAY_MS) return fail("Preferred date must be today or later");
  return date;
};

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

interface StatusChangeInput {
  status: BookingStatus;
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
