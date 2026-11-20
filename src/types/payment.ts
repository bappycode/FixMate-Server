/** A document in the "payments" collection (_id is added by MongoDB). One per paid booking. */
export interface PaymentDocument {
  bookingId: string;
  serviceTitle: string;
  customerName: string;
  customerEmail: string;
  technicianName: string;
  technicianEmail: string;
  /** In dollars, equal to the booking's finalAmount. */
  amount: number;
  currency: "usd";
  /** The Stripe PaymentIntent id. */
  transactionId: string;
  /** The Stripe Checkout Session id. Unique, so one payment can never be saved twice. */
  stripeSessionId: string;
  paymentStatus: "paid";
  paidAt: Date;
}
