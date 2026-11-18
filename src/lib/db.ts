import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

// One client per server instance. The driver connects lazily on the first query
// and reuses the connection, which is what we want on Vercel.
const client = new MongoClient(env.mongodbUri);

// The database name comes from the connection string.
export const db = client.db();
