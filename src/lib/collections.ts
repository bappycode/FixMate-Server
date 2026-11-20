import type { BookingDocument } from "../types/booking.js";
import type { PaymentDocument } from "../types/payment.js";
import type { ServiceDocument } from "../types/service.js";
import type { UserDocument } from "../types/user.js";
import { db } from "./db.js";

// Typed handles to the collections, so queries are checked against the document shapes.
export const servicesCollection = db.collection<ServiceDocument>("services");
export const usersCollection = db.collection<UserDocument>("user");
export const bookingsCollection = db.collection<BookingDocument>("bookings");
export const paymentsCollection = db.collection<PaymentDocument>("payments");

let paymentIndexes: Promise<unknown> | undefined;

/**
 * Makes sure the database itself refuses duplicate payments, whatever the code does:
 * one payment per Stripe session, and one payment per booking. Creating an index that
 * already exists does nothing, so this is safe to call before every save. It runs once
 * per server instance.
 */
export function ensurePaymentIndexes(): Promise<unknown> {
  paymentIndexes ??= Promise.all([
    paymentsCollection.createIndex({ stripeSessionId: 1 }, { unique: true }),
    paymentsCollection.createIndex({ bookingId: 1 }, { unique: true }),
  ]).catch((error) => {
    paymentIndexes = undefined; // try again next time instead of caching the failure
    throw error;
  });
  return paymentIndexes;
}
