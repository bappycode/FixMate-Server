export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ACTIVE_BOOKING_STATUSES = ["requested", "accepted", "in-progress"] as const satisfies readonly BookingStatus[];

export type PaymentStatus = "unpaid" | "paid";

export type BookingActor = "technician" | "customer";

export const BOOKING_TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, BookingActor>>> = {
  requested: { accepted: "technician", rejected: "technician", cancelled: "customer" },
  accepted: { "in-progress": "technician" },
  "in-progress": { completed: "technician" },
  completed: {},
  rejected: {},
  cancelled: {},
};
