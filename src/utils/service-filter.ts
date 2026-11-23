import type { Filter, Sort } from "mongodb";
import type { ServiceSort } from "../constants/services.js";
import type { ServiceDocument } from "../types/service.js";
import type { ServiceQuery } from "../validators/service-query.js";
import { escapeRegExp } from "./regex.js";

export function buildPublicFilter({ search, category, mode }: ServiceQuery): Filter<ServiceDocument> {
  const filter: Filter<ServiceDocument> = { approvalStatus: "approved", isAvailable: true };

  if (category) filter.category = category as ServiceDocument["category"];
  if (mode) filter.serviceMode = mode as ServiceDocument["serviceMode"];

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    filter.$or = [{ title: pattern }, { category: pattern }];
  }

  return filter;
}

export const SORT_ORDERS: Record<ServiceSort, Sort> = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { basePrice: 1, _id: -1 },
  "price-desc": { basePrice: -1, _id: -1 },
};
