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

const MINIMUM_CENTS = 50;

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

  const unitAmount = Math.round(booking.finalAmount * 100);
  if (unitAmount < MINIMUM_CENTS) {
    throw new HttpError(409, "The amount is below the minimum Stripe can charge ($0.50)");
  }

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
      metadata: { bookingId, customerEmail: customer.email },
      success_url: `${env.authBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.authBaseUrl}/payment/cancel`,
    }),
  );

  if (!session.url) throw new HttpError(502, "The payment provider did not return a checkout page");
  res.json({ url: session.url });
});

paymentsRouter.get("/verify", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);
  const sessionId = parseSessionId(req.query.session_id);

  const session = await callStripe(() => getStripe().checkout.sessions.retrieve(sessionId));
  const { payment, alreadyProcessed } = await settlePaidSession(session, customer.email);

  res.json({ payment: toCustomerPayment(payment), alreadyProcessed });
});

paymentsRouter.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);

  const payments = await paymentsCollection
    .find({ customerEmail: customer.email }, { projection: { technicianEmail: 0 } })
    .sort({ paidAt: -1, _id: -1 })
    .toArray();

  res.json({ payments });
});

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

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.bookingId) {
      try {
        await settlePaidSession(session);
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        console.warn(`Webhook ignored session ${session.id}: ${error.message}`);
      }
    }
  }

  res.json({ received: true });
};
