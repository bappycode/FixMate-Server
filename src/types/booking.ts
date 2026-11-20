import type { BookingStatus, PaymentStatus } from "../constants/bookings.js";
import type { CategoryName } from "../constants/services.js";

/** One step in a booking's life, with the moment it happened. "paid" is the last step after "completed". */
export interface BookingHistoryEntry {
  status: BookingStatus | "paid";
  changedAt: Date;
}

/** A document in the "bookings" collection (_id is added by MongoDB). */
export interface BookingDocument {
  serviceId: string;
  // Copied from the service when the request is made, so the booking still shows
  // correctly if the service is edited or deleted later.
  serviceTitle: string;
  serviceImage: string;
  category: CategoryName;
  basePrice: number;
  technicianName: string;
  technicianEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  preferredDate: Date;
  problemDescription: string;
  status: BookingStatus;
  /** Starts equal to basePrice; the technician sets the real amount when completing the job. */
  finalAmount: number;
  paymentStatus: PaymentStatus;
  /**
   * The job's timeline, oldest first. Every change appends one entry, which feeds the step tracker.
   * Bookings created before this field existed (or inserted by hand) simply do not have it.
   */
  statusHistory?: BookingHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}
