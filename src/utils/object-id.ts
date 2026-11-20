import { ObjectId } from "mongodb";
import { HttpError } from "./httpError.js";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

/**
 * Turns an id from a URL into an ObjectId. Anything that is not a valid id string is reported
 * as 404 (with the given message), the same as an id that matches nothing, so callers never
 * see a 500. It takes `unknown` because Express types route params loosely.
 */
export const parseObjectId = (id: unknown, notFoundMessage: string): ObjectId => {
  if (typeof id !== "string" || !OBJECT_ID_PATTERN.test(id)) throw new HttpError(404, notFoundMessage);
  return new ObjectId(id);
};
