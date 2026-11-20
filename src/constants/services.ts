// The allowed values for service fields. The client keeps the same lists in src/lib/categories.ts.

export const CATEGORY_NAMES = [
  "Smartphone",
  "Laptop & PC",
  "AC",
  "Refrigerator",
  "TV",
  "Washing Machine",
  "Electrical",
] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

export const SERVICE_MODES = ["Home Visit", "Shop Drop-off"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** The sort options the browse page offers (?sort=...). */
export const SERVICE_SORTS = ["newest", "price-asc", "price-desc"] as const;
export type ServiceSort = (typeof SERVICE_SORTS)[number];
