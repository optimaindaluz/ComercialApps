/**
 * Script para crear el usuario administrador inicial.
 * Ejecutar con: npx tsx scripts/create-admin.ts
 */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { admins } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

async function createAdmin() {
  const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL!, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool);
  const username = "admin";
  const email = "admin@optimaindaluz.com";
  const fullName = "Administrador Optima Indaluz";
  const password = "OptInd@2024!";
  const existing = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  if (existing.length > 0) {
    console.log("✅ El administrador ya existe:", existing[0].username);
    await pool.end();
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(admins).values({ username, email, passwordHash, fullName });
  console.log("✅ Administrador creado correctamente:");
  console.log("   Usuario:", username);
  console.log("   Email:", email);
  console.log("   Contraseña:", password);
  console.log("\n⚠️  Cambia la contraseña tras el primer acceso.");
  await pool.end();
  process.exit(0);
}
createAdmin().catch((err) => {
  console.error("❌ Error al crear el administrador:", err);
  process.exit(1);
});
