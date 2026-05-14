import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { commercials } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL!, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool);
  const result = await db.update(commercials).set({ accountStatus: "active" }).where(eq(commercials.accountStatus, "pending"));
  console.log("✅ Comerciales existentes activados:", result);
  await pool.end();
  process.exit(0);
}
run().catch((err) => { console.error(err); process.exit(1); });
