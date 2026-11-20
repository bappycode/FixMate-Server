import { Router, type RequestHandler } from "express";
import type Stripe from "stripe";
import { env } from "../config/env.js";
import { bookingsCollection, paymentsCollection } from "../lib/collections.js";
import { settlePaidSession, toCustomerPayment } from "../lib/payments.js";
import { callStripe, getStripe } from "../lib/stripe.js";
import { getAuthUser, verifyCustomer, verifyToken } from "../middlewares/auth.js";
import { HttpError } from "../utils/httpError.js";
import { parseObjectId } from "../utils/object-id.js";
import { parseCheckoutRequest, parseSessionId } from "../validators/payment.js";

export const paymentsRouter = Router();

// Stripe refuses to charge less than 50 cents.
const MINIMUM_CENTS = 50;

// ============================================================================
// CUSTOMER (verifyToken, then verifyCustomer)
// ============================================================================

// POST /api/payments/create-checkout-session  { bookingId }
// Step 1 of paying. The amount comes from OUR database, never from the browser. Only a job
// that is completed and still unpaid, and that belongs to this customer, can be paid.
paymentsRouter.post("/create-checkout-session", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);
  const bookingId = parseCheckoutRequest(req.body);

  const booking = await bookingsCollection.findOne({
    _id: parseObjectId(bookingId, "Booking not found"),
    customerEmail: customer.email,
  });
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.status !== "completed") throw new HttpError(409, "Only a completed job can be paid");
  if (booking.paymentStatus !== "unpaid") throw new HttpError(409, "This booking is already paid");

  const unitAmount = Math.round(booking.finalAmount * 100); // dollars -> cents
  if (unitAmount < MINIMUM_CENTS) {
    throw new HttpError(409, "The amount is below the minimum Stripe can charge ($0.50)");
  }

  // Hosted Checkout: Stripe shows its own payment page, and the browser is sent to the
  // session's url. Card details never touch FixMate.
  const session = await callStripe(() =>
    getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: { name: booking.serviceTitle, description: `Repair by ${booking.technicianName}` },
          },
        },
      ],
      customer_email: customer.email,
      // The booking and customer are written onto the session, so when Stripe reports it back
      // (to the success page or the webhook) we know exactly which booking it pays for.
      metadata: { bookingId, customerEmail: customer.email },
      // Where Stripe sends the customer after paying (it fills in {CHECKOUT_SESSION_ID}),
      // and where its Back button leads if they change their mind.
      success_url: `${env.authBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.authBaseUrl}/payment/cancel`,
    }),
  );

  if (!session.url) throw new HttpError(502, "The payment provider did not return a checkout page");
  res.json({ url: session.url });
});

// GET /api/payments/verify?session_id=cs_test_...
// Step 2: the customer lands on the success page, which sends us the session id. We ask Stripe
// directly what happened to that session (we trust Stripe, not the browser), then settle it.
paymentsRouter.get("/verify", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);
  const sessionId = parseSessionId(req.query.session_id);

  const session = await callStripe(() => getStripe().checkout.sessions.retrieve(sessionId));
  const { payment, alreadyProcessed } = await settlePaidSession(session, customer.email);

  res.json({ payment: toCustomerPayment(payment), alreadyProcessed });
});

// GET /api/payments/my
// The customer's own payment history, newest first.
paymentsRouter.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);

  const payments = await paymentsCollection
    .find({ customerEmail: customer.email }, { projection: { technicianEmail: 0 } })
    .sort({ paidAt: -1, _id: -1 })
    .toArray();

  res.json({ payments });
});

// ============================================================================
// STRIPE WEBHOOK (no login: Stripe calls this, and the signature proves it is Stripe)
// ============================================================================

// POST /api/payments/webhook
// A second path to the same result, so a payment is never lost if the customer closes the
// tab before the success page loads. It uses the same settlePaidSession as /verify, which is
// why a payment that arrives both ways is still saved once. It is registered in app.ts with
// express.raw(), because the signature is computed over the exact bytes Stripe sent.
export const stripeWebhook: RequestHandler = async (req, res) => {
  const secret = env.stripeWebhookSecret;
  if (!secret) throw new HttpError(503, "The payment webhook is not configured yet");

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") throw new HttpError(400, "Missing Stripe signature");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, signature, secret);
  } catch {
    throw new HttpError(400, "Invalid webhook signature");
  }

  // "completed" fires when the customer finishes paying. "async_payment_succeeded" fires later
  // for slow methods (bank debits) whose money arrives after "completed".
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only sessions created by FixMate carry a bookingId. Anything else (such as a test event
    // sent with `stripe trigger`) is acknowledged and ignored.
    if (session.metadata?.bookingId) {
      try {
        await settlePaidSession(session);
      } catch (error) {
        // A rule we refuse on purpose (unpaid yet, amount mismatch, unknown booking) will fail the
        // same way on every retry, so acknowledge it. Anything else, such as the database being down,
        // propagates as a 500 so Stripe retries later.
        if (!(error instanceof HttpError)) throw error;
        console.warn(`Webhook ignored session ${session.id}: ${error.message}`);
      }
    }
  }

  res.json({ received: true });
};
