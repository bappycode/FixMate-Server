const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: required("MONGODB_URI"),
  // The client's public URL. Stripe sends customers back here after paying.
  authBaseUrl: withoutTrailingSlash(required("AUTH_BASE_URL")),
  clientOrigins: required("CLIENT_ORIGINS")
    .split(",")
    .map((origin) => withoutTrailingSlash(origin.trim()))
    .filter(Boolean),

  // Stripe. Optional at startup, so a missing key never stops the whole API from booting:
  // only the payment routes answer "Payments are not configured" until the keys are set.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || undefined,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || undefined,
} as const;
