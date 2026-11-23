import { CATEGORY_NAMES, SERVICE_MODES } from "../constants/services.js";
import type { ServiceDocument } from "../types/service.js";
import { fail, oneOf, parseImageUrl, parsePositiveAmount, requiredText } from "./common.js";

type ServiceInput = Pick<
  ServiceDocument,
  "title" | "category" | "description" | "image" | "basePrice" | "estimatedDuration" | "serviceMode" | "serviceArea"
>;

const LIMITS = {
  title: { min: 3, max: 100 },
  description: { min: 20, max: 1000 },
  duration: { min: 1, max: 50 },
  area: { min: 2, max: 100 },
  maxPrice: 100000,
} as const;

export function parseServiceInput(body: unknown): ServiceInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }
  const input = body as Record<string, unknown>;

  return {
    title: requiredText(input.title, "Title", LIMITS.title),
    category: oneOf(input.category, CATEGORY_NAMES, "Category"),
    description: requiredText(input.description, "Description", LIMITS.description),
    image: parseImageUrl(input.image),
    basePrice: parsePositiveAmount(input.basePrice, "Base price", LIMITS.maxPrice),
    estimatedDuration: requiredText(input.estimatedDuration, "Estimated duration", LIMITS.duration),
    serviceMode: oneOf(input.serviceMode, SERVICE_MODES, "Service mode"),
    serviceArea: requiredText(input.serviceArea, "Service area", LIMITS.area),
  };
}
