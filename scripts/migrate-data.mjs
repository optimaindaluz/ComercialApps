/**
 * Script de migración de datos: Manus MySQL → Supabase PostgreSQL
 * Ejecutar con: node scripts/migrate-data.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Cargar variables de entorno
const dotenv = require('dotenv');
dotenv.config();

const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const MYSQL_URL = process.env.DATABASE_URL;
const PG_URL = 'postgresql://postgres.udcmoquuuyicrjjvkwnz:Optimaindaluz2025.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  console.log('🚀 Iniciando migración de datos Manus MySQL → Supabase PostgreSQL\n');

  // Conectar a MySQL (Manus)
  const mysqlConn = await mysql.createConnection(MYSQL_URL);
  console.log('✅ Conectado a Manus MySQL');

  // Conectar a PostgreSQL (Supabase)
  const pgPool = new Pool({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  console.log('✅ Conectado a Supabase PostgreSQL\n');

  try {
    // 1. Migrar admins
    console.log('📋 Migrando admins...');
    const [admins] = await mysqlConn.execute('SELECT * FROM admins');
    for (const admin of admins) {
      await pgPool.query(
        `INSERT INTO admins (id, username, email, "passwordHash", "fullName", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, email=EXCLUDED.email`,
        [admin.id, admin.username, admin.email, admin.passwordHash, admin.fullName, admin.createdAt, admin.updatedAt]
      );
    }
    console.log(`  ✅ ${admins.length} admins migrados`);

    // 2. Migrar comerciales
    console.log('📋 Migrando comerciales...');
    const [commercials] = await mysqlConn.execute('SELECT * FROM commercials');
    for (const c of commercials) {
      await pgPool.query(
        `INSERT INTO commercials (id, username, email, "passwordHash", "fullName", "personalQrCode", "avatarUrl", "accountStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, email=EXCLUDED.email`,
        [c.id, c.username, c.email, c.passwordHash, c.fullName, c.personalQrCode, c.avatarUrl || null, c.accountStatus, c.createdAt, c.updatedAt]
      );
    }
    console.log(`  ✅ ${commercials.length} comerciales migrados`);

    // 3. Migrar negocios
    console.log('📋 Migrando negocios...');
    const [businesses] = await mysqlConn.execute('SELECT * FROM businesses');
    for (const b of businesses) {
      await pgPool.query(
        `INSERT INTO businesses (id, "commercialId", name, "qrCode", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
        [b.id, b.commercialId, b.name, b.qrCode, b.createdAt, b.updatedAt]
      );
    }
    console.log(`  ✅ ${businesses.length} negocios migrados`);

    // 4. Migrar leads
    console.log('📋 Migrando leads...');
    const [leads] = await mysqlConn.execute('SELECT * FROM leads');
    for (const l of leads) {
      await pgPool.query(
        `INSERT INTO leads (id, "commercialId", "businessId", "fullName", phone, email, "privacyAccepted", "marketingAccepted", notes, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes`,
        [l.id, l.commercialId, l.businessId || null, l.fullName, l.phone, l.email, 
         Boolean(l.privacyAccepted), Boolean(l.marketingAccepted), l.notes || null, l.status, l.createdAt, l.updatedAt]
      );
    }
    console.log(`  ✅ ${leads.length} leads migrados`);

    // 5. Migrar archivos de leads
    console.log('📋 Migrando archivos de leads...');
    const [leadFiles] = await mysqlConn.execute('SELECT * FROM leadFiles');
    for (const f of leadFiles) {
      await pgPool.query(
        `INSERT INTO "leadFiles" (id, "leadId", "commercialId", "originalName", "storageKey", "storageUrl", "mimeType", "fileSize", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [f.id, f.leadId, f.commercialId, f.originalName, f.storageKey, f.storageUrl, f.mimeType, f.fileSize, f.createdAt]
      );
    }
    console.log(`  ✅ ${leadFiles.length} archivos migrados`);

    // 6. Migrar push tokens
    console.log('📋 Migrando push tokens...');
    const [pushTokens] = await mysqlConn.execute('SELECT * FROM pushTokens');
    for (const t of pushTokens) {
      await pgPool.query(
        `INSERT INTO "pushTokens" (id, "commercialId", token, platform, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.commercialId, t.token, t.platform || 'expo', t.createdAt, t.updatedAt]
      );
    }
    console.log(`  ✅ ${pushTokens.length} push tokens migrados`);

    // 7. Actualizar secuencias de PostgreSQL para que los IDs no colisionen
    console.log('\n📋 Actualizando secuencias de IDs...');
    const tables = ['admins', 'commercials', 'businesses', 'leads', '"leadFiles"', '"pushTokens"'];
    const tableNames = ['admins', 'commercials', 'businesses', 'leads', 'leadFiles', 'pushTokens'];
    for (const table of tableNames) {
      const res = await pgPool.query(`SELECT MAX(id) as max_id FROM "${table}"`);
      const maxId = res.rows[0].max_id || 0;
      if (maxId > 0) {
        await pgPool.query(`SELECT setval('${table}_id_seq', ${maxId + 1})`);
        console.log(`  ✅ Secuencia ${table}_id_seq → ${maxId + 1}`);
      }
    }

    console.log('\n🎉 Migración completada con éxito!');
    console.log(`   Admins: ${admins.length}`);
    console.log(`   Comerciales: ${commercials.length}`);
    console.log(`   Negocios: ${businesses.length}`);
    console.log(`   Leads: ${leads.length}`);
    console.log(`   Archivos: ${leadFiles.length}`);
    console.log(`   Push tokens: ${pushTokens.length}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await mysqlConn.end();
    await pgPool.end();
  }
}

migrate().catch(err => {
  console.error('❌ Migración fallida:', err);
  process.exit(1);
});
