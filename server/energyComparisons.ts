import { Pool } from "pg";

let energyPool: Pool | null = null;

function getPool() {
  if (!energyPool) {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) throw new Error("SUPABASE_DB_URL no está configurada");
    energyPool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return energyPool;
}

export type InvoiceInput = {
  billingDays: number;
  currentInvoiceTotal: number;
  powerP1Kw?: number;
  powerP2Kw?: number;
  powerP3Kw?: number;
  kwhP1?: number;
  kwhP2?: number;
  kwhP3?: number;
  exportedKwh?: number;
  equipmentRental?: number;
  otherCosts?: number;
  socialBonus?: number;
  services?: number;
  vatRate?: number;
};

function n(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculateModern(parameters: any, rules: any, invoice: InvoiceInput) {
  const days = Math.max(1, n(invoice.billingDays, 1));
  const powerPrices = parameters?.power_prices ?? {};
  const energyPrices = parameters?.energy_prices ?? {};
  const power = n(invoice.powerP1Kw) * days * n(powerPrices.p1)
    + n(invoice.powerP2Kw) * days * n(powerPrices.p2)
    + n(invoice.powerP3Kw) * days * n(powerPrices.p3);
  const energy = n(invoice.kwhP1) * n(energyPrices.p1)
    + n(invoice.kwhP2) * n(energyPrices.p2)
    + n(invoice.kwhP3) * n(energyPrices.p3)
    + (n(invoice.kwhP1) + n(invoice.kwhP2) + n(invoice.kwhP3)) * n(parameters?.adjustment_price);
  const fixedCharges = Array.isArray(parameters?.fixed_charges)
    ? parameters.fixed_charges.reduce((sum: number, item: any) => sum + n(item?.amount), 0) : 0;
  const electricityTaxRate = n(rules?.electricity_tax_rate, 0.0511269632);
  const electricityTax = Math.max(0, power + energy) * electricityTaxRate;
  const excessCredit = n(invoice.exportedKwh) * n(parameters?.excess_price);
  const rental = n(invoice.equipmentRental);
  const otherCosts = n(invoice.otherCosts) + n(invoice.socialBonus) + n(invoice.services);
  const taxable = Math.max(0, power + energy + electricityTax + fixedCharges + rental + otherCosts - excessCredit);
  const vatRate = invoice.vatRate === undefined ? n(rules?.default_vat_rate, 0.1) : n(invoice.vatRate);
  const vat = taxable * vatRate;
  return { power: round(power), energy: round(energy), fixedCharges: round(fixedCharges), electricityTax: round(electricityTax), excessCredit: round(excessCredit), equipmentRental: round(rental), otherCosts: round(otherCosts), vatRate: round(vatRate, 6), vat: round(vat), total: round(taxable + vat, 2) };
}

function calculateLegacy(parameters: any, rules: any, invoice: InvoiceInput) {
  const days = Math.max(1, n(invoice.billingDays, 1));
  const kw1 = n(invoice.powerP1Kw), kw2 = n(invoice.powerP2Kw), kw3 = n(invoice.powerP3Kw);
  let power = 0;
  if (rules?.power_mode === "daily_p1") power = kw1 * days * n(parameters?.power_p1) + kw2 * days * n(parameters?.power_p2) + kw3 * days * n(parameters?.power_p3);
  else if (rules?.power_mode === "monthly_prorated") power = kw1 * n(parameters?.power_monthly) * (days / 30);
  else if (rules?.power_mode === "three_monthly_terms_prorated") power = (kw1 * n(parameters?.power_term_1_monthly) + kw2 * n(parameters?.power_term_2_monthly) + kw3 * n(parameters?.power_term_3_monthly)) * (days / 30);
  else throw new Error("Esta tarifa necesita completar su término de potencia desde el panel administrador");
  const energyRaw = n(invoice.kwhP1) * n(parameters?.energy_p1) + n(invoice.kwhP2) * n(parameters?.energy_p2) + n(invoice.kwhP3) * n(parameters?.energy_p3);
  const energyDiscount = energyRaw * (n(rules?.discount_energy_pct) / 100);
  const energy = energyRaw - energyDiscount;
  const electricityTax = Math.max(0, power + energy) * n(parameters?.electricity_tax_rate, 0.04864);
  const rental = n(invoice.equipmentRental);
  const passThrough = rules?.pass_through_invoice_costs ? n(invoice.otherCosts) + n(invoice.socialBonus) + n(invoice.services) : 0;
  const taxable = Math.max(0, power + energy + electricityTax + rental + passThrough);
  const vatRate = invoice.vatRate === undefined ? n(parameters?.vat_rate, 0.18) : n(invoice.vatRate);
  const vat = taxable * vatRate;
  return { power: round(power), energy: round(energy), energyDiscount: round(energyDiscount), electricityTax: round(electricityTax), equipmentRental: round(rental), otherCosts: round(passThrough), vatRate: round(vatRate, 6), vat: round(vat), total: round(taxable + vat, 2) };
}

export function calculateRate(parameters: any, rules: any, invoice: InvoiceInput) {
  if (rules?.requires_admin_review || parameters?.requires_admin_review) throw new Error("Esta tarifa está pendiente de completar por el administrador");
  return rules?.engine === "legacy_residential" ? calculateLegacy(parameters, rules, invoice) : calculateModern(parameters, rules, invoice);
}

export async function getActiveCatalog() {
  const { rows } = await getPool().query(`SELECT c.id AS company_id, c.name AS company_name, c.slug, c.logo_url, r.id AS rate_id, r.name AS rate_name, r.description, r.parameters, r.calculation_rules FROM energy_companies c JOIN energy_rates r ON r.company_id=c.id WHERE c.active=TRUE AND r.active=TRUE ORDER BY c.sort_order,c.name,r.sort_order,r.name`);
  return rows;
}

export async function getAdminCatalog() {
  const { rows } = await getPool().query(`SELECT c.id AS company_id,c.name AS company_name,c.slug,c.logo_url,c.active AS company_active,r.id AS rate_id,r.name AS rate_name,r.description,r.active AS rate_active,r.parameters,r.calculation_rules,r.updated_at FROM energy_companies c LEFT JOIN energy_rates r ON r.company_id=c.id ORDER BY c.sort_order,c.name,r.sort_order,r.name`);
  return rows;
}

export async function updateRate(rateId: number, data: { name?: string; active?: boolean; description?: string | null; parameters?: any; calculationRules?: any }) {
  const current = await getPool().query("SELECT * FROM energy_rates WHERE id=$1", [rateId]);
  if (!current.rows[0]) throw new Error("Tarifa no encontrada");
  const row = current.rows[0];
  const { rows } = await getPool().query(`UPDATE energy_rates SET name=$2,active=$3,description=$4,parameters=$5::jsonb,calculation_rules=$6::jsonb,updated_at=NOW() WHERE id=$1 RETURNING *`, [rateId,data.name ?? row.name,data.active ?? row.active,data.description === undefined ? row.description : data.description,JSON.stringify(data.parameters ?? row.parameters),JSON.stringify(data.calculationRules ?? row.calculation_rules)]);
  return rows[0];
}

export async function updateCompany(companyId: number, data: { name?: string; active?: boolean; logoUrl?: string | null }) {
  const current = await getPool().query("SELECT * FROM energy_companies WHERE id=$1", [companyId]);
  if (!current.rows[0]) throw new Error("Compañía no encontrada");
  const row = current.rows[0];
  const { rows } = await getPool().query(`UPDATE energy_companies SET name=$2,active=$3,logo_url=$4,updated_at=NOW() WHERE id=$1 RETURNING *`, [companyId,data.name ?? row.name,data.active ?? row.active,data.logoUrl === undefined ? row.logo_url : data.logoUrl]);
  return rows[0];
}

export async function calculateAndSaveComparison(commercialId: number, input: any) {
  const rateIds: number[] = Array.from(new Set((input.rateIds ?? []).map((v: any) => Number(v)).filter(Number.isFinite))) as number[];
  if (!rateIds.length) throw new Error("Selecciona al menos una tarifa");
  const invoice: InvoiceInput = input.invoice;
  if (!invoice || !invoice.billingDays || invoice.currentInvoiceTotal === undefined) throw new Error("Datos de factura incompletos");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const comparison = await client.query(`INSERT INTO energy_comparisons (commercial_id,client_name,client_phone,client_email,cups,client_address,current_company,current_rate,billing_days,current_invoice_total,invoice_data,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,'completed') RETURNING *`, [commercialId,input.clientName,input.clientPhone ?? null,input.clientEmail || null,input.cups ?? null,input.clientAddress ?? null,input.currentCompany ?? null,input.currentRate ?? null,invoice.billingDays,invoice.currentInvoiceTotal,JSON.stringify(invoice)]);
    const results: any[] = [];
    for (const rateId of rateIds) {
      const rateQuery = await client.query(`SELECT r.*,c.name AS company_name FROM energy_rates r JOIN energy_companies c ON c.id=r.company_id WHERE r.id=$1 AND r.active=TRUE AND c.active=TRUE`, [rateId]);
      const rate = rateQuery.rows[0];
      if (!rate) continue;
      const breakdown = calculateRate(rate.parameters, rate.calculation_rules, invoice);
      const currentTotal = n(invoice.currentInvoiceTotal);
      const savings = currentTotal - breakdown.total;
      const savingsPct = currentTotal > 0 ? savings / currentTotal * 100 : 0;
      const annual = savings * 365 / Math.max(1,n(invoice.billingDays,1));
      const inserted = await client.query(`INSERT INTO energy_comparison_results (comparison_id,rate_id,company_name,rate_name,rate_snapshot,calculation_input,calculation_breakdown,calculated_total,savings_amount,savings_percentage,annual_savings_estimate) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11) RETURNING *`, [comparison.rows[0].id,rate.id,rate.company_name,rate.name,JSON.stringify({parameters:rate.parameters,calculationRules:rate.calculation_rules}),JSON.stringify(invoice),JSON.stringify(breakdown),breakdown.total,round(savings,2),round(savingsPct,4),round(annual,2)]);
      results.push(inserted.rows[0]);
    }
    if (!results.length) throw new Error("No se pudo calcular ninguna tarifa activa");
    await client.query("COMMIT");
    return { comparison: comparison.rows[0], results };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function getCommercialComparisons(commercialId: number) {
  const { rows } = await getPool().query(`SELECT c.*,COALESCE(json_agg(r ORDER BY r.calculated_total) FILTER (WHERE r.id IS NOT NULL),'[]') AS results FROM energy_comparisons c LEFT JOIN energy_comparison_results r ON r.comparison_id=c.id WHERE c.commercial_id=$1 GROUP BY c.id ORDER BY c.created_at DESC`, [commercialId]);
  return rows;
}

export async function getComparisonForCommercial(commercialId: number, comparisonId: number) {
  const { rows } = await getPool().query(`SELECT c.*,COALESCE(json_agg(r ORDER BY r.calculated_total) FILTER (WHERE r.id IS NOT NULL),'[]') AS results FROM energy_comparisons c LEFT JOIN energy_comparison_results r ON r.comparison_id=c.id WHERE c.id=$1 AND c.commercial_id=$2 GROUP BY c.id`, [comparisonId,commercialId]);
  if (!rows[0]) throw new Error("Comparación no encontrada");
  return rows[0];
}

export async function getAllComparisons() {
  const { rows } = await getPool().query(`SELECT c.*,cm."fullName" AS commercial_name,cm.username AS commercial_username,COALESCE(json_agg(r ORDER BY r.calculated_total) FILTER (WHERE r.id IS NOT NULL),'[]') AS results FROM energy_comparisons c JOIN commercials cm ON cm.id=c.commercial_id LEFT JOIN energy_comparison_results r ON r.comparison_id=c.id GROUP BY c.id,cm.id ORDER BY c.created_at DESC`);
  return rows;
}
