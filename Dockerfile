# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar todas las dependencias (necesarias para el build)
RUN pnpm install --frozen-lockfile

# Copiar el código fuente
COPY . .

# Compilar el servidor
RUN pnpm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Copiar el servidor compilado
COPY --from=builder /app/dist ./dist

# Render inyecta PORT automáticamente, el servidor ya lo usa con process.env.PORT
EXPOSE 3000

CMD ["node", "dist/index.js"]
