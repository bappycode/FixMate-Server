import { SERVICE_SORTS, type ServiceSort } from "../constants/services.js";

export interface ServiceQuery {
  search?: string;
  category?: string;
  mode?: string;
  sort: ServiceSort;
  limit: number;
  page: number;
}

const MAX_SEARCH_LENGTH = 100;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_PAGE = 10_000;

const readText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text === "" ? undefined : text;
};

const readSort = (value: unknown): ServiceSort => {
  const sort = readText(value);
  return SERVICE_SORTS.find((option) => option === sort) ?? "newest";
};

const readPositiveInt = (value: unknown, fallback: number, max: number): number => {
  const number = Number(readText(value));
  return Number.isInteger(number) && number >= 1 ? Math.min(number, max) : fallback;
};

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
