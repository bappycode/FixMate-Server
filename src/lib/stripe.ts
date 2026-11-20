import Stripe from "stripe";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

let client: Stripe | undefined;

/**
 * The Stripe client, created on first use with the secret key from the environment.
 * Without a key the payment routes answer 503 instead of crashing the server.
 */
export function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new HttpError(503, "Payments are not configured yet");
  }

  client ??= new Stripe(env.stripeSecretKey);
  return client;
}

/**
 * Runs a Stripe call and turns Stripe's errors into our own: a session that does not
 * exist is a 404, and anything else from Stripe is a 502 (Stripe failed, not the customer).
 */
export async function callStripe<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") {
      throw new HttpError(404, "Payment session not found");
    }
    console.error("Stripe request failed:", error);
    throw new HttpError(502, "Could not reach the payment provider. Please try again.");
  }
}
