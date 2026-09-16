import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('.env ya existe; se conserva.');
} else {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    '.env',
    `DATABASE_URL=postgresql://novabill:${password}@127.0.0.1:5432/novabill_demo?schema=public\nPOSTGRES_USER=novabill\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=novabill_demo\nJWT_SECRET=${randomBytes(48).toString('hex')}\nAPP_ORIGIN=http://localhost:3000\nAPI_PORT=4000\nAPI_INTERNAL_URL=http://127.0.0.1:4000\nCOOKIE_SECURE=false\n`,
    { mode: 0o600 },
  );
  console.log('.env local generado con valores aleatorios. No lo publiques.');
}
