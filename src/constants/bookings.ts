export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** A customer may only have one request in these states for the same service. */
export const ACTIVE_BOOKING_STATUSES = ["requested", "accepted", "in-progress"] as const satisfies readonly BookingStatus[];

export type PaymentStatus = "unpaid" | "paid";

/** Who is allowed to move a booking from one status to the next. */
export type BookingActor = "technician" | "customer";

/**
 * The job status pipeline, in one place. Reading it top to bottom is the whole rulebook:
 *
 *   requested   -> accepted | rejected   (technician)    or  -> cancelled  (customer)
 *   accepted    -> in-progress           (technician)
 *   in-progress -> completed             (technician, and a final amount is required)
 *   completed, rejected, cancelled       final: nothing can change them
 *
 * Any change that is not in this table (for example requested -> completed) is refused.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, BookingActor>>> = {
  requested: { accepted: "technician", rejected: "technician", cancelled: "customer" },
  accepted: { "in-progress": "technician" },
  "in-progress": { completed: "technician" },
  completed: {},
  rejected: {},
  cancelled: {},
};
