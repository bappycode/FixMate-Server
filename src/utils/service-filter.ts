import type { Filter, Sort } from "mongodb";
import type { ServiceSort } from "../constants/services.js";
import type { ServiceDocument } from "../types/service.js";
import type { ServiceQuery } from "../validators/service-query.js";
import { escapeRegExp } from "./regex.js";

/**
 * The MongoDB filter for the public services list.
 * Visitors only ever see services that an admin approved AND the technician left switched on.
 */
export function buildPublicFilter({ search, category, mode }: ServiceQuery): Filter<ServiceDocument> {
  const filter: Filter<ServiceDocument> = { approvalStatus: "approved", isAvailable: true };

  // Exact matches. The values are plain strings (see parseServiceQuery), so they cannot
  // carry Mongo operators; an unknown category or mode just matches nothing.
  if (category) filter.category = category as ServiceDocument["category"];
  if (mode) filter.serviceMode = mode as ServiceDocument["serviceMode"];

  // Case-insensitive "contains" search on title or category.
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    filter.$or = [{ title: pattern }, { category: pattern }];
  }

  return filter;
}

// _id is the tie-breaker, so services with the same price or time keep a stable order.
export const SORT_ORDERS: Record<ServiceSort, Sort> = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { basePrice: 1, _id: -1 },
  "price-desc": { basePrice: -1, _id: -1 },
};
