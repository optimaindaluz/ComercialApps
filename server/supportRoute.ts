import { Express } from "express";

export function registerSupportRoute(app: Express) {
  const handler = (_req: any, res: any) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Soporte – ComercialApps</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
      color: #1a1a2e;
      line-height: 1.7;
    }
    header {
      background: linear-gradient(135deg, #0d302c 0%, #192841 40%, #1a5d63 70%, #243663 100%);
      color: #fff;
      padding: 40px 24px 32px;
      text-align: center;
    }
    header h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 6px; }
    header p { font-size: 0.95rem; opacity: 0.8; }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }
    h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0a4a5e;
      margin: 36px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e0f0f4;
    }
    p { margin-bottom: 14px; font-size: 0.97rem; }
    ul { margin: 0 0 14px 20px; }
    ul li { margin-bottom: 6px; font-size: 0.97rem; }
    .contact-box {
      background: #e8f5e9;
      border-left: 4px solid #1a5d63;
      padding: 20px 24px;
      border-radius: 8px;
      margin: 32px 0;
    }
    .contact-box p { margin-bottom: 6px; }
    footer {
      text-align: center;
      padding: 24px;
      font-size: 0.85rem;
      color: #888;
      border-top: 1px solid #e0e0e0;
    }
    a { color: #0a7ea4; }
  </style>
</head>
<body>
  <header>
    <h1>Soporte – ComercialApps</h1>
    <p>Óptima Indaluz – Ingeniería y Consultoría Energética</p>
  </header>

  <main>
    <p>
      Bienvenido al centro de soporte de <strong>ComercialApps</strong>, la aplicación de gestión de leads
      energéticos para comerciales de Óptima Indaluz.
    </p>

    <h2>¿Necesitas ayuda?</h2>
    <p>
      Si tienes algún problema con la aplicación, no puedes iniciar sesión o necesitas asistencia,
      contacta con nosotros directamente:
    </p>

    <div class="contact-box">
      <p><strong>Email de soporte:</strong></p>
      <p><a href="mailto:optimaindaluz@gmail.com">optimaindaluz@gmail.com</a></p>
      <p style="margin-top: 10px; font-size: 0.9rem; color: #555;">
        Respondemos en un plazo de 24-48 horas laborables.
      </p>
    </div>

    <h2>Preguntas frecuentes</h2>

    <p><strong>¿Cómo inicio sesión en la app?</strong></p>
    <p>
      Introduce tu nombre de usuario y contraseña proporcionados por tu empresa.
      Si no recuerdas tus credenciales, contacta con tu administrador o escríbenos al email de soporte.
    </p>

    <p><strong>¿Cómo registro un nuevo lead?</strong></p>
    <p>
      Desde la pantalla principal, pulsa el botón de nuevo lead o escanea el código QR del cliente.
      Rellena los datos del formulario y guarda.
    </p>

    <p><strong>¿Por qué no recibo notificaciones?</strong></p>
    <p>
      Asegúrate de que las notificaciones están activadas para ComercialApps en los ajustes de tu dispositivo.
      En iOS: Ajustes → ComercialApps → Notificaciones → Permitir notificaciones.
    </p>

    <p><strong>¿Cómo exporto mis leads?</strong></p>
    <p>
      Desde la pantalla de leads, pulsa el botón de exportar (icono de compartir) para descargar
      un archivo Excel con todos tus leads.
    </p>

    <p><strong>La app no carga mis datos</strong></p>
    <p>
      Verifica que tienes conexión a internet. Si el problema persiste, cierra la sesión,
      vuelve a iniciarla y contacta con soporte si continúa.
    </p>

    <h2>Política de privacidad</h2>
    <p>
      Puedes consultar nuestra política de privacidad en:
      <a href="/privacidad">comercialapp-8bzfimfb.manus.space/privacidad</a>
    </p>
  </main>

  <footer>
    &copy; 2026 Óptima Indaluz S.L. – Todos los derechos reservados
  </footer>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  };

  app.get("/soporte", handler);
  app.get("/support", handler);
  app.get("/api/soporte", handler);
}
