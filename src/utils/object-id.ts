import { ObjectId } from "mongodb";
import { HttpError } from "./httpError.js";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export const parseObjectId = (id: unknown, notFoundMessage: string): ObjectId => {
  if (typeof id !== "string" || !OBJECT_ID_PATTERN.test(id)) throw new HttpError(404, notFoundMessage);
  return new ObjectId(id);
};
