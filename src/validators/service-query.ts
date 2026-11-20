import { SERVICE_SORTS, type ServiceSort } from "../constants/services.js";

/** What the browse page can ask for, after the raw query string has been cleaned up. */
export interface ServiceQuery {
  search?: string;
  category?: string;
  mode?: string;
  sort: ServiceSort;
  /** How many services per page. */
  limit: number;
  /** Which page, starting at 1. */
  page: number;
}

const MAX_SEARCH_LENGTH = 100;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_PAGE = 10_000;

/** Query values are only trusted when they are plain, non-empty strings. */
const readText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text === "" ? undefined : text;
};

const readSort = (value: unknown): ServiceSort => {
  const sort = readText(value);
  return SERVICE_SORTS.find((option) => option === sort) ?? "newest";
};

/** A whole number of at least 1, or the fallback. */
const readPositiveInt = (value: unknown, fallback: number, max: number): number => {
  const number = Number(readText(value));
  return Number.isInteger(number) && number >= 1 ? Math.min(number, max) : fallback;
};

/**
 * Cleans the query string of GET /api/services. It never throws: a missing or odd value
 * is ignored, so a stale link such as ?sort=banana still shows the page, sorted by newest.
 * Category and mode are kept as given; an unknown one simply matches no services.
 */
export function parseServiceQuery(query: unknown): ServiceQuery {
  const input = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};

  return {
    search: readText(input.search)?.slice(0, MAX_SEARCH_LENGTH),
    category: readText(input.category),
    mode: readText(input.mode),
    sort: readSort(input.sort),
    limit: readPositiveInt(input.limit, DEFAULT_LIMIT, MAX_LIMIT),
    page: readPositiveInt(input.page, 1, MAX_PAGE),
  };
}
