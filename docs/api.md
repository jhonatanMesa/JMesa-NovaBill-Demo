# API REST

Swagger interactivo: `/api/docs`. OpenAPI JSON: `/api/docs-json`. Ambas rutas están disponibles a través de la web. Usa el mismo origen configurado en `APP_ORIGIN` para las mutaciones.

## Sesiones

`POST /api/auth/register`: `{ name, organizationName, email, password }`. Crea una empresa y su ADMIN. `POST /api/auth/login`: `{ email, password }`. Devuelven el perfil público y fijan cookies HttpOnly `nb_access` (15 minutos) y `nb_refresh` (7 días).

`POST /api/auth/refresh` consume y revoca el refresh actual, emite otro. `POST /api/auth/logout` revoca los refresh del usuario e incrementa su versión de sesión. `GET /api/auth/profile` devuelve id, empresa, nombre, email y rol. `POST /api/auth/recovery` recibe email y devuelve un aviso de simulación; no envía email ni modifica contraseñas.

Todas las mutaciones requieren `Origin: APP_ORIGIN` y `X-Novabill-Request: 1`. Swagger configura esta cabecera automáticamente. No se usa Bearer en localStorage ni se devuelve el password hash. Errores: `{ statusCode, message }`; `message` puede ser un array de errores de validación.

## Recursos

| Ruta bajo `/api`                         | Métodos                | Permisos                                             |
| ---------------------------------------- | ---------------------- | ---------------------------------------------------- |
| `organization`                           | GET, PATCH             | Todos leen; ADMIN configura                          |
| `users`, `users/:id`                     | GET/POST, PATCH        | ADMIN                                                |
| `customers`, `customers/:id`             | GET/POST, PATCH/DELETE | Todos leen; ADMIN/SELLER crean/editan; ADMIN archiva |
| `categories`, `categories/:id`           | GET/POST, PATCH        | Todos leen; ADMIN escribe                            |
| `products`, `products/:id`               | GET/POST, PATCH/DELETE | Todos leen; ADMIN escribe                            |
| `inventory`                              | GET, POST              | Todos leen; ADMIN escribe                            |
| `invoices`, `invoices/:id`               | GET/POST, GET          | Todos leen; ADMIN/SELLER crean                       |
| `invoices/:id/status`                    | PATCH                  | ADMIN/SELLER                                         |
| `dashboard`, `reports`, `reports/export` | GET                    | Todos                                                |
| `audit`                                  | GET                    | ADMIN                                                |
| `health`, `docs`, `docs-json`            | GET                    | Público                                              |

Listado: `page` (desde 1), `pageSize` (1–100, por defecto 20). Respuesta `{ items, total, page, pageSize }`. `search` busca clientes por nombre/email, productos por nombre/SKU y facturas por número. Categorías devuelve un array. Usuarios, inventario y auditoría no ofrecen búsqueda textual.

Reportes y facturas aceptan `from`, `to` (ISO, fecha final inclusiva cuando es YYYY-MM-DD), `customerId`, `productId`, `status`. Responden además `totalCents`, suma de documentos filtrados. El filtro de producto selecciona facturas completas. CSV limita a 5000 documentos y usa las mismas condiciones; no trunca silenciosamente reportes más grandes.

## Ejemplo de factura

```json
{
  "customerId": "UUID de un cliente de tu empresa",
  "items": [{ "productId": "UUID de un producto de tu empresa", "quantity": 2 }]
}
```

El backend obtiene precios, calcula subtotal e impuesto y crea `DRAFT`. No acepta `organizationId`, precios ni totales del cliente. Pagar: `PATCH /api/invoices/:id/status` con `{ "status": "PAID" }`. Cancelar: `{ "status": "CANCELLED" }`.

Movimientos: `{ productId, type, quantity, reason }`; `IN`/`OUT` indican unidades positivas y `ADJUSTMENT` el saldo objetivo (puede ser cero). La respuesta guarda `quantity` como delta con signo y `balance` como resultado.

## Errores y límites

- `400`: DTO inválido, propiedad adicional, stock insuficiente o transición inválida.
- `401`: sesión inválida, expirada o usuario desactivado.
- `403`: rol insuficiente u origen no permitido.
- `404`: entidad inexistente o perteneciente a otra empresa.
- `409`: duplicado de email, SKU, categoría u otra clave única.
- `429`: más de 45 solicitudes auth/minuto o 600 al resto por IP/minuto.
- `500`: mensaje genérico sin stack ni contenido de la base.

OpenAPI describe cuerpos, parámetros, tipos y resúmenes por operación. Consulta el esquema Prisma para el modelo completo de las respuestas de negocio.
