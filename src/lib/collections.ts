import type { BookingDocument } from "../types/booking.js";
import type { PaymentDocument } from "../types/payment.js";
import type { ServiceDocument } from "../types/service.js";
import type { UserDocument } from "../types/user.js";
import { db } from "./db.js";

export const servicesCollection = db.collection<ServiceDocument>("services");
export const usersCollection = db.collection<UserDocument>("user");
export const bookingsCollection = db.collection<BookingDocument>("bookings");
export const paymentsCollection = db.collection<PaymentDocument>("payments");

let paymentIndexes: Promise<unknown> | undefined;

export function ensurePaymentIndexes(): Promise<unknown> {
  paymentIndexes ??= Promise.all([
    paymentsCollection.createIndex({ stripeSessionId: 1 }, { unique: true }),
    paymentsCollection.createIndex({ bookingId: 1 }, { unique: true }),
  ]).catch((error) => {
    paymentIndexes = undefined;
    throw error;
  });
  return paymentIndexes;
}
