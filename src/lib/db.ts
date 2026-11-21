import { attachDatabasePool } from "@vercel/functions";
import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

// Vercel freezes a function between requests. A database connection that stays open while the
// function is frozen is dead when it wakes up, and the next request then fails. So idle
// connections are closed after 30 seconds (long enough that someone clicking around the site
// keeps reusing one connection instead of reconnecting on every page), and attachDatabasePool
// keeps the function alive just long enough for that to happen before it is frozen.
// (It does nothing on your own computer.)
const IDLE_CONNECTION_MS = 30_000;

// One client per server instance. The driver connects lazily on the first query
// and reuses the connection, which is what we want on Vercel.
const client = new MongoClient(env.mongodbUri, { maxIdleTimeMS: IDLE_CONNECTION_MS });
attachDatabasePool(client);

// The database name comes from the connection string.
export const db = client.db();
