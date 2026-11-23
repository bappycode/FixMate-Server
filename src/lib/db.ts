import { attachDatabasePool } from "@vercel/functions";
import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

const IDLE_CONNECTION_MS = 30_000;

const client = new MongoClient(env.mongodbUri, { maxIdleTimeMS: IDLE_CONNECTION_MS });
attachDatabasePool(client);

export const db = client.db();
