import { ObjectId, type WithId } from "mongodb";
import type Stripe from "stripe";
import type { PaymentDocument } from "../types/payment.js";
import { HttpError } from "../utils/httpError.js";
import { bookingsCollection, ensurePaymentIndexes, paymentsCollection } from "./collections.js";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

interface SettleResult {
  payment: WithId<PaymentDocument>;
  alreadyProcessed: boolean;
}

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;

export async function settlePaidSession(
  session: Stripe.Checkout.Session,
  expectedCustomerEmail?: string,
): Promise<SettleResult> {
  if (session.payment_status !== "paid") {
    throw new HttpError(409, "This payment has not been completed");
  }

  const bookingIdText = session.metadata?.bookingId;
  const ownerEmail = session.metadata?.customerEmail;
  if (!bookingIdText || !ownerEmail || !OBJECT_ID_PATTERN.test(bookingIdText)) {
    throw new HttpError(400, "This payment session does not belong to a FixMate booking");
  }
  if (expectedCustomerEmail && ownerEmail !== expectedCustomerEmail) {
    throw new HttpError(403, "This payment belongs to another account");
  }

  const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingIdText) });
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.customerEmail !== ownerEmail) {
    throw new HttpError(409, "This payment does not match the booking's customer");
  }

  const expectedCents = Math.round(booking.finalAmount * 100);
  if (session.amount_total !== expectedCents || session.currency !== "usd") {
    console.error(
      `Payment amount mismatch for booking ${bookingIdText}: Stripe collected ${session.amount_total} ${session.currency}, expected ${expectedCents} usd`,
    );
    throw new HttpError(409, "The paid amount does not match this booking");
  }

  const paymentIntent = session.payment_intent;
  const transactionId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!transactionId) throw new HttpError(409, "The payment has no transaction id yet");

  await ensurePaymentIndexes();
  const payment: PaymentDocument = {
    bookingId: bookingIdText,
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: expectedCents / 100,
    currency: "usd",
    transactionId,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  let alreadyProcessed = false;
  try {
    await paymentsCollection.insertOne(payment);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    alreadyProcessed = true;
  }

  const saved = await paymentsCollection.findOne({ stripeSessionId: session.id });
  if (!saved) {
    console.error(`Booking ${bookingIdText} is already paid. Session ${session.id} was charged and needs a refund.`);
    throw new HttpError(409, "This booking was already paid with another payment");
  }

  const now = new Date();
  await bookingsCollection.updateOne(
    { _id: booking._id, paymentStatus: "unpaid" },
    {
      $set: { paymentStatus: "paid", updatedAt: now },
      $push: { statusHistory: { status: "paid", changedAt: now } },
    },
  );

  return { payment: saved, alreadyProcessed };
}

export const toCustomerPayment = ({ technicianEmail: _technicianEmail, ...payment }: WithId<PaymentDocument>) => payment;
