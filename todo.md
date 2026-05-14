# ComercialApp - TODO

## Configuración y Base de Datos
- [x] Actualizar tema de colores (azul corporativo Optima Indaluz)
- [x] Configurar esquema de base de datos (commercials, leads, businesses, leadFiles)
- [x] Crear migraciones de base de datos
- [x] Configurar rutas tRPC (auth, leads, businesses, publicForm)
- [x] Configurar almacenamiento S3 para archivos de facturas

## Autenticación
- [x] Pantalla de Login (usuario + contraseña)
- [x] Pantalla de Registro (nombre, usuario, email, contraseña)
- [x] Sistema de autenticación custom con JWT (no OAuth Manus)
- [x] Gestión de sesión con SecureStore (nativo) y localStorage (web)
- [x] Protección de rutas autenticadas (redirect a /login si no autenticado)

## Zona del Comercial - Mi QR
- [x] Pantalla "Mi QR" con QR personal fijo
- [x] Botón compartir enlace del formulario (Share API nativa)
- [x] Botón compartir QR como imagen PNG
- [x] Mostrar info del comercial en pantalla QR

## Zona del Comercial - Generador de Negocios
- [x] Pantalla "Negocios" con lista de negocios
- [x] Modal "Nuevo Negocio" (nombre del negocio)
- [x] Generación de QR único por negocio
- [x] Guardado persistente de negocios en BD
- [x] Pantalla detalle de negocio con QR y leads
- [x] Compartir QR de negocio
- [x] Eliminar negocio con confirmación

## Zona del Comercial - Leads
- [x] Pantalla "Leads" con lista de clientes
- [x] Filtros por estado (nuevo, contactado, en proceso, cerrado)
- [x] Buscador de leads por nombre, email y teléfono
- [x] Pantalla detalle de lead con archivos adjuntos
- [x] Cambio de estado del lead
- [x] Acciones rápidas (llamar, email, WhatsApp)
- [x] Exportar leads a CSV (web)

## Formularios Públicos (Web)
- [x] Ruta pública /form/[qrCode] (formulario personal del comercial)
- [x] Ruta pública /form/negocio/[qrCode] (formulario personalizado de negocio)
- [x] Campos: Nombre, Teléfono, Email
- [x] Upload de archivos (facturas de luz, PDF/imágenes)
- [x] Checkbox política de privacidad (obligatorio)
- [x] Checkbox aceptar contacto comercial (opcional)
- [x] Subida de archivos a S3 con organización por comercial
- [x] Guardado de lead en BD con referencia al comercial
- [x] Página de confirmación tras envío exitoso

## Dashboard (Inicio)
- [x] Pantalla de inicio con estadísticas (total leads, nuevos, negocios)
- [x] Acciones rápidas (Mi QR, Nuevo negocio, Ver leads)
- [x] Lista de leads recientes

## Perfil del Comercial
- [x] Pantalla de perfil con datos del usuario
- [x] Estadísticas (total leads, negocios activos)
- [x] Botón cerrar sesión con confirmación

## Branding
- [x] Generar logo de la app basado en Optima Indaluz
- [x] Actualizar app.config.ts con nombre y logo
- [x] Actualizar tema de colores en theme.config.js

## Tests
- [x] Tests de validación de formularios
- [x] Tests de autenticación comercial
- [x] Tests de validación de datos de leads

## Entrega
- [x] Revisar todos los flujos end-to-end
- [x] Corregir errores TypeScript (0 errores)
- [x] Checkpoint final

## Nuevas Funcionalidades (v2)

### Notas por Lead
- [x] Añadir campo `notes` a la tabla leads en el esquema DB
- [x] Endpoint tRPC para guardar/actualizar notas de un lead
- [x] UI de notas en la pantalla de detalle del lead (editar y guardar)

### Notificaciones Push
- [x] Endpoint para registrar token de push por comercial
- [x] Enviar notificación push cuando llega un nuevo lead al formulario
- [x] Pantalla de configuración de notificaciones en perfil

### Panel de Administrador
- [x] Tabla `admins` en la base de datos
- [x] Crear usuario administrador inicial
- [x] Rutas tRPC protegidas para admin (ver todos los comerciales, leads, estadísticas)
- [x] Pantalla de login para admin (ruta /admin/login)
- [x] Dashboard de admin: lista de comerciales con sus estadísticas
- [x] Vista de todos los leads con filtros globales
- [x] Exportar datos globales a CSV

### Panel Admin - Control Total
- [x] Admin puede editar/borrar cualquier lead de cualquier comercial
- [x] Admin puede editar/borrar cualquier negocio de cualquier comercial
- [x] Admin puede editar/borrar cualquier comercial
- [x] Admin puede crear leads manualmente para cualquier comercial
- [x] Admin puede ver archivos adjuntos de cualquier lead
- [x] Admin puede exportar todos los datos a CSV
- [x] Pantalla admin: detalle de comercial con todos sus leads y negocios
- [x] Pantalla admin: detalle de lead con edición completa

## Nuevas Funcionalidades (v3)

### Admin - Cambio de contraseña, filtros y exportación
- [x] Admin puede cambiar su propia contraseña
- [x] Filtros avanzados en panel admin (por fecha, estado, comercial)
- [x] Exportación CSV global desde el panel admin

### Admin - Gestión de usuarios
- [x] Admin puede crear nuevos usuarios comerciales
- [x] Admin puede bloquear/desbloquear temporalmente un comercial
- [x] Admin puede eliminar un comercial
- [x] Notificación al admin cuando un comercial se registra (pendiente de aprobación)
- [x] Admin aprueba o deniega solicitudes de registro
- [x] Comercial bloqueado/pendiente no puede iniciar sesión

### Perfil del Comercial - Autoadministración
- [x] Cambiar foto de perfil (desde cámara o galería)
- [x] Cambiar contraseña (con verificación de contraseña actual)
- [x] Editar nombre completo y email
- [x] Validación robusta de contraseña en registro (mín. 9 chars, 1 mayúscula, 1 carácter especial)

### Exportación por Negocio
- [x] Botón exportar leads a CSV en la pantalla de detalle de negocio
- [x] Exportar leads del comercial (todos) a CSV desde la pantalla de leads

### WhatsApp Directo
- [x] Botón WhatsApp en detalle de lead abre conversación directa con el número del cliente
- [x] Verificar que el número se formatea correctamente para wa.me

## Correcciones y Mejoras (v4)
- [ ] Corregir botón borrar usuario en panel admin (no funciona)
- [ ] Mostrar mensaje de error cuando la contraseña es incorrecta en login
- [ ] Añadir flujo de recuperación de contraseña para comerciales

## Correcciones (v5)
- [x] Corregir botones aprobar/denegar solicitudes de registro en panel admin (window.confirm en web)
- [x] Corregir botones bloquear/desbloquear en panel admin (window.confirm en web)
- [x] Eliminar enlace "Acceso administrador" de la pantalla de login de comerciales

## Mejoras (v6)
- [x] Gesto secreto en login: tocar el logo 5 veces redirige al panel de administrador

## Bugs y Mejoras (v7)
- [x] Leads no se actualizan en tiempo real (polling automático cada 30 segundos)
- [x] "Leads totales" descentrado en pantalla de perfil
- [x] Exportar CSV/Excel no funciona en móvil (dice "solo versión web") — implementar descarga nativa
- [x] Filtros de leads no caben en pantalla — reemplazar por menú desplegable con filtro por negocio incluido
- [x] Leads requieren deslizar manualmente para actualizar — actualización automática

## Correcciones (v8)
- [x] Exportar Excel en pantalla de detalle de negocio (igual que en leads, con expo-file-system + expo-sharing)
- [x] Exportar Excel en panel de administrador (mismo sistema nativo)
- [x] Polling automático en stats del inicio (Total leads, Nuevos, Negocios) — refetchInterval 30s
- [x] Detalle de lead muestra solo 1 archivo cuando se suben varios — formulario v7 con feedback visual y subida robusta de múltiples archivos

## Correcciones (v9)
- [x] Quitar botón Excel del detalle de negocio (pantalla QR) — no corresponde ahí
- [x] Reemplazar botón "↓ CSV" en la lista de negocios por "⬇ Excel" con expo-file-system + expo-sharing

## Correcciones (v10)
- [x] Panel admin pestaña Leads: quitar barra de búsqueda y filtros aplastados en fila
- [x] Panel admin pestaña Leads: añadir botón "⚙ Filtros" con menú desplegable (estado, fecha, comercial) igual al del comercial
- [x] Panel admin pestaña Leads: mostrar últimos 10 leads por defecto, todos al aplicar filtros

## Correcciones (v10)
- [x] Panel admin pestaña Leads: quitar barra de búsqueda y filtros aplastados en fila
- [x] Panel admin pestaña Leads: añadir botón "⚙ Filtros" con menú desplegable (estado, fecha, comercial) igual al del comercial
- [x] Panel admin pestaña Leads: mostrar últimos 10 leads por defecto, todos al aplicar filtros
- [x] Detalle de lead (panel comercial): añadir sección de consentimientos del formulario (política de privacidad + aceptar ofertas)

## Correcciones (v11)
- [x] Eliminar fondo blanco del logo Optima Indaluz (PNG transparente)
- [x] Pantalla de login: reemplazar rayo por logo Optima Indaluz sin fondo
- [x] Pantalla de login: formulario pegado al fondo (sin borde azul visible abajo)
- [x] QR de negocios: añadir logo Optima Indaluz en el centro del código QR

## Correcciones (v12)
- [x] Pantalla de login: tarjeta completamente pegada al fondo (sin borde azul visible abajo)
- [x] Pantalla de login: logo Optima Indaluz más grande (casi ancho completo de pantalla)

## Correcciones (v13)
- [x] Pantalla de login: tarjeta desplegable animada (colapsada muestra solo Bienvenido/subtítulo, expandida muestra campos)
- [x] Pantalla de login: recuperar texto "Gestión de leads energéticos" debajo de "Optima Indaluz"
- [x] Pantalla de login: reducir espacio entre logo y texto "Optima Indaluz"

## Correcciones (v14)
- [x] Advertencia de privacidad en botones Llamar/Email/WhatsApp si marketingAccepted=false (panel comercial y admin)

## Correcciones (v15)
- [x] Icono WhatsApp en botón de WhatsApp (panel comercial y admin)
- [x] Arreglar rebote del desplegable de login (animación fluida sin rebote)
- [x] Fusión de leads por teléfono: si llega formulario con mismo teléfono, actualizar lead existente (upsert)

## Correcciones (v16)
- [ ] Centrar contenido (icono + texto) en botones Llamar/Email/WhatsApp (panel comercial y admin)
- [ ] Reemplazar emoji 💬 por icono SVG oficial de WhatsApp en botón WhatsApp
- [x] Ampliar deduplicación: comprobar teléfono Y email al recibir formulario, borrar duplicado y guardar nuevo

## Correcciones (v16 cont.)
- [x] Pantalla de registro: tarjeta oscura pegada al fondo (sin borde azul visible abajo)
- [x] Pantalla de recuperar contraseña: tarjeta oscura pegada al fondo (sin borde azul visible abajo)
- [x] Logo en pantalla de inicio: fade-in suave al aparecer (600ms) en lugar de aparecer de golpe

## Correcciones (v17)
- [x] Logo Optima Indaluz en login: visible desde el primer frame (sin delay, sin fade-in)
- [x] Deduplicación de leads: borrar el lead antiguo y crear uno nuevo (no actualizar el existente)

## Correcciones (v18)
- [x] Deduplicación de leads sigue sin funcionar: leads con mismo teléfono y email aparecen duplicados — borrar TODOS los antiguos antes de crear el nuevo

## Correcciones (v19)
- [x] Deduplicación sigue sin funcionar en producción — diagnosticar causa raíz
- [x] Cambiar estrategia: actualizar lead existente con nuevos datos + marcador "actualizado" con fecha

## Correcciones (v20)
- [x] Deduplicación funciona en sandbox pero NO en producción — causa raíz: formulario Netlify usa tRPC (routers.ts), no Express (formRoutes.ts). Corregido en publicForm.submit

## Correcciones (v21)
- [x] Deduplicación: cambiar de OR a AND — solo actualizar lead cuando coincidan AMBOS (teléfono Y email), no solo uno

## Correcciones (v22)
- [x] Detalle de lead: quitar enlaces (azul/clickable) del teléfono y email — dejar como texto plano sin función

## Correcciones (v23)
- [x] Login: reemplazar logo antiguo por nuevo logo Óptima Indaluz y cambiar fondo azul por gradiente verde-azul oscuro corporativo

## Correcciones (v24)
- [x] Login: logo corporativo con bordes redondeados integrado en gradiente ajustado a colores reales del logo

## Correcciones (v25)
- [x] Login: barra de estado (status bar) blanca arriba — cambiar a oscura/transparente para que el gradiente llegue hasta arriba
- [x] Registro: cambiar fondo azul antiguo por gradiente verde-azul oscuro nuevo
- [x] Recuperar contraseña: cambiar fondo azul antiguo por gradiente verde-azul oscuro nuevo

## Correcciones (v26)
- [x] Login, Registro y Recuperar contraseña: franja blanca visible arriba en iOS — extender gradiente hasta el borde superior de pantalla (por detrás de la status bar)

## Correcciones (v27)
- [x] Crear página de política de privacidad pública en el servidor para Google Play Store

## Correcciones (v29)
- [x] Error de Gradle al publicar: react-native-gesture-handler compileReleaseJavaWithJavac falla — fijadas versiones compileSdkVersion 35, targetSdkVersion 35, kotlinVersion 2.0.21
- [x] Política de privacidad no accesible en producción (404) — creada como ruta Expo Router /privacidad

## Correcciones (v30)
- [x] Error de Gradle: androidx.activity:activity:1.11.0 requiere compileSdk >= 36 — subido compileSdkVersion y targetSdkVersion a 36

## Correcciones (v31)
- [x] URL /privacidad devuelve 404 en producción — añadida ruta /api/privacidad que sí pasa por el servidor Express en producción

## Correcciones (v32)
- [x] Error en scripts/load-env.js con import statement en Mac — convertido a CommonJS (require) para compatibilidad

## Correcciones (v33)
- [x] Error de build iOS: expo-sharing incompatible — actualizado a última versión

## Correcciones (v34)
- [x] Error build iOS: expo-sharing@55 incompatible con expo-modules-core de SDK 54 — bajado a expo-sharing@13.0.1 (versión correcta para SDK 54)

## Correcciones (v35)
- [x] Error "Cannot use import statement outside a module" en load-env.js — eliminada la importación de load-env.js en app.config.ts (no es necesaria para el build de iOS/Android)

## Correcciones (v36)
- [x] Configurado EAS Build con projectId 70dcac78-4a28-4905-aa6c-c17f891e3ee3 para cuenta jaime96ct
- [x] Creado eas.json con configuración de build para iOS y Android
