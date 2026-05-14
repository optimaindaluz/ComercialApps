# ComercialApp - Diseño de Interfaz

## Identidad Visual

- **Nombre**: ComercialApp
- **Paleta de colores**:
  - Primary: `#1A56DB` (azul corporativo energético)
  - Secondary: `#F97316` (naranja acento)
  - Background: `#F8FAFC` (gris muy claro)
  - Surface: `#FFFFFF`
  - Foreground: `#0F172A`
  - Muted: `#64748B`
  - Success: `#16A34A`
  - Error: `#DC2626`
  - Border: `#E2E8F0`

---

## Pantallas

### 1. Auth Stack (no autenticado)
- **Login** (`/login`): Logo, campo usuario, campo contraseña, botón "Entrar", link a registro
- **Registro** (`/register`): Nombre completo, usuario, email, contraseña, confirmar contraseña, botón "Crear cuenta"

### 2. Tab Bar Principal (autenticado)
- Tab 1: **Inicio** (resumen del comercial)
- Tab 2: **Mi QR** (QR personal del comercial)
- Tab 3: **Negocios** (generador de QR para negocios)
- Tab 4: **Leads** (lista de clientes captados)
- Tab 5: **Perfil** (datos del comercial)

### 3. Pantallas de detalle
- **Detalle de Lead** (`/leads/[id]`): Datos del cliente, archivos adjuntos, estado
- **Detalle de Negocio** (`/negocios/[id]`): QR del negocio, leads asociados
- **Formulario Público** (`/form/[commercialId]`): Formulario de captación genérico
- **Formulario Negocio** (`/form/negocio/[businessId]`): Formulario personalizado por negocio

---

## Flujos Principales

### Flujo de Captación Personal
1. Comercial abre "Mi QR" → ve su QR personal
2. Toca "Compartir" → sistema share sheet de iOS/Android
3. Cliente escanea QR → abre formulario web en navegador
4. Cliente rellena datos + adjunta factura → envía
5. Lead aparece en sección "Leads" del comercial

### Flujo de Negocio
1. Comercial va a "Negocios" → toca "Nuevo Negocio"
2. Escribe nombre del negocio → genera QR
3. QR se guarda en lista de negocios
4. Comercial puede compartir/mostrar ese QR
5. Clientes del negocio rellenan formulario personalizado

### Flujo de Gestión de Leads
1. Comercial va a "Leads" → ve lista con filtros
2. Toca un lead → ve detalle completo
3. Puede ver/descargar archivos adjuntos
4. Puede exportar todos los leads a CSV

---

## Layouts por Pantalla

### Login / Registro
- Logo centrado arriba
- Formulario en tarjeta blanca centrada
- Fondo con gradiente azul suave

### Mi QR
- QR grande centrado (300x300)
- Botón "Compartir" prominente debajo
- Info del comercial arriba (nombre, ID)
- Instrucciones de uso

### Negocios
- Header con botón "+" para nuevo negocio
- FlatList de tarjetas de negocios
- Cada tarjeta: nombre, fecha, miniatura QR, leads count

### Leads
- Header con filtros y buscador
- FlatList de tarjetas de leads
- Cada tarjeta: nombre cliente, fecha, origen (personal/negocio), estado
- Botón exportar CSV en header

### Formulario Público (web)
- Diseño responsive web
- Logo/nombre del comercial o negocio
- Campos: Nombre, Teléfono, Email
- Upload de archivos (facturas)
- Checkboxes legales
- Botón enviar
