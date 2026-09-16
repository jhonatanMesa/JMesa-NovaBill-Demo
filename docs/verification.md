# Verificación de la entrega

Validación local realizada el 16 de septiembre de 2026 sobre Windows, Node.js 24.12 y PostgreSQL 18 en un clúster independiente. CI y Docker utilizan Node.js 22 y PostgreSQL 17. La configuración y la base locales están excluidas de Git.

| Comprobación                  | Resultado local                                                     |
| ----------------------------- | ------------------------------------------------------------------- |
| Dependencias                  | Instaladas con lockfile; `npm audit`: 0 vulnerabilidades detectadas |
| ESLint                        | Correcto, sin errores                                               |
| TypeScript                    | API, web, tests y seed: correcto                                    |
| Prettier                      | Correcto                                                            |
| Jest unitarias                | 8/8                                                                 |
| Jest + Supertest + PostgreSQL | 16/16                                                               |
| Playwright Chromium           | 2/2 recorridos E2E                                                  |
| Build                         | NestJS y Next.js de producción correctos                            |
| Migraciones                   | Dos migraciones aplicadas correctamente                             |
| Seed                          | Carga inicial correcta; repetición sin modificar datos              |
| Revisión Git                  | `.env`, dependencias, builds y herramientas locales excluidos       |

## Qué cubren las pruebas

Unitarias: importes en centavos, redondeo, límites, stock negativo, ajuste absoluto, fórmulas CSV, salt y verificación de contraseñas, digest de refresh.

Integración: autenticación, origen, Swagger/health, rechazo de campos adicionales, catálogos/auditoría, lectura y escritura entre empresas, claves foráneas compuestas, movimientos, pago/cancelación idempotentes, dos pagos concurrentes sobre stock limitado, filtros/CSV, paginación, roles, desactivación, soft delete, rotación/logout y rate limiting.

E2E: registro de empresa, categoría, producto, cliente, entrada de stock, factura, revisión del total, pago, saldo posterior, descarga CSV, auditoría y logout. Segundo recorrido: ingreso demo, dashboard, búsqueda de clientes y navegación móvil sin desbordamiento horizontal.

Las capturas del README provienen del navegador ejecutando la aplicación; no son maquetas. Los tests no sustituyen una revisión independiente de seguridad, accesibilidad completa o carga.

## Docker y CI

Este equipo local no tiene Docker instalado. La validación ejecutable de Compose se realiza en [GitHub Actions](https://github.com/jhonatanMesa/JMesa-NovaBill-Demo/actions/workflows/ci.yml): configuración, construcción de imagen, migraciones/seed dentro de contenedores, healthchecks y Playwright contra la web Docker. El resultado de la última ejecución y su commit son la referencia para esa comprobación. No se equipara el build local con una prueba Docker.

El workflow conserva reportes y trazas si una prueba falla. Cada push a `main` vuelve a ejecutar la suite completa.
