# Arquitectura

## Decisiones

Monorepo npm con dos aplicaciones y una base PostgreSQL. Next.js sirve la interfaz y hace proxy de `/api` a NestJS: el navegador mantiene un solo origen y cookies HttpOnly. NestJS organiza tres módulos de negocio. Prisma sirve como acceso tipado a datos; no se añade una abstracción de repositorio sin comportamiento adicional.

- **AuthModule**: registro atómico de organización/administrador, login, refresh rotativo, logout, perfil y recuperación simulada.
- **CatalogModule**: organización, usuarios, clientes, categorías, productos y consulta de auditoría.
- **BillingModule**: movimientos, borradores, pago/cancelación, reportes, CSV y dashboard. Cálculos monetarios puros y testeables.

Cada controlador documenta DTOs y operación, valida la entrada y delega al servicio. Los servicios aplican permisos, filtros de organización y reglas transaccionales. Las funciones compartidas resuelven acceso a base, locks y auditoría. En frontend, `Workspace` compone navegación y flujos, `Dashboard`, `Auth`, `Picker` y componentes de presentación; el cliente HTTP centraliza errores y renovación de sesión.

## Consistencia

Las mutaciones de catálogo, stock, usuarios y facturas toman un bloqueo `FOR UPDATE` en la organización. Así, dos pagos de la misma empresa no pueden descontar simultáneamente un stock leído previamente. Distintas empresas pueden operar en paralelo. Todo cambio de stock, movimiento y auditoría se confirma o revierte junto.

Crear un borrador no reserva inventario. Pagar valida disponibilidad actual; la transacción revierte por completo si falta cualquier producto. Cancelar un documento pagado genera movimientos inversos. Repetir el mismo estado no aplica movimientos duplicados. Una factura cancelada no se reabre. Los precios y nombres se copian a las líneas para preservar el historial.

Los valores monetarios se representan como enteros en centavos COP; el total se valida contra el límite de 2.000.000.000 de centavos. El impuesto se redondea una vez sobre el subtotal. La numeración interna se toma del contador de la organización bloqueada.

## Despliegue

Compose: `db` saludable → `init` migra y carga datos → `api` saludable → `web`. Una imagen compartida simplifica esta demo; incluye Prisma y tsx para inicialización. Se ejecuta con usuario `node`, no root. El frontend se construye con el destino interno `http://api:4000`.

El rate limiter por IP reside en memoria de una sola API. Una instalación distribuida necesitaría almacenamiento compartido y una política explícita de proxy de confianza. No se introducen esas piezas en esta demo compacta.
