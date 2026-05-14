import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users, commercials, businesses, leads, leadFiles, admins, pushTokens, passwordResetTokens } from "../drizzle/schema";
import type {
  InsertCommercial,
  InsertBusiness,
  InsertLead,
  InsertLeadFile,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && process.env.SUPABASE_DB_URL) {
    try {
      _pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// --- Users (tabla original del sistema OAuth) ---
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    // PostgreSQL: upsert con ON CONFLICT
    await db.insert(users).values(values)
      .onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --- Comerciales ---
export async function createCommercial(data: InsertCommercial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(commercials).values(data).returning({ id: commercials.id });
  return result[0].id;
}

export async function getCommercialByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(commercials).where(eq(commercials.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCommercialByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(commercials).where(eq(commercials.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCommercialById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(commercials).where(eq(commercials.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCommercialByQrCode(qrCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(commercials).where(eq(commercials.personalQrCode, qrCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --- Negocios ---
export async function createBusiness(data: InsertBusiness) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(businesses).values(data).returning({ id: businesses.id });
  return result[0].id;
}

export async function getBusinessesByCommercial(commercialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(businesses)
    .where(eq(businesses.commercialId, commercialId))
    .orderBy(desc(businesses.createdAt));
}

export async function getBusinessById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBusinessByQrCode(qrCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businesses).where(eq(businesses.qrCode, qrCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteBusiness(id: number, commercialId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(businesses).where(and(eq(businesses.id, id), eq(businesses.commercialId, commercialId)));
}

// --- Leads ---
export async function getLeadByPhone(phone: string, commercialId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads)
    .where(and(eq(leads.phone, phone), eq(leads.commercialId, commercialId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLeadByEmail(email: string, commercialId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads)
    .where(and(eq(leads.email, email), eq(leads.commercialId, commercialId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Devuelve TODOS los leads que coincidan por teléfono Y email (ambos deben coincidir)
export async function getAllLeadsByPhoneAndEmail(phone: string, email: string, commercialId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(leads)
    .where(and(
      eq(leads.commercialId, commercialId),
      eq(leads.phone, phone),
      eq(leads.email, email)
    ));
  return result;
}
export async function updateLeadData(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id));
}
export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(data).returning({ id: leads.id });
  return result[0].id;
}

export async function getLeadsByCommercial(commercialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads)
    .where(eq(leads.commercialId, commercialId))
    .orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLeadStatus(id: number, status: "new" | "contacted" | "in_progress" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, id));
}

export async function getLeadCountByCommercial(commercialId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(leads).where(eq(leads.commercialId, commercialId));
  return result.length;
}

export async function getLeadCountByBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(leads).where(eq(leads.businessId, businessId));
  return result.length;
}

// --- Archivos de leads ---
export async function createLeadFile(data: InsertLeadFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leadFiles).values(data).returning({ id: leadFiles.id });
  return result[0].id;
}

export async function getFilesByLead(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId));
}

export async function getFilesByCommercial(commercialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadFiles)
    .where(eq(leadFiles.commercialId, commercialId))
    .orderBy(desc(leadFiles.createdAt));
}

// --- Notas de leads ---
export async function updateLeadNotes(id: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({ notes, updatedAt: new Date() }).where(eq(leads.id, id));
}

// --- Administradores ---
export async function createAdmin(data: { username: string; email: string; passwordHash: string; fullName: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(admins).values(data).returning({ id: admins.id });
  return result[0].id;
}

export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCommercials() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commercials).orderBy(desc(commercials.createdAt));
}

export async function getAllLeads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getAllBusinesses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(businesses).orderBy(desc(businesses.createdAt));
}

// --- Push Tokens ---
export async function upsertPushToken(commercialId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if token already exists for this commercial
  const existing = await db.select().from(pushTokens)
    .where(and(eq(pushTokens.commercialId, commercialId), eq(pushTokens.token, token)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(pushTokens).values({ commercialId, token });
  }
}

export async function getPushTokensByCommercial(commercialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(eq(pushTokens.commercialId, commercialId));
}

export async function deletePushToken(commercialId: number, token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushTokens).where(and(eq(pushTokens.commercialId, commercialId), eq(pushTokens.token, token)));
}

// --- Admin: control total sobre leads ---
export async function updateLeadFull(id: number, data: {
  fullName?: string;
  phone?: string;
  email?: string;
  status?: "new" | "contacted" | "in_progress" | "closed";
  notes?: string;
  marketingAccepted?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete files first
  await db.delete(leadFiles).where(eq(leadFiles.leadId, id));
  await db.delete(leads).where(eq(leads.id, id));
}

// --- Admin: control total sobre negocios ---
export async function updateBusiness(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(businesses).set({ name, updatedAt: new Date() }).where(eq(businesses.id, id));
}

export async function deleteBusinessAdmin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(businesses).where(eq(businesses.id, id));
}

// --- Admin: control total sobre comerciales ---
export async function updateCommercial(id: number, data: {
  fullName?: string;
  email?: string;
  username?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commercials).set({ ...data, updatedAt: new Date() }).where(eq(commercials.id, id));
}

export async function deleteCommercial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Cascade: delete files, leads, businesses, push tokens, password reset tokens
  const cLeads = await db.select().from(leads).where(eq(leads.commercialId, id));
  for (const lead of cLeads) {
    await db.delete(leadFiles).where(eq(leadFiles.leadId, lead.id));
  }
  await db.delete(leads).where(eq(leads.commercialId, id));
  await db.delete(businesses).where(eq(businesses.commercialId, id));
  await db.delete(pushTokens).where(eq(pushTokens.commercialId, id));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.commercialId, id));
  await db.delete(commercials).where(eq(commercials.id, id));
}

// Admin: crear lead manualmente para un comercial
export async function createLeadForCommercial(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(data).returning({ id: leads.id });
  return result[0].id;
}

// --- Comercial: autoadministración ---
export async function updateCommercialProfile(id: number, data: {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commercials).set({ ...data, updatedAt: new Date() }).where(eq(commercials.id, id));
}

export async function updateCommercialPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commercials).set({ passwordHash, updatedAt: new Date() }).where(eq(commercials.id, id));
}

// --- Admin: gestión de estado de comerciales ---
export async function setCommercialStatus(id: number, status: "pending" | "active" | "blocked") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commercials).set({ accountStatus: status, updatedAt: new Date() }).where(eq(commercials.id, id));
}

export async function getCommercialsByStatus(status: "pending" | "active" | "blocked") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commercials).where(eq(commercials.accountStatus, status)).orderBy(desc(commercials.createdAt));
}

// --- Admin: cambio de contraseña del admin ---
export async function updateAdminPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(admins).set({ passwordHash, updatedAt: new Date() }).where(eq(admins.id, id));
}

// --- Admin: crear comercial manualmente ---
export async function createCommercialByAdmin(data: {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  personalQrCode: string;
  accountStatus: "active";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(commercials).values(data).returning({ id: commercials.id });
  return result[0].id;
}

// --- Leads por negocio ---
export async function getLeadsByBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads)
    .where(eq(leads.businessId, businessId))
    .orderBy(desc(leads.createdAt));
}

// --- Recuperación de contraseña ---

// Crea una solicitud de reset pendiente (sin código aún - el admin lo generará después)
export async function createPendingPasswordReset(commercialId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidar solicitudes anteriores del mismo comercial
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.commercialId, commercialId));
  // Insertar solicitud pendiente con código vacío y expiración larga (24h)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ commercialId, code: "", expiresAt, used: false });
}

// Obtiene las solicitudes de reset pendientes (código vacío = esperando que el admin genere el código)
export async function getPendingPasswordResets() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const tokens = await db.select().from(passwordResetTokens);
  // Pendiente = código vacío, no usado, no expirado
  return tokens.filter(t => t.code === "" && !t.used && new Date(t.expiresAt) > now);
}

// El admin genera el código de 6 dígitos para una solicitud pendiente
export async function generatePasswordResetCode(tokenId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // El código expira en 30 minutos desde que el admin lo genera
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.update(passwordResetTokens)
    .set({ code, expiresAt })
    .where(eq(passwordResetTokens.id, tokenId));
  return code;
}

export async function createPasswordResetToken(commercialId: number, code: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidar tokens anteriores del mismo comercial
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.commercialId, commercialId));
  await db.insert(passwordResetTokens).values({ commercialId, code, expiresAt, used: false });
}

export async function getValidPasswordResetToken(commercialId: number, code: string) {
  const db = await getDb();
  if (!db) return null;
  const tokens = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.commercialId, commercialId));
  const now = new Date();
  return tokens.find(t => t.code === code && !t.used && new Date(t.expiresAt) > now) ?? null;
}

export async function markPasswordResetTokenUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id));
}
