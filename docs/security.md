# Seguridad y límites de la demo

## Controles presentes

La identidad se obtiene de JWT firmado HS256 con emisor/audiencia fijos y vencimiento. Cada solicitud revisa al usuario activo y su versión de sesión en PostgreSQL. Las cookies son HttpOnly, SameSite Strict y de ruta `/api`; `COOKIE_SECURE=true` corresponde a HTTPS. El refresh se genera con 48 bytes aleatorios y solo se almacena su SHA-256. La rotación utiliza compare-and-set dentro de una transacción para impedir dos consumos del mismo token.

Contraseñas: scrypt con salt de 16 bytes y comparación de tiempo constante. Login ejecuta scrypt incluso si el email no existe y utiliza un error genérico. DTOs limitan longitud y rechazan propiedades no declaradas. Los administradores no pueden desactivar ni degradar su propia cuenta; los cambios de usuario revocan sesiones.

La empresa nunca se toma de un parámetro del navegador. Los servicios buscan por empresa y UUID y aplican roles explícitos. Las relaciones compuestas en PostgreSQL refuerzan el aislamiento. No hay endpoint para consultar una empresa arbitraria ni cambiar pertenencia.

Mutaciones: `Origin` exacto y cabecera `X-Novabill-Request` obligatorios. CORS se restringe a un origen. Helmet añade cabeceras defensivas a la API; Next añade nosniff, protección contra frames y referrer policy. Limitación en memoria por IP y clase de endpoint; el proxy local comparte IP y por eso el límite es global para navegadores que pasan por él. Esto es deliberado para una única demo pequeña; no se debe anunciar como protección distribuida.

Auditoría de login y mutaciones de negocio sin contraseñas ni tokens. No existe endpoint de edición/borrado de logs. Las transacciones guardan cambios y auditoría juntos. CSV entrecomilla campos, escapa comillas y neutraliza prefijos de fórmulas.

## Revisión antes de publicar

`npm run check:secrets` inspecciona archivos versionados y candidatos, bloquea `.env`, dependencias/builds privados, claves y patrones reconocidos de tokens. `.gitignore` excluye artefactos locales; `.dockerignore` evita copiar configuración privada en la imagen. La revisión automática no es una garantía matemática de ausencia de secretos: complementa la inspección de `git diff --cached` y del árbol remoto.

`admin@novabill.demo` / `Demo1234!` son credenciales públicas ficticias. Las credenciales de PostgreSQL del workflow son efímeras, limitadas al runner. Las claves locales se generan aleatoriamente y nunca se incorporan al repositorio. No se utiliza un token GitHub desde código de la aplicación.

## Fuera del alcance

No hay integración DIAN, firma electrónica, numeración autorizada, cobros, correo, recuperación real de contraseña, MFA, SSO, verificación de email ni datos personales. Sin RLS ni defensa contra un administrador directo de base de datos. Las cuentas comparten un único runtime de demo; no hay aislamiento físico por tenant.

Antes de tratar datos reales harían falta revisión independiente, HTTPS, cookies Secure, gestión/rotación de secretos, backups y restauración, observabilidad, retención y depuración de sesiones, limitación distribuida, política de proxy, pruebas de carga, controles de registro público y procesos legales/operativos. El administrador público puede modificar los datos de la empresa demo; no expongas esta instalación como servicio de producción ni almacenes datos reales.
