import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { ENV } from "./_core/env";
import https from "https";

// Enviar notificación push via Expo Push API
async function sendExpoPushNotification(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  const messages = tokens
    .filter(t => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["))
    .map(to => ({ to, title, body, data: data ?? {}, sound: "default" }));
  if (messages.length === 0) return;
  const payload = JSON.stringify(messages);
  return new Promise<void>((resolve) => {
    const req = https.request({
      hostname: "exp.host",
      path: "/--/api/v2/push/send",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve());
    });
    req.on("error", () => resolve()); // Fail silently
    req.write(payload);
    req.end();
  });
}

async function generateAdminToken(adminId: number): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret || "admin-secret-key");
  return await new jose.SignJWT({ adminId, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

async function verifyAdminToken(token: string): Promise<{ adminId: number } | null> {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret || "admin-secret-key");
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.type === "admin" && typeof payload.adminId === "number") {
      return { adminId: payload.adminId };
    }
    return null;
  } catch {
    return null;
  }
}

async function getAdminFromCtx(ctx: { req: { headers: Record<string, string | string[] | undefined> } }) {
  const authHeader = ctx.req.headers["x-admin-token"];
  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  if (!payload) return null;
  return db.getAdminById(payload.adminId);
}

function generateQrCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function generateCommercialToken(commercialId: number): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret || "comercial-secret-key");
  return await new jose.SignJWT({ commercialId, type: "commercial" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

async function verifyCommercialToken(token: string): Promise<{ commercialId: number } | null> {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret || "comercial-secret-key");
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.type === "commercial" && typeof payload.commercialId === "number") {
      return { commercialId: payload.commercialId };
    }
    return null;
  } catch {
    return null;
  }
}

async function getCommercialFromCtx(ctx: { req: { headers: Record<string, string | string[] | undefined> } }) {
  const authHeader = ctx.req.headers["x-commercial-token"];
  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!token) return null;
  const payload = await verifyCommercialToken(token);
  if (!payload) return null;
  return db.getCommercialById(payload.commercialId);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  commercial: router({
    checkEmail: publicProcedure
      .input(z.object({ email: z.string() }))
      .query(async ({ input }) => {
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
          return { valid: false, reason: "El formato del email no es válido" };
        }
        // Comprobar si ya existe en la base de datos
        const existing = await db.getCommercialByEmail(input.email.toLowerCase());
        if (existing) {
          return { valid: false, reason: "Este email ya está registrado en la app" };
        }
        return { valid: true, reason: null };
      }),

    register: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        email: z.string().email(),
        password: z.string().min(9).max(128)
          .refine(p => /[A-Z]/.test(p), { message: "La contraseña debe tener al menos una mayúscula" })
          .refine(p => /[0-9]/.test(p), { message: "La contraseña debe tener al menos un número" })
          .refine(p => /[^A-Za-z0-9]/.test(p), { message: "La contraseña debe tener al menos un carácter especial" }),
        fullName: z.string().min(2).max(255),
      }))
      .mutation(async ({ input }) => {
        const existingByUsername = await db.getCommercialByUsername(input.username);
        if (existingByUsername) throw new Error("El nombre de usuario ya está en uso");
        const existingByEmail = await db.getCommercialByEmail(input.email);
        if (existingByEmail) throw new Error("El email ya está registrado");
        const passwordHash = await bcrypt.hash(input.password, 10);
        const personalQrCode = generateQrCode();
        // La cuenta se crea en estado 'pending' hasta que el admin la apruebe
        const id = await db.createCommercial({
          username: input.username,
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          personalQrCode,
          accountStatus: "pending",
        });
        const commercial = await db.getCommercialById(id);
        if (!commercial) throw new Error("Error al crear el comercial");
        // Notificar a todos los admins que hay una solicitud pendiente
        try {
          // No hay push tokens para admins, pero el dashboard mostrará el badge
          console.log(`[Register] Nueva solicitud de registro: ${input.username}`);
        } catch {}
        return { pending: true, message: "Tu solicitud ha sido enviada. El administrador revisará tu cuenta." };
      }),

    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const commercial = await db.getCommercialByUsername(input.username);

        // Si no es comercial, comprobar si es admin
        if (!commercial) {
          const admin = await db.getAdminByUsername(input.username);
          if (!admin) throw new Error("Usuario o contraseña incorrectos");
          const validAdmin = await bcrypt.compare(input.password, admin.passwordHash);
          if (!validAdmin) throw new Error("Usuario o contraseña incorrectos");
          const adminToken = await generateAdminToken(admin.id);
          return {
            token: adminToken,
            commercial: null,
            isAdmin: true,
            admin: { id: admin.id, username: admin.username, email: admin.email, fullName: admin.fullName },
          };
        }

        const valid = await bcrypt.compare(input.password, commercial.passwordHash);
        if (!valid) throw new Error("Usuario o contraseña incorrectos");
        // Verificar estado de la cuenta
        if (commercial.accountStatus === "pending") {
          throw new Error("Tu cuenta está pendiente de aprobación por el administrador. Te notificaremos cuando esté activa.");
        }
        if (commercial.accountStatus === "blocked") {
          throw new Error("Tu cuenta ha sido bloqueada. Contacta con el administrador.");
        }
        const token = await generateCommercialToken(commercial.id);
        return {
          token,
          isAdmin: false,
          commercial: {
            id: commercial.id,
            username: commercial.username,
            email: commercial.email,
            fullName: commercial.fullName,
            personalQrCode: commercial.personalQrCode,
            avatarUrl: commercial.avatarUrl ?? null,
            accountStatus: commercial.accountStatus,
          },
        };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const commercial = await getCommercialFromCtx(ctx);
      if (!commercial) return null;
      return {
        id: commercial.id,
        username: commercial.username,
        email: commercial.email,
        fullName: commercial.fullName,
        personalQrCode: commercial.personalQrCode,
        avatarUrl: commercial.avatarUrl ?? null,
        accountStatus: commercial.accountStatus,
      };
    }),

    updateProfile: publicProcedure
      .input(z.object({
        fullName: z.string().min(2).max(255).optional(),
        email: z.string().email().optional(),
        avatarUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        await db.updateCommercialProfile(commercial.id, input);
        return { success: true };
      }),

    changePassword: publicProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(9).max(128)
          .refine(p => /[A-Z]/.test(p), { message: "La contraseña debe tener al menos una mayúscula" })
          .refine(p => /[0-9]/.test(p), { message: "La contraseña debe tener al menos un número" })
          .refine(p => /[^A-Za-z0-9]/.test(p), { message: "La contraseña debe tener al menos un carácter especial" }),
      }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const valid = await bcrypt.compare(input.currentPassword, commercial.passwordHash);
        if (!valid) throw new Error("La contraseña actual es incorrecta");
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateCommercialPassword(commercial.id, passwordHash);
        return { success: true };
      }),

    uploadAvatar: publicProcedure
      .input(z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const fileBuffer = Buffer.from(input.base64Data, "base64");
        const key = `avatars/commercial-${commercial.id}-${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, fileBuffer, input.mimeType);
        await db.updateCommercialProfile(commercial.id, { avatarUrl: url });
        return { avatarUrl: url };
      }),

    exportLeads: publicProcedure
      .input(z.object({ businessId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const list = input.businessId
          ? await db.getLeadsByBusiness(input.businessId)
          : await db.getLeadsByCommercial(commercial.id);
        // Verificar que los leads pertenecen a este comercial
        const filtered = list.filter(l => l.commercialId === commercial.id);
        return filtered.map(l => ({
          id: l.id,
          nombre: l.fullName,
          telefono: l.phone,
          email: l.email,
          estado: l.status,
          notas: l.notes ?? "",
          privacidad: l.privacyAccepted ? "Sí" : "No",
          marketing: l.marketingAccepted ? "Sí" : "No",
          fecha: l.createdAt.toISOString().split("T")[0],
        }));
      }),

    deleteAccount: publicProcedure
      .mutation(async ({ ctx }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        await db.deleteCommercial(commercial.id);
        return { success: true };
      }),

    // Recuperación de contraseña: paso 1 - el usuario solicita el reset
    // El admin recibirá la solicitud y generará el código desde su panel
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const commercial = await db.getCommercialByEmail(input.email);
        if (!commercial) throw new Error("No existe ninguna cuenta con ese email");
        if (commercial.accountStatus !== "active") {
          throw new Error("Tu cuenta no está activa. Contacta con el administrador.");
        }
        // Crear solicitud pendiente - el admin generará el código desde su panel
        await db.createPendingPasswordReset(commercial.id);
        return {
          success: true,
          commercialId: commercial.id,
          message: "Solicitud enviada. El administrador te enviará un código de 6 dígitos.",
        };
      }),

    // Reset de contraseña usando email + código (para cuando el usuario llega directamente con el código)
    resetPasswordByEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(9)
          .refine(p => /[A-Z]/.test(p), { message: "La contraseña debe tener al menos una mayúscula" })
          .refine(p => /[0-9]/.test(p), { message: "La contraseña debe tener al menos un número" })
          .refine(p => /[^A-Za-z0-9]/.test(p), { message: "La contraseña debe tener al menos un carácter especial" }),
      }))
      .mutation(async ({ input }) => {
        const commercial = await db.getCommercialByEmail(input.email);
        if (!commercial) throw new Error("No existe ninguna cuenta con ese email");
        const token = await db.getValidPasswordResetToken(commercial.id, input.code);
        if (!token) throw new Error("Código incorrecto o expirado. Solicita uno nuevo al administrador.");
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateCommercialPassword(commercial.id, newHash);
        await db.markPasswordResetTokenUsed(token.id);
        return { success: true, message: "Contraseña cambiada correctamente. Ya puedes iniciar sesión." };
      }),

    // Recuperación de contraseña: paso 2 - verificar código y cambiar contraseña
    resetPassword: publicProcedure
      .input(z.object({
        commercialId: z.number(),
        code: z.string().length(6),
        newPassword: z.string().min(9)
          .refine(p => /[A-Z]/.test(p), { message: "La contraseña debe tener al menos una mayúscula" })
          .refine(p => /[0-9]/.test(p), { message: "La contraseña debe tener al menos un número" })
          .refine(p => /[^A-Za-z0-9]/.test(p), { message: "La contraseña debe tener al menos un carácter especial" }),
      }))
      .mutation(async ({ input }) => {
        const token = await db.getValidPasswordResetToken(input.commercialId, input.code);
        if (!token) throw new Error("Código incorrecto o expirado. Solicita uno nuevo.");
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateCommercialPassword(input.commercialId, newHash);
        await db.markPasswordResetTokenUsed(token.id);
        return { success: true, message: "Contraseña cambiada correctamente. Ya puedes iniciar sesión." };
      }),
  }),

  businesses: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const commercial = await getCommercialFromCtx(ctx);
      if (!commercial) throw new Error("No autenticado");
      const list = await db.getBusinessesByCommercial(commercial.id);
      const withCounts = await Promise.all(list.map(async (b) => ({
        ...b,
        leadCount: await db.getLeadCountByBusiness(b.id),
      })));
      return withCounts;
    }),

    create: publicProcedure
      .input(z.object({ name: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const qrCode = generateQrCode();
        const id = await db.createBusiness({
          commercialId: commercial.id,
          name: input.name,
          qrCode,
        });
        return db.getBusinessById(id);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        await db.deleteBusiness(input.id, commercial.id);
        return { success: true };
      }),

    getByQr: publicProcedure
      .input(z.object({ qrCode: z.string() }))
      .query(async ({ input }) => {
        const business = await db.getBusinessByQrCode(input.qrCode);
        if (!business) return null;
        return { id: business.id, name: business.name, qrCode: business.qrCode };
      }),
  }),

  leads: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const commercial = await getCommercialFromCtx(ctx);
      if (!commercial) throw new Error("No autenticado");
      const list = await db.getLeadsByCommercial(commercial.id);
      const withFiles = await Promise.all(list.map(async (lead) => ({
        ...lead,
        files: await db.getFilesByLead(lead.id),
      })));
      return withFiles;
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const lead = await db.getLeadById(input.id);
        if (!lead || lead.commercialId !== commercial.id) throw new Error("Lead no encontrado");
        const files = await db.getFilesByLead(lead.id);
        let businessName: string | null = null;
        if (lead.businessId) {
          const biz = await db.getBusinessById(lead.businessId);
          businessName = biz?.name ?? null;
        }
        return { ...lead, files, businessName };
      }),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "in_progress", "closed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const lead = await db.getLeadById(input.id);
        if (!lead || lead.commercialId !== commercial.id) throw new Error("Lead no encontrado");
        await db.updateLeadStatus(input.id, input.status);
        return { success: true };
      }),

    updateNotes: publicProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        const lead = await db.getLeadById(input.id);
        if (!lead || lead.commercialId !== commercial.id) throw new Error("Lead no encontrado");
        await db.updateLeadNotes(input.id, input.notes);
        return { success: true };
      }),

    stats: publicProcedure.query(async ({ ctx }) => {
      const commercial = await getCommercialFromCtx(ctx);
      if (!commercial) throw new Error("No autenticado");
      const totalLeads = await db.getLeadCountByCommercial(commercial.id);
      const allLeads = await db.getLeadsByCommercial(commercial.id);
      const newLeads = allLeads.filter(l => l.status === "new").length;
      const businesses = await db.getBusinessesByCommercial(commercial.id);
      return {
        totalLeads,
        newLeads,
        totalBusinesses: businesses.length,
      };
    }),
  }),

  pushNotifications: router({
    registerToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        await db.upsertPushToken(commercial.id, input.token);
        return { success: true };
      }),

    removeToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const commercial = await getCommercialFromCtx(ctx);
        if (!commercial) throw new Error("No autenticado");
        await db.deletePushToken(commercial.id, input.token);
        return { success: true };
      }),
  }),

  admin: router({
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const admin = await db.getAdminByUsername(input.username);
        if (!admin) throw new Error("Usuario o contraseña incorrectos");
        const valid = await bcrypt.compare(input.password, admin.passwordHash);
        if (!valid) throw new Error("Usuario o contraseña incorrectos");
        const token = await generateAdminToken(admin.id);
        return { token, admin: { id: admin.id, username: admin.username, email: admin.email, fullName: admin.fullName } };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) return null;
      return { id: admin.id, username: admin.username, email: admin.email, fullName: admin.fullName };
    }),

    dashboard: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) throw new Error("No autorizado");
      const allCommercials = await db.getAllCommercials();
      const allLeads = await db.getAllLeads();
      const allBusinesses = await db.getAllBusinesses();
      // Estadísticas por comercial
      const commercialsWithStats = await Promise.all(allCommercials.map(async (c) => {
        const cLeads = allLeads.filter(l => l.commercialId === c.id);
        const cBusinesses = allBusinesses.filter(b => b.commercialId === c.id);
        return {
          id: c.id,
          username: c.username,
          fullName: c.fullName,
          email: c.email,
          createdAt: c.createdAt,
          totalLeads: cLeads.length,
          newLeads: cLeads.filter(l => l.status === "new").length,
          contactedLeads: cLeads.filter(l => l.status === "contacted").length,
          inProgressLeads: cLeads.filter(l => l.status === "in_progress").length,
          closedLeads: cLeads.filter(l => l.status === "closed").length,
          totalBusinesses: cBusinesses.length,
        };
      }));
      return {
        totalCommercials: allCommercials.length,
        totalLeads: allLeads.length,
        totalBusinesses: allBusinesses.length,
        newLeads: allLeads.filter(l => l.status === "new").length,
        commercials: commercialsWithStats,
      };
    }),

    allLeads: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) throw new Error("No autorizado");
      const allLeads = await db.getAllLeads();
      const allCommercials = await db.getAllCommercials();
      const allBusinesses = await db.getAllBusinesses();
      return allLeads.map(lead => {
        const commercial = allCommercials.find(c => c.id === lead.commercialId);
        const business = lead.businessId ? allBusinesses.find(b => b.id === lead.businessId) : null;
        return {
          ...lead,
          commercialName: commercial?.fullName ?? "Desconocido",
          businessName: business?.name ?? null,
        };
      });
    }),

    // --- CRUD completo de leads ---
    updateLead: publicProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().min(2).max(255).optional(),
        phone: z.string().min(6).max(32).optional(),
        email: z.string().email().optional(),
        status: z.enum(["new", "contacted", "in_progress", "closed"]).optional(),
        notes: z.string().max(5000).optional(),
        marketingAccepted: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const { id, ...data } = input;
        await db.updateLeadFull(id, data);
        return { success: true };
      }),

    deleteLead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.deleteLead(input.id);
        return { success: true };
      }),

    createLead: publicProcedure
      .input(z.object({
        commercialId: z.number(),
        businessId: z.number().optional(),
        fullName: z.string().min(2).max(255),
        phone: z.string().min(6).max(32),
        email: z.string().email(),
        notes: z.string().max(5000).optional(),
        status: z.enum(["new", "contacted", "in_progress", "closed"]).default("new"),
      }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const id = await db.createLeadForCommercial({
          commercialId: input.commercialId,
          businessId: input.businessId ?? null,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          notes: input.notes ?? null,
          status: input.status,
          privacyAccepted: true,
          marketingAccepted: false,
        });
        return { id, success: true };
      }),

    // --- CRUD completo de negocios ---
    updateBusiness: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.updateBusiness(input.id, input.name);
        return { success: true };
      }),

    deleteBusiness: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.deleteBusinessAdmin(input.id);
        return { success: true };
      }),

    // --- CRUD completo de comerciales ---
    updateCommercial: publicProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().min(2).max(255).optional(),
        email: z.string().email().optional(),
        username: z.string().min(3).max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const { id, ...data } = input;
        await db.updateCommercial(id, data);
        return { success: true };
      }),

    deleteCommercial: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.deleteCommercial(input.id);
        return { success: true };
      }),

    getCommercialDetail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const commercial = await db.getCommercialById(input.id);
        if (!commercial) throw new Error("Comercial no encontrado");
        const cLeads = await db.getLeadsByCommercial(input.id);
        const cBusinesses = await db.getBusinessesByCommercial(input.id);
        const leadsWithFiles = await Promise.all(cLeads.map(async (lead) => ({
          ...lead,
          files: await db.getFilesByLead(lead.id),
          businessName: lead.businessId ? (await db.getBusinessById(lead.businessId))?.name ?? null : null,
        })));
        return {
          commercial: { id: commercial.id, username: commercial.username, fullName: commercial.fullName, email: commercial.email, createdAt: commercial.createdAt, personalQrCode: commercial.personalQrCode },
          leads: leadsWithFiles,
          businesses: cBusinesses,
        };
      }),

    // Gestión de usuarios: pendientes, todos, aprobar, denegar, bloquear, desbloquear, crear
    getPendingUsers: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) throw new Error("No autorizado");
      const pending = await db.getCommercialsByStatus("pending");
      return pending.map(c => ({ id: c.id, username: c.username, fullName: c.fullName, email: c.email, createdAt: c.createdAt }));
    }),

    getAllUsers: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) throw new Error("No autorizado");
      const all = await db.getAllCommercials();
      return all.map(c => ({ id: c.id, username: c.username, fullName: c.fullName, email: c.email, accountStatus: c.accountStatus, createdAt: c.createdAt }));
    }),

    approveUser: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.setCommercialStatus(input.id, "active");
        return { success: true };
      }),

    denyUser: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.deleteCommercial(input.id);
        return { success: true };
      }),

    blockUser: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.setCommercialStatus(input.id, "blocked");
        return { success: true };
      }),

    unblockUser: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        await db.setCommercialStatus(input.id, "active");
        return { success: true };
      }),

    createCommercial: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(50),
        fullName: z.string().min(2).max(255),
        email: z.string().email(),
        password: z.string().min(9),
      }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const existing = await db.getCommercialByUsername(input.username);
        if (existing) throw new Error("El nombre de usuario ya está en uso");
        const existingEmail = await db.getCommercialByEmail(input.email);
        if (existingEmail) throw new Error("El email ya está en uso");
        const passwordHash = await bcrypt.hash(input.password, 12);
        const qrCode = crypto.randomUUID();
        const insertId = await db.createCommercialByAdmin({ username: input.username, fullName: input.fullName, email: input.email, passwordHash, personalQrCode: qrCode, accountStatus: "active" });
        return { success: true, id: insertId };
      }),

    changePassword: publicProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(9),
      }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const valid = await bcrypt.compare(input.currentPassword, admin.passwordHash ?? "");
        if (!valid) throw new Error("La contraseña actual es incorrecta");
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateAdminPassword(admin.id, newHash);
        return { success: true };
      }),

    // Solicitudes de reset de contraseña pendientes
    getPendingPasswordResets: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) throw new Error("No autorizado");
      const pendingTokens = await db.getPendingPasswordResets();
      // Enriquecer con datos del comercial
      const result = await Promise.all(pendingTokens.map(async (token) => {
        const commercial = await db.getCommercialById(token.commercialId);
        return {
          tokenId: token.id,
          commercialId: token.commercialId,
          fullName: commercial?.fullName ?? "Desconocido",
          email: commercial?.email ?? "",
          username: commercial?.username ?? "",
          requestedAt: token.createdAt,
        };
      }));
      return result;
    }),

    // El admin genera el código de 6 dígitos para una solicitud pendiente
    generatePasswordResetCode: publicProcedure
      .input(z.object({ tokenId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const admin = await getAdminFromCtx(ctx);
        if (!admin) throw new Error("No autorizado");
        const code = await db.generatePasswordResetCode(input.tokenId);
        return { success: true, code };
      }),

    exportAllLeads: publicProcedure.query(async ({ ctx }) => {
      const admin = await getAdminFromCtx(ctx);
      if (!admin) throw new Error("No autorizado");
      const allLeads = await db.getAllLeads();
      const allCommercials = await db.getAllCommercials();
      const allBusinesses = await db.getAllBusinesses();
      return allLeads.map(lead => {
        const commercial = allCommercials.find(c => c.id === lead.commercialId);
        const business = lead.businessId ? allBusinesses.find(b => b.id === lead.businessId) : null;
        return {
          id: lead.id,
          nombre: lead.fullName,
          telefono: lead.phone,
          email: lead.email,
          estado: lead.status,
          comercial: commercial?.fullName ?? "Desconocido",
          negocio: business?.name ?? null,
          notas: lead.notes,
          privacidad: lead.privacyAccepted ? "Sí" : "No",
          marketing: lead.marketingAccepted ? "Sí" : "No",
          fecha: new Date(lead.createdAt).toLocaleDateString("es-ES"),
        };
      });
    }),
  }),

  publicForm: router({
    getCommercialByQr: publicProcedure
      .input(z.object({ qrCode: z.string() }))
      .query(async ({ input }) => {
        const commercial = await db.getCommercialByQrCode(input.qrCode);
        if (!commercial) return null;
        return { id: commercial.id, fullName: commercial.fullName };
      }),

    getBusinessByQr: publicProcedure
      .input(z.object({ qrCode: z.string() }))
      .query(async ({ input }) => {
        const business = await db.getBusinessByQrCode(input.qrCode);
        if (!business) return null;
        const commercial = await db.getCommercialById(business.commercialId);
        return {
          id: business.id,
          name: business.name,
          commercialId: business.commercialId,
          commercialName: commercial?.fullName ?? "",
        };
      }),

    submit: publicProcedure
      .input(z.object({
        qrCode: z.string(),
        type: z.enum(["personal", "business"]),
        fullName: z.string().min(2).max(255),
        phone: z.string().min(6).max(32),
        email: z.string().email(),
        privacyAccepted: z.boolean(),
        marketingAccepted: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        if (!input.privacyAccepted) throw new Error("Debes aceptar la política de privacidad");
        let commercialId: number;
        let businessId: number | null = null;
        if (input.type === "personal") {
          const commercial = await db.getCommercialByQrCode(input.qrCode);
          if (!commercial) throw new Error("Código QR inválido");
          commercialId = commercial.id;
        } else {
          const business = await db.getBusinessByQrCode(input.qrCode);
          if (!business) throw new Error("Código QR de negocio inválido");
          commercialId = business.commercialId;
          businessId = business.id;
        }
        // Deduplicación: buscar leads existentes con mismo teléfono Y email para este comercial
        const phoneNorm = input.phone.trim().replace(/\s+/g, "");
        const emailNorm = input.email.trim().toLowerCase();
        const existingLeads = await db.getAllLeadsByPhoneAndEmail(phoneNorm, emailNorm, commercialId);
        console.log(`[Dedup-tRPC] Encontrados ${existingLeads.length} leads existentes para tel=${phoneNorm}, email=${emailNorm}`);

        let leadId: number;

        if (existingLeads.length > 0) {
          // Quedarnos con el primer lead y borrar los extras
          const keepLead = existingLeads[0];
          for (let i = 1; i < existingLeads.length; i++) {
            console.log(`[Dedup-tRPC] Borrando lead duplicado extra id=${existingLeads[i].id}`);
            await db.deleteLead(existingLeads[i].id);
          }
          // Actualizar el lead existente con los nuevos datos
          console.log(`[Dedup-tRPC] Actualizando lead existente id=${keepLead.id}`);
          await db.updateLeadData(keepLead.id, {
            fullName: input.fullName.trim(),
            phone: phoneNorm,
            email: emailNorm,
            privacyAccepted: input.privacyAccepted,
            marketingAccepted: input.marketingAccepted,
            businessId: businessId ?? keepLead.businessId,
            status: "new",
            notes: keepLead.notes
              ? `${keepLead.notes}\n[Actualizado: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}]`
              : `[Actualizado: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}]`,
          });
          leadId = keepLead.id;
        } else {
          // No hay duplicados, crear lead nuevo
          console.log(`[Dedup-tRPC] No hay duplicados, creando lead nuevo`);
          leadId = await db.createLead({
            commercialId,
            businessId,
            fullName: input.fullName.trim(),
            phone: phoneNorm,
            email: emailNorm,
            privacyAccepted: input.privacyAccepted,
            marketingAccepted: input.marketingAccepted,
            status: "new",
          });
        }
        console.log(`[Dedup-tRPC] Lead final id=${leadId}`);
        // Enviar notificación push al comercial
        try {
          const pushTokensList = await db.getPushTokensByCommercial(commercialId);
          if (pushTokensList.length > 0) {
            const tokens = pushTokensList.map(t => t.token);
            const businessInfo = businessId ? await db.getBusinessById(businessId) : null;
            const source = businessInfo ? `vía ${businessInfo.name}` : "formulario personal";
            await sendExpoPushNotification(
              tokens,
              "🎉 Nuevo lead captado",
              `${input.fullName} ha rellenado tu formulario ${source}`,
              { leadId, commercialId }
            );
          }
        } catch { /* Fail silently */ }
        return { leadId, commercialId, success: true };
      }),

    uploadFile: publicProcedure
      .input(z.object({
        leadId: z.number(),
        commercialId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        fileBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const lead = await db.getLeadById(input.leadId);
        if (!lead || lead.commercialId !== input.commercialId) throw new Error("Lead no válido");
        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const suffix = crypto.randomBytes(6).toString("hex");
        const ext = input.fileName.split(".").pop() ?? "bin";
        const storageKey = `facturas/comercial-${input.commercialId}/lead-${input.leadId}/${suffix}.${ext}`;
        const { url } = await storagePut(storageKey, fileBuffer, input.mimeType);
        await db.createLeadFile({
          leadId: input.leadId,
          commercialId: input.commercialId,
          originalName: input.fileName,
          storageKey,
          storageUrl: url,
          mimeType: input.mimeType,
          fileSize: fileBuffer.length,
        });
        return { success: true, url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
