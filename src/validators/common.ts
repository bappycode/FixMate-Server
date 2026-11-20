import { HttpError } from "../utils/httpError.js";

// Helpers shared by the validators (profile, service, booking, admin).

// Every uploaded image (profile photos, service banners) is stored on ImgBB.
const IMAGE_HOSTS = new Set(["i.ibb.co", "i.ibb.co.com"]);

export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{5,18}$/;

/** Stops validation with a 400 and the given message. */
export const fail = (message: string): never => {
  throw new HttpError(400, message);
};

/** The value must be exactly one of the allowed options. */
export const oneOf = <T extends string>(value: unknown, options: readonly T[], label: string): T =>
  options.find((option) => option === value) ?? fail(`${label} must be one of: ${options.join(", ")}`);

/** Reads a required text field and checks its trimmed length. */
export const requiredText = (value: unknown, label: string, { min, max }: { min: number; max: number }): string => {
  if (typeof value !== "string" || value.trim() === "") return fail(`${label} is required`);
  const text = value.trim();
  if (text.length < min) return fail(`${label} must be at least ${min} characters`);
  if (text.length > max) return fail(`${label} must be at most ${max} characters`);
  return text;
};

/** A real number greater than 0 and at most `max`, rounded to two decimal places. */
export const parsePositiveAmount = (value: unknown, label: string, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fail(`${label} must be a number greater than 0`);
  }
  if (value > max) return fail(`${label} must be at most ${max}`);
  return Math.round(value * 100) / 100;
};

/** Accepts only an https URL on one of the ImgBB hosts, and returns it normalised. */
export const parseImageUrl = (value: unknown): string => {
  if (typeof value !== "string") return fail("Image must be a URL");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("Image must be a valid URL");
  }
  if (url.protocol !== "https:" || !IMAGE_HOSTS.has(url.hostname)) {
    return fail("Image must be uploaded through FixMate");
  }
  return url.toString();
};
