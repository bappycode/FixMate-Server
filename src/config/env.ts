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
  authBaseUrl: withoutTrailingSlash(required("AUTH_BASE_URL")),
  clientOrigins: required("CLIENT_ORIGINS")
    .split(",")
    .map((origin) => withoutTrailingSlash(origin.trim()))
    .filter(Boolean),
} as const;
