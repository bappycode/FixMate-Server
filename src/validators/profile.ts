import { fail, parseImageUrl, PHONE_PATTERN } from "./common.js";

const LIMITS = { nameMin: 2, nameMax: 80, area: 100, bio: 500 } as const;

/** The only fields a user may change on their own profile. Role is deliberately not here. */
type ProfileUpdate = {
  name?: string;
  phone?: string;
  area?: string;
  bio?: string;
  image?: string;
};

/** Reads an optional text field: undefined when absent, trimmed text when valid. */
const optionalText = (value: unknown, label: string, maxLength: number): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return fail(`${label} must be text`);
  const text = value.trim();
  if (text.length > maxLength) return fail(`${label} must be at most ${maxLength} characters`);
  return text;
};

const parseName = (value: unknown): string | undefined => {
  const name = optionalText(value, "Name", LIMITS.nameMax);
  if (name !== undefined && name.length < LIMITS.nameMin) {
    return fail(`Name must be at least ${LIMITS.nameMin} characters`);
  }
  return name;
};

const parsePhone = (value: unknown): string | undefined => {
  const phone = optionalText(value, "Phone", 20);
  // An empty string clears the phone number; anything else must look like one.
  if (phone && !PHONE_PATTERN.test(phone)) return fail("Enter a valid phone number");
  return phone;
};

// The image is optional on a profile update: absent means "keep the current photo".
const parseImage = (value: unknown): string | undefined => (value === undefined ? undefined : parseImageUrl(value));

/**
 * Validates a profile update body and returns only the allowed fields.
 * Unknown fields (for example "role" or "email") are silently dropped.
 */
export function parseProfileUpdate(body: unknown): ProfileUpdate {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  const input = body as Record<string, unknown>;

  const update: ProfileUpdate = {
    name: parseName(input.name),
    phone: parsePhone(input.phone),
    area: optionalText(input.area, "Area", LIMITS.area),
    bio: optionalText(input.bio, "Bio", LIMITS.bio),
    image: parseImage(input.image),
  };

  // Drop keys that were not sent, so $set never overwrites a field with undefined.
  const definedEntries = Object.entries(update).filter(([, value]) => value !== undefined);
  if (definedEntries.length === 0) return fail("No valid fields to update");

  return Object.fromEntries(definedEntries) as ProfileUpdate;
}
