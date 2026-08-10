import type { Express, Request } from "express";
import * as jose from "jose";
import { ENV } from "./_core/env";
import * as db from "./db";
import * as energy from "./energyComparisons";

function header(req: Request, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function getCommercial(req: Request) {
  const token = header(req, "x-commercial-token");
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret || "comercial-secret-key");
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.type !== "commercial" || typeof payload.commercialId !== "number") return null;
    return await db.getCommercialById(payload.commercialId);
  } catch { return null; }
}

async function getAdmin(req: Request) {
  const token = header(req, "x-admin-token");
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret || "admin-secret-key");
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.type !== "admin" || typeof payload.adminId !== "number") return null;
    return await db.getAdminById(payload.adminId);
  } catch { return null; }
}

function numberOrUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function registerEnergyRoutes(app: Express) {
  app.get("/api/energy/catalog", async (req, res) => {
    try {
      const commercial = await getCommercial(req);
      const admin = await getAdmin(req);
      if (!commercial && !admin) return res.status(401).json({ error: "No autorizado" });
      res.json(await energy.getActiveCatalog());
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Error interno" }); }
  });

  app.get("/api/energy/comparisons", async (req, res) => {
    try {
      const commercial = await getCommercial(req);
      if (!commercial) return res.status(401).json({ error: "No autorizado" });
      res.json(await energy.getCommercialComparisons(commercial.id));
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Error interno" }); }
  });

  app.get("/api/energy/comparisons/:id", async (req, res) => {
    try {
      const commercial = await getCommercial(req);
      if (!commercial) return res.status(401).json({ error: "No autorizado" });
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "ID no válido" });
      res.json(await energy.getComparisonForCommercial(commercial.id, id));
    } catch (error) { res.status(404).json({ error: error instanceof Error ? error.message : "Comparación no encontrada" }); }
  });

  app.post("/api/energy/comparisons", async (req, res) => {
    try {
      const commercial = await getCommercial(req);
      if (!commercial) return res.status(401).json({ error: "No autorizado" });
      const b = req.body ?? {};
      const invoice = b.invoice ?? {};
      if (!b.clientName || !Array.isArray(b.rateIds) || !b.rateIds.length) return res.status(400).json({ error: "Cliente y tarifas son obligatorios" });
      const billingDays = Number(invoice.billingDays);
      const currentInvoiceTotal = Number(invoice.currentInvoiceTotal);
      if (!Number.isFinite(billingDays) || billingDays < 1 || !Number.isFinite(currentInvoiceTotal) || currentInvoiceTotal < 0) return res.status(400).json({ error: "Datos de factura no válidos" });
      const clean = {
        ...b,
        rateIds: b.rateIds.map(Number).filter(Number.isFinite),
        invoice: {
          billingDays,
          currentInvoiceTotal,
          powerP1Kw: numberOrUndefined(invoice.powerP1Kw), powerP2Kw: numberOrUndefined(invoice.powerP2Kw), powerP3Kw: numberOrUndefined(invoice.powerP3Kw),
          kwhP1: numberOrUndefined(invoice.kwhP1), kwhP2: numberOrUndefined(invoice.kwhP2), kwhP3: numberOrUndefined(invoice.kwhP3),
          exportedKwh: numberOrUndefined(invoice.exportedKwh), equipmentRental: numberOrUndefined(invoice.equipmentRental),
          otherCosts: numberOrUndefined(invoice.otherCosts), socialBonus: numberOrUndefined(invoice.socialBonus), services: numberOrUndefined(invoice.services),
          vatRate: numberOrUndefined(invoice.vatRate),
        },
      };
      res.status(201).json(await energy.calculateAndSaveComparison(commercial.id, clean));
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo calcular" }); }
  });

  app.get("/api/energy/admin/catalog", async (req, res) => {
    try {
      const admin = await getAdmin(req);
      if (!admin) return res.status(401).json({ error: "No autorizado" });
      res.json(await energy.getAdminCatalog());
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Error interno" }); }
  });

  app.post("/api/energy/admin/companies", async (req, res) => {
    try {
      const admin = await getAdmin(req);
      if (!admin) return res.status(401).json({ error: "No autorizado" });
      res.status(201).json(await energy.createCompany(req.body ?? {}));
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo crear la compañía" }); }
  });

  app.put("/api/energy/admin/companies/:id", async (req, res) => {
    try {
      const admin = await getAdmin(req);
      if (!admin) return res.status(401).json({ error: "No autorizado" });
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "ID no válido" });
      res.json(await energy.updateCompany(id, req.body ?? {}));
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo guardar" }); }
  });

  app.post("/api/energy/admin/rates", async (req, res) => {
    try {
      const admin = await getAdmin(req);
      if (!admin) return res.status(401).json({ error: "No autorizado" });
      res.status(201).json(await energy.createRate(req.body ?? {}));
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo crear la tarifa" }); }
  });

  app.put("/api/energy/admin/rates/:id", async (req, res) => {
    try {
      const admin = await getAdmin(req);
      if (!admin) return res.status(401).json({ error: "No autorizado" });
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "ID no válido" });
      res.json(await energy.updateRate(id, req.body ?? {}));
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo guardar" }); }
  });

  app.get("/api/energy/admin/comparisons", async (req, res) => {
    try {
      const admin = await getAdmin(req);
      if (!admin) return res.status(401).json({ error: "No autorizado" });
      res.json(await energy.getAllComparisons());
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Error interno" }); }
  });
}
