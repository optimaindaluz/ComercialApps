import { Express } from "express";

export function registerPrivacyRoute(app: Express) {
  // Ruta accesible tanto en /privacidad como en /api/privacidad
  const handler = (_req: any, res: any) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Política de Privacidad – Óptima Indaluz</title>
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
    .updated {
      background: #e8f5e9;
      border-left: 4px solid #2e7d32;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #2e7d32;
      margin-bottom: 32px;
    }
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
    <h1>Política de Privacidad</h1>
    <p>Óptima Indaluz – Ingeniería y Consultoría Energética</p>
  </header>

  <main>
    <div class="updated">Última actualización: abril de 2026</div>

    <p>
      En <strong>Óptima Indaluz</strong> nos comprometemos a proteger la privacidad de los usuarios de nuestra
      aplicación móvil <strong>ComercialApp</strong>. Esta política explica qué datos recogemos, cómo los usamos
      y los derechos que te asisten.
    </p>

    <h2>1. Responsable del tratamiento</h2>
    <p>
      <strong>Óptima Indaluz S.L.</strong><br />
      Actividad: Ingeniería y Consultoría Energética<br />
      Contacto: <a href="mailto:optimaindaluz@gmail.com">optimaindaluz@gmail.com</a>
    </p>

    <h2>2. Datos que recogemos</h2>
    <p>La aplicación recoge los siguientes datos según el perfil del usuario:</p>
    <ul>
      <li><strong>Comerciales (usuarios de la app):</strong> nombre, dirección de correo electrónico y contraseña cifrada.</li>
      <li><strong>Leads (clientes potenciales):</strong> nombre, número de teléfono, correo electrónico, tipo de suministro y documentos adjuntos (p. ej. facturas de energía) enviados voluntariamente a través del formulario de contacto.</li>
      <li><strong>Datos técnicos:</strong> token de notificaciones push del dispositivo para enviar alertas de nuevos leads.</li>
    </ul>

    <h2>3. Finalidad del tratamiento</h2>
    <ul>
      <li>Gestionar el acceso y la autenticación de los comerciales en la aplicación.</li>
      <li>Registrar y organizar los leads captados mediante códigos QR para su seguimiento comercial.</li>
      <li>Enviar notificaciones push a los comerciales cuando se recibe un nuevo lead.</li>
      <li>Facilitar la comunicación entre el comercial y el cliente potencial.</li>
    </ul>

    <h2>4. Base legal</h2>
    <p>
      El tratamiento se basa en el <strong>interés legítimo</strong> de la empresa para la gestión de su actividad
      comercial y en el <strong>consentimiento</strong> del cliente potencial al enviar voluntariamente sus datos
      a través del formulario de contacto.
    </p>

    <h2>5. Conservación de los datos</h2>
    <p>
      Los datos de los leads se conservan mientras sean necesarios para la gestión comercial activa.
      Los datos de los comerciales se conservan durante la vigencia de la relación laboral o contractual.
      Transcurrido ese periodo, los datos serán eliminados o anonimizados.
    </p>

    <h2>6. Comunicación a terceros</h2>
    <p>
      Los datos no se ceden a terceros salvo obligación legal. La infraestructura de la aplicación utiliza
      servicios de alojamiento en la nube (<strong>Manus Space</strong>) para el almacenamiento seguro de los datos.
    </p>

    <h2>7. Derechos del interesado</h2>
    <p>Cualquier persona cuyos datos sean tratados puede ejercer los siguientes derechos:</p>
    <ul>
      <li><strong>Acceso:</strong> conocer qué datos se tratan sobre su persona.</li>
      <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
      <li><strong>Supresión:</strong> solicitar la eliminación de sus datos.</li>
      <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos.</li>
      <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado.</li>
    </ul>
    <p>
      Para ejercer estos derechos, envía un correo a
      <a href="mailto:optimaindaluz@gmail.com">optimaindaluz@gmail.com</a> indicando el derecho que deseas ejercer
      y adjuntando una copia de tu documento de identidad.
    </p>

    <h2>8. Seguridad</h2>
    <p>
      Aplicamos medidas técnicas y organizativas para proteger los datos frente a accesos no autorizados,
      pérdida o destrucción, incluyendo cifrado de contraseñas, comunicaciones HTTPS y control de acceso
      basado en roles.
    </p>

    <h2>9. Menores de edad</h2>
    <p>
      La aplicación está destinada exclusivamente a profesionales mayores de 18 años. No recogemos
      conscientemente datos de menores de edad.
    </p>

    <h2>10. Cambios en esta política</h2>
    <p>
      Podemos actualizar esta política periódicamente. Los cambios significativos serán notificados
      a través de la aplicación. La fecha de última actualización aparece al inicio de este documento.
    </p>

    <h2>11. Contacto</h2>
    <p>
      Para cualquier consulta relacionada con la privacidad de tus datos, contacta con nosotros en
      <a href="mailto:optimaindaluz@gmail.com">optimaindaluz@gmail.com</a>.
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

  app.get("/privacidad", handler);
  app.get("/api/privacidad", handler);
}
