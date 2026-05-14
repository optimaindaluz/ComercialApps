-- Schema de ComercialApp para Supabase (PostgreSQL)
-- Ejecutar en Supabase → SQL Editor

-- Tabla de usuarios del sistema OAuth de Manus (se mantiene por compatibilidad)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de comerciales (autenticación propia)
CREATE TABLE IF NOT EXISTS commercials (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(255) NOT NULL,
  "personalQrCode" VARCHAR(64) NOT NULL UNIQUE,
  "avatarUrl" VARCHAR(1024),
  "accountStatus" VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK ("accountStatus" IN ('pending', 'active', 'blocked')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de negocios creados por los comerciales
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  "commercialId" INTEGER NOT NULL REFERENCES commercials(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  "qrCode" VARCHAR(64) NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de leads (clientes captados)
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  "commercialId" INTEGER NOT NULL REFERENCES commercials(id) ON DELETE CASCADE,
  "businessId" INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  "fullName" VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(320) NOT NULL,
  "privacyAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketingAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'closed')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de archivos adjuntos (facturas de luz)
CREATE TABLE IF NOT EXISTS "leadFiles" (
  id SERIAL PRIMARY KEY,
  "leadId" INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  "commercialId" INTEGER NOT NULL REFERENCES commercials(id) ON DELETE CASCADE,
  "originalName" VARCHAR(255) NOT NULL,
  "storageKey" VARCHAR(512) NOT NULL,
  "storageUrl" VARCHAR(1024) NOT NULL,
  "mimeType" VARCHAR(128) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de administradores del sistema
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de tokens de notificaciones push
CREATE TABLE IF NOT EXISTS "pushTokens" (
  id SERIAL PRIMARY KEY,
  "commercialId" INTEGER NOT NULL REFERENCES commercials(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL,
  platform VARCHAR(16) NOT NULL DEFAULT 'expo',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS "passwordResetTokens" (
  id SERIAL PRIMARY KEY,
  "commercialId" INTEGER NOT NULL REFERENCES commercials(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Función para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commercials_updated_at BEFORE UPDATE ON commercials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON "pushTokens" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
