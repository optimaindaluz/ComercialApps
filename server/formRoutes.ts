import type { Express, Request, Response } from "express";
import https from "https";
import multer from "multer";
import * as db from "./db";
import { storagePut } from "./storage";

// Multer: almacena archivos en memoria (buffer) para subirlos a S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }, // 20MB por archivo, máx 10 archivos
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith("image/"));
  },
});

// Enviar notificación push via Expo Push API
async function sendPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
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
    req.on("error", () => resolve());
    req.write(payload);
    req.end();
  });
}

/**
 * Registra las rutas Express que sirven el formulario web público.
 *
 * Rutas:
 *   GET  /form/:qrCode            → formulario personal del comercial
 *   GET  /form/negocio/:qrCode    → formulario de un negocio
 *   POST /form/submit             → procesa el envío + archivos adjuntos
 *   GET  /privacidad              → política de privacidad de Optima Indaluz S.L.
 */
export function registerFormRoutes(app: Express) {

  // ─── Política de privacidad ───────────────────────────────────────────────
  app.get("/privacidad", (_req: Request, res: Response) => {
    res.send(renderPrivacidad());
  });

  // ─── Formulario personal del comercial ───────────────────────────────────
  app.get("/form/:qrCode", async (req: Request, res: Response) => {
    const { qrCode } = req.params;
    if (qrCode === "negocio") return; // evitar conflicto con la ruta de negocio
    const commercial = await db.getCommercialByQrCode(qrCode).catch(() => null);
    if (!commercial) {
      return res.status(404).send(renderNotFound());
    }
    res.send(renderForm({
      title: "Comparativa de Luz",
      subtitle: `Comercial: ${commercial.fullName}`,
      qrCode,
      type: "personal",
    }));
  });

  // ─── Formulario de negocio ────────────────────────────────────────────────
  app.get("/form/negocio/:qrCode", async (req: Request, res: Response) => {
    const { qrCode } = req.params;
    const business = await db.getBusinessByQrCode(qrCode).catch(() => null);
    if (!business) {
      return res.status(404).send(renderNotFound());
    }
    const commercial = await db.getCommercialById(business.commercialId).catch(() => null);
    res.send(renderForm({
      title: `Comparativa de Luz – ${business.name}`,
      subtitle: commercial ? `Comercial: ${commercial.fullName}` : "",
      qrCode,
      type: "business",
    }));
  });

  // ─── Procesar envío del formulario (con archivos adjuntos) ────────────────
  app.post("/form/submit", upload.array("files", 10), async (req: Request, res: Response) => {
    try {
      const { qrCode, type, fullName, phone, email, privacyAccepted, marketingAccepted } = req.body;

      if (!privacyAccepted || privacyAccepted === "false") {
        return res.status(400).json({ error: "Debes aceptar la política de privacidad" });
      }
      if (!fullName?.trim() || !phone?.trim() || !email?.trim()) {
        return res.status(400).json({ error: "Rellena todos los campos obligatorios" });
      }

      let commercialId: number;
      let businessId: number | null = null;

      if (type === "personal") {
        const commercial = await db.getCommercialByQrCode(qrCode);
        if (!commercial) return res.status(400).json({ error: "Código QR inválido" });
        commercialId = commercial.id;
      } else {
        const business = await db.getBusinessByQrCode(qrCode);
        if (!business) return res.status(400).json({ error: "Código QR de negocio inválido" });
        commercialId = business.commercialId;
        businessId = business.id;
      }

      // Deduplicación: si ya existe un lead con el mismo teléfono O email,
      // actualizar ese lead con los nuevos datos y marcarlo como "actualizado".
      // Si no existe, crear uno nuevo.
      const phoneNorm = phone.trim().replace(/\s+/g, "");
      const emailNorm = email.trim().toLowerCase();

      console.log(`[Dedup] Buscando leads duplicados para tel=${phoneNorm}, email=${emailNorm}, commercialId=${commercialId}`);

      // Buscar TODOS los leads que coincidan por teléfono Y email para este comercial
      const existingLeads = await db.getAllLeadsByPhoneAndEmail(phoneNorm, emailNorm, commercialId);
      console.log(`[Dedup] Encontrados ${existingLeads.length} leads existentes: ${existingLeads.map((l: any) => `id=${l.id}`).join(", ")}`);

      let leadId: number;

      if (existingLeads.length > 0) {
        // Quedarnos con el lead más antiguo (el primero) y borrar el resto
        const keepLead = existingLeads[0];
        
        // Borrar duplicados extra si hay más de uno
        for (let i = 1; i < existingLeads.length; i++) {
          console.log(`[Dedup] Borrando lead duplicado extra id=${existingLeads[i].id}`);
          await db.deleteLead(existingLeads[i].id);
        }

        // Actualizar el lead existente con los nuevos datos
        console.log(`[Dedup] Actualizando lead existente id=${keepLead.id} con nuevos datos`);
        await db.updateLeadData(keepLead.id, {
          fullName: fullName.trim(),
          phone: phoneNorm,
          email: emailNorm,
          privacyAccepted: true,
          marketingAccepted: marketingAccepted === "true" || marketingAccepted === true,
          businessId: businessId ?? keepLead.businessId,
          status: "new",
          notes: keepLead.notes
            ? `${keepLead.notes}\n[Actualizado: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}]`
            : `[Actualizado: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}]`,
        });
        leadId = keepLead.id;
      } else {
        // Crear nuevo lead
        console.log(`[Dedup] No hay duplicados, creando lead nuevo`);
        leadId = await db.createLead({
          commercialId,
          businessId,
          fullName: fullName.trim(),
          phone: phoneNorm,
          email: emailNorm,
          privacyAccepted: true,
          marketingAccepted: marketingAccepted === "true" || marketingAccepted === true,
          status: "new",
        });
      }
      console.log(`[Dedup] Lead final id=${leadId}`);

      // Subir archivos adjuntos a S3
      const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
      for (const file of uploadedFiles) {
        try {
          const ext = file.originalname.split(".").pop() ?? "bin";
          const key = `leads/${commercialId}/${leadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { url } = await storagePut(key, file.buffer, file.mimetype);
          await db.createLeadFile({
            leadId,
            commercialId,
            originalName: file.originalname,
            storageKey: key,
            storageUrl: url,
            mimeType: file.mimetype,
            fileSize: file.size,
          });
        } catch (e) {
          console.warn("Error subiendo archivo:", file.originalname, e);
        }
      }

      // Notificación push al comercial
      try {
        const pushTokensList = await db.getPushTokensByCommercial(commercialId);
        if (pushTokensList.length > 0) {
          const tokens = pushTokensList.map((t: any) => t.token);
          const businessInfo = businessId ? await db.getBusinessById(businessId) : null;
          const source = businessInfo ? `vía ${(businessInfo as any).name}` : "formulario personal";
          const filesInfo = uploadedFiles.length > 0 ? ` (${uploadedFiles.length} factura${uploadedFiles.length > 1 ? "s" : ""} adjunta${uploadedFiles.length > 1 ? "s" : ""})` : "";
          await sendPush(
            tokens,
            "🎉 Nuevo lead captado",
            `${fullName.trim()} ha rellenado tu formulario ${source}${filesInfo}`,
            { leadId, commercialId }
          );
        }
      } catch { /* Fail silently */ }

      res.json({ success: true, leadId });
    } catch (err: any) {
      console.error("Error en /form/submit:", err);
      res.status(500).json({ error: err.message ?? "Error al procesar el formulario" });
    }
  });
}

// ─── Helpers de renderizado HTML ─────────────────────────────────────────────

function renderNotFound() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enlace no válido – Optima Indaluz</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="header">
    <div class="icon">❌</div>
    <h1>Enlace no válido</h1>
    <p>Este código QR no es válido o ha expirado.</p>
  </div>
</body>
</html>`;
}

interface FormOptions {
  title: string;
  subtitle: string;
  qrCode: string;
  type: "personal" | "business";
}

function renderForm({ title, subtitle, qrCode, type }: FormOptions) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${title} – Optima Indaluz</title>
  <style>${baseStyles()}${formStyles()}</style>
</head>
<body>
  <div class="header">
    <div class="icon">⚡</div>
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
    <p class="desc">Rellena el formulario y te encontraremos la mejor tarifa de luz</p>
  </div>

  <div class="card" id="formCard">
    <form id="leadForm" onsubmit="handleSubmit(event)" enctype="multipart/form-data">
      <input type="hidden" name="qrCode" value="${qrCode}">
      <input type="hidden" name="type" value="${type}">

      <div class="section-title">DATOS DE CONTACTO</div>

      <label>Nombre completo <span class="req">*</span></label>
      <input type="text" name="fullName" placeholder="Tu nombre y apellidos" required autocomplete="name">

      <label>Teléfono <span class="req">*</span></label>
      <input type="tel" name="phone" placeholder="6XX XXX XXX" required autocomplete="tel">

      <label>Email <span class="req">*</span></label>
      <input type="email" name="email" placeholder="tu@email.com" required autocomplete="email">

      <!-- Adjuntar facturas -->
      <div class="file-section">
        <div class="file-section-header">
          <span class="file-section-icon">📄</span>
          <div>
            <div class="file-section-title">Facturas de la luz</div>
            <div class="file-section-sub">Adjunta tu factura (PDF o fotos). Puedes subir varias imágenes si la factura está en varias páginas.</div>
          </div>
        </div>

        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
          <div class="drop-icon">📎</div>
          <div class="drop-text">Toca para adjuntar facturas</div>
          <div class="drop-hint">PDF, JPG, PNG · Máx. 20 MB por archivo · Hasta 10 archivos</div>
        </div>
        <input type="file" id="fileInput" name="files" multiple accept="image/*,.pdf" style="display:none" onchange="handleFiles(this.files)">

        <div id="fileList"></div>
        <div id="fileCount" class="file-count" style="display:none"></div>
      </div>

      <div class="checkbox-section">
        <label class="checkbox-row">
          <input type="checkbox" name="privacyAccepted" id="privacy" required>
          <span>Acepto la <a href="/privacidad" target="_blank">política de privacidad</a> y el tratamiento de mis datos para recibir la comparativa energética. <span class="req">*</span></span>
        </label>
        <label class="checkbox-row">
          <input type="checkbox" name="marketingAccepted" id="marketing">
          <span>Acepto recibir comunicaciones comerciales sobre ofertas de energía.</span>
        </label>
      </div>

      <div id="errorMsg" class="error-box" style="display:none"></div>

      <button type="submit" id="submitBtn">
        <span id="btnText">Solicitar comparativa gratuita</span>
        <span id="btnLoader" style="display:none">Enviando...</span>
      </button>
    </form>
  </div>

  <div class="card" id="successCard" style="display:none">
    <div class="success-content">
      <div class="success-icon">✅</div>
      <h2>¡Solicitud enviada!</h2>
      <p>Hemos recibido tus datos correctamente. En breve nos pondremos en contacto contigo para ofrecerte la mejor tarifa de luz adaptada a tu consumo.</p>
    </div>
  </div>

  <script>
    let selectedFiles = [];

    function handleFiles(fileList) {
      const newFiles = Array.from(fileList);
      // Evitar duplicados por nombre
      newFiles.forEach(f => {
        if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) {
          selectedFiles.push(f);
        }
      });
      renderFileList();
      // Reset input para permitir volver a seleccionar el mismo archivo
      document.getElementById('fileInput').value = '';
    }

    function removeFile(index) {
      selectedFiles.splice(index, 1);
      renderFileList();
    }

    function renderFileList() {
      const list = document.getElementById('fileList');
      const count = document.getElementById('fileCount');
      if (selectedFiles.length === 0) {
        list.innerHTML = '';
        count.style.display = 'none';
        return;
      }
      count.textContent = selectedFiles.length + ' archivo' + (selectedFiles.length > 1 ? 's' : '') + ' seleccionado' + (selectedFiles.length > 1 ? 's' : '');
      count.style.display = 'block';
      list.innerHTML = selectedFiles.map((f, i) => {
        const isImg = f.type.startsWith('image/');
        const icon = isImg ? '🖼️' : '📄';
        const size = f.size > 1024*1024 ? (f.size/1024/1024).toFixed(1)+' MB' : Math.round(f.size/1024)+' KB';
        return '<div class="file-item">' +
          '<span class="file-icon">' + icon + '</span>' +
          '<div class="file-info"><div class="file-name">' + escHtml(f.name) + '</div><div class="file-size">' + size + '</div></div>' +
          '<button type="button" class="file-remove" onclick="removeFile(' + i + ')">✕</button>' +
        '</div>';
      }).join('');
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Drag & drop
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    async function handleSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const btn = document.getElementById('submitBtn');
      const btnText = document.getElementById('btnText');
      const btnLoader = document.getElementById('btnLoader');
      const errorMsg = document.getElementById('errorMsg');

      if (!form.privacyAccepted.checked) {
        errorMsg.textContent = 'Debes aceptar la política de privacidad para continuar.';
        errorMsg.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline';
      errorMsg.style.display = 'none';

      try {
        const formData = new FormData();
        formData.append('qrCode', form.qrCode.value);
        formData.append('type', form.type.value);
        formData.append('fullName', form.fullName.value.trim());
        formData.append('phone', form.phone.value.trim());
        formData.append('email', form.email.value.trim().toLowerCase());
        formData.append('privacyAccepted', form.privacyAccepted.checked ? 'true' : 'false');
        formData.append('marketingAccepted', form.marketingAccepted.checked ? 'true' : 'false');
        selectedFiles.forEach(f => formData.append('files', f));

        const res = await fetch('/form/submit', { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'Error al enviar el formulario');

        document.getElementById('formCard').style.display = 'none';
        document.getElementById('successCard').style.display = 'block';
        window.scrollTo(0, 0);
      } catch (err) {
        errorMsg.textContent = err.message || 'Error al enviar. Inténtalo de nuevo.';
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
      }
    }
  </script>
</body>
</html>`;
}

// ─── Política de privacidad ───────────────────────────────────────────────────

function renderPrivacidad() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidad – Optima Indaluz S.L.</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #11181C; line-height: 1.7; }
    .header { background: linear-gradient(135deg, #0a7ea4 0%, #0569a0 100%); color: white; padding: 40px 24px 32px; text-align: center; }
    .header h1 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .header p { font-size: 13px; opacity: 0.8; }
    .content { max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }
    h2 { font-size: 16px; font-weight: 700; color: #0a7ea4; margin: 28px 0 10px; }
    p, li { font-size: 14px; color: #374151; margin-bottom: 10px; }
    ul { padding-left: 20px; margin-bottom: 12px; }
    li { margin-bottom: 6px; }
    .back-btn { display: inline-block; margin-bottom: 24px; color: #0a7ea4; font-size: 14px; font-weight: 600; text-decoration: none; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #e0f2fe; color: #0369a1; padding: 10px 12px; text-align: left; font-weight: 700; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
    .highlight { background: #f0f9ff; border-left: 4px solid #0a7ea4; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Política de Privacidad</h1>
    <p>Optima Indaluz S.L. · Última actualización: marzo 2026</p>
  </div>
  <div class="content">
    <a class="back-btn" href="javascript:history.back()">← Volver al formulario</a>

    <h2>1. Responsable del tratamiento</h2>
    <table>
      <tr><th>Campo</th><th>Datos</th></tr>
      <tr><td>Razón social</td><td>Optima Indaluz S.L.</td></tr>
      <tr><td>Actividad</td><td>Comercialización de energía eléctrica y gas</td></tr>
      <tr><td>Domicilio</td><td>España</td></tr>
      <tr><td>Email de contacto</td><td>privacidad@optimaindaluz.es</td></tr>
    </table>

    <h2>2. Finalidad del tratamiento</h2>
    <p>Los datos personales recogidos a través de este formulario se utilizan exclusivamente para:</p>
    <ul>
      <li>Elaborar una <strong>comparativa personalizada de tarifas de energía eléctrica</strong> adaptada a tu consumo.</li>
      <li>Contactarte para presentarte la oferta más adecuada a tus necesidades energéticas.</li>
      <li>Gestionar la relación comercial derivada de la contratación de nuestros servicios.</li>
      <li>Enviarte comunicaciones comerciales sobre nuestros productos y servicios, únicamente si has dado tu consentimiento expreso.</li>
    </ul>

    <h2>3. Legitimación</h2>
    <p>La base legal para el tratamiento de tus datos es:</p>
    <ul>
      <li><strong>Consentimiento del interesado</strong> (art. 6.1.a RGPD): al marcar la casilla de aceptación del formulario.</li>
      <li><strong>Ejecución de un contrato</strong> (art. 6.1.b RGPD): cuando la relación comercial se formaliza.</li>
      <li><strong>Interés legítimo</strong> (art. 6.1.f RGPD): para el envío de comunicaciones comerciales a clientes existentes.</li>
    </ul>

    <h2>4. Datos recogidos</h2>
    <ul>
      <li>Nombre y apellidos</li>
      <li>Número de teléfono</li>
      <li>Dirección de correo electrónico</li>
      <li>Documentación de facturación energética (facturas adjuntas, si se aportan voluntariamente)</li>
    </ul>

    <div class="highlight">
      <strong>Nota sobre las facturas:</strong> Las facturas que adjuntes se utilizan exclusivamente para realizar la comparativa energética. No se comparten con terceros ajenos al proceso de contratación.
    </div>

    <h2>5. Destinatarios</h2>
    <p>Tus datos no serán cedidos a terceros, salvo:</p>
    <ul>
      <li>Comercializadoras de energía con las que trabajamos para formalizar la contratación, con tu consentimiento previo.</li>
      <li>Obligación legal o requerimiento de autoridad competente.</li>
    </ul>

    <h2>6. Conservación de los datos</h2>
    <p>Los datos se conservarán durante el tiempo necesario para cumplir con la finalidad para la que fueron recogidos y, en todo caso, durante los plazos legalmente establecidos. Si no se formaliza ninguna relación comercial, los datos se eliminarán en un plazo máximo de <strong>2 años</strong> desde la última interacción.</p>

    <h2>7. Derechos del interesado</h2>
    <p>Puedes ejercer en cualquier momento los siguientes derechos:</p>
    <ul>
      <li><strong>Acceso:</strong> conocer qué datos tenemos sobre ti.</li>
      <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
      <li><strong>Supresión:</strong> solicitar la eliminación de tus datos.</li>
      <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos.</li>
      <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
      <li><strong>Limitación:</strong> solicitar la restricción del tratamiento.</li>
    </ul>
    <p>Para ejercer estos derechos, envía un correo a <strong>privacidad@optimaindaluz.es</strong> indicando el derecho que deseas ejercer y adjuntando copia de tu DNI o documento identificativo.</p>
    <p>Si consideras que el tratamiento no se ajusta a la normativa vigente, puedes presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank">www.aepd.es</a>.</p>

    <h2>8. Seguridad</h2>
    <p>Optima Indaluz S.L. aplica las medidas técnicas y organizativas necesarias para garantizar la seguridad de tus datos y evitar su alteración, pérdida, tratamiento o acceso no autorizado, de acuerdo con lo establecido en el RGPD y la LOPDGDD.</p>

    <h2>9. Modificaciones</h2>
    <p>Nos reservamos el derecho a actualizar esta política de privacidad para adaptarla a novedades legislativas o cambios en nuestros servicios. Te recomendamos revisarla periódicamente.</p>
  </div>
</body>
</html>`;
}

// ─── Estilos base ─────────────────────────────────────────────────────────────

function baseStyles() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f4f8;
      min-height: 100vh;
      color: #11181C;
    }
    .header {
      background: linear-gradient(135deg, #0a7ea4 0%, #0569a0 100%);
      color: white;
      padding: 48px 24px 40px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 8px; line-height: 1.3; }
    .header .subtitle { font-size: 15px; opacity: 0.9; margin-bottom: 4px; }
    .header .desc { font-size: 14px; opacity: 0.75; margin-top: 8px; }
    .card {
      background: white;
      border-radius: 20px 20px 0 0;
      margin-top: -20px;
      padding: 28px 24px 48px;
      min-height: calc(100vh - 200px);
    }
  `;
}

function formStyles() {
  return `
    .section-title {
      font-size: 12px; font-weight: 700; color: #687076;
      letter-spacing: 0.8px; margin-bottom: 20px; margin-top: 4px;
    }
    label:not(.checkbox-row) {
      display: block; font-size: 13px; font-weight: 600;
      color: #11181C; margin-bottom: 6px; margin-top: 18px;
    }
    .req { color: #EF4444; }
    input[type="text"], input[type="tel"], input[type="email"] {
      width: 100%; padding: 14px 16px;
      border: 1.5px solid #E5E7EB; border-radius: 12px;
      font-size: 16px; color: #11181C; background: #f9fafb;
      outline: none; transition: border-color 0.2s; -webkit-appearance: none;
    }
    input[type="text"]:focus, input[type="tel"]:focus, input[type="email"]:focus {
      border-color: #0a7ea4; background: white;
    }

    /* Sección de archivos */
    .file-section {
      margin-top: 24px; background: #f8fafc;
      border-radius: 14px; padding: 16px;
      border: 1.5px solid #e5e7eb;
    }
    .file-section-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .file-section-icon { font-size: 24px; margin-top: 2px; }
    .file-section-title { font-size: 15px; font-weight: 700; color: #11181C; margin-bottom: 2px; }
    .file-section-sub { font-size: 12px; color: #687076; line-height: 1.5; }
    .drop-zone {
      border: 2px dashed #0a7ea4; border-radius: 12px;
      padding: 20px 16px; text-align: center; cursor: pointer;
      transition: background 0.2s; background: white;
    }
    .drop-zone:active, .drop-zone.drag-over { background: #e0f2fe; }
    .drop-icon { font-size: 28px; margin-bottom: 6px; }
    .drop-text { font-size: 15px; font-weight: 600; color: #0a7ea4; margin-bottom: 4px; }
    .drop-hint { font-size: 12px; color: #9ba1a6; }
    .file-count { font-size: 13px; font-weight: 600; color: #0a7ea4; margin-top: 10px; }
    .file-item {
      display: flex; align-items: center; gap: 10px;
      background: white; border-radius: 10px; padding: 10px 12px;
      margin-top: 8px; border: 1px solid #e5e7eb;
    }
    .file-icon { font-size: 20px; flex-shrink: 0; }
    .file-info { flex: 1; min-width: 0; }
    .file-name { font-size: 13px; font-weight: 600; color: #11181C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 11px; color: #9ba1a6; margin-top: 2px; }
    .file-remove {
      background: none; border: none; color: #EF4444;
      font-size: 16px; font-weight: 700; cursor: pointer;
      padding: 4px 6px; flex-shrink: 0;
    }

    /* Checkboxes */
    .checkbox-section { margin-top: 24px; }
    .checkbox-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; cursor: pointer; }
    .checkbox-row input[type="checkbox"] {
      width: 20px; height: 20px; min-width: 20px;
      margin-top: 2px; accent-color: #0a7ea4; cursor: pointer;
    }
    .checkbox-row span { font-size: 13px; color: #687076; line-height: 1.5; }
    .checkbox-row a { color: #0a7ea4; font-weight: 600; }

    .error-box {
      background: #FEE2E2; border-radius: 10px; padding: 12px 16px;
      margin-top: 16px; font-size: 14px; color: #DC2626; line-height: 1.4;
    }
    button[type="submit"] {
      width: 100%; background: #0a7ea4; color: white; border: none;
      border-radius: 14px; padding: 18px; font-size: 17px; font-weight: 700;
      margin-top: 28px; cursor: pointer; transition: opacity 0.2s; -webkit-appearance: none;
    }
    button[type="submit"]:active { opacity: 0.85; }
    button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

    .success-content { text-align: center; padding: 40px 16px; }
    .success-icon { font-size: 72px; margin-bottom: 24px; }
    .success-content h2 { font-size: 24px; font-weight: 800; color: #11181C; margin-bottom: 16px; }
    .success-content p { font-size: 15px; color: #687076; line-height: 1.6; }
  `;
}
