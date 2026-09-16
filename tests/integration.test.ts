import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import request, { Response } from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../apps/api/src/app';
import { db } from '../apps/api/src/database';
const id = randomUUID().slice(0, 8);
const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
let app: INestApplication;
let cookieA: string[];
let cookieB: string[];
let orgB: string;
let category: string;
let product: string;
let customer: string;
let invoice: string;
const cookies = (res: Response) => res.headers['set-cookie'] as unknown as string[];
function call(method: 'get' | 'post' | 'patch' | 'delete', path: string, cookie = cookieA) {
  return request(app.getHttpServer())
    [method](`/api/${path}`)
    .set('Origin', origin)
    .set('X-Novabill-Request', '1')
    .set('Cookie', cookie ?? []);
}
beforeAll(async () => {
  app = await createApp();
  const a = await call('post', 'auth/register', [])
    .send({
      email: `a-${id}@example.test`,
      password: 'DemoTesting123!',
      name: 'Admin Ficticio A',
      organizationName: 'Empresa Ficticia A',
    })
    .expect(201);
  cookieA = cookies(a);
  const b = await call('post', 'auth/register', [])
    .send({
      email: `b-${id}@example.test`,
      password: 'DemoTesting123!',
      name: 'Admin Ficticio B',
      organizationName: 'Empresa Ficticia B',
    })
    .expect(201);
  cookieB = cookies(b);
  orgB = b.body.organizationId;
});
afterAll(async () => {
  await app?.close();
  await db.$disconnect();
});
test('rechaza endpoints privados y origen no autorizado', async () => {
  await call('get', 'products', []).expect(401);
  await request(app.getHttpServer())
    .post('/api/customers')
    .set('Cookie', cookieA)
    .send({})
    .expect(403);
});
test('Swagger y health están disponibles', async () => {
  await call('get', 'health').expect(200);
  const res = await call('get', 'docs-json').expect(200);
  expect(Object.keys(res.body.paths).length).toBeGreaterThan(20);
});
test('valida DTO y rechaza campos controlados por el servidor', async () => {
  await call('post', 'customers').send({ name: 'AB', email: 'no-email' }).expect(400);
  await call('post', 'customers')
    .send({ name: 'Falso', email: 'x@example.test', organizationId: orgB })
    .expect(400);
});
test('crea categoría, producto y cliente con auditoría', async () => {
  category = (
    await call('post', 'categories')
      .send({ name: `Demo-${id}` })
      .expect(201)
  ).body.id;
  product = (
    await call('post', 'products')
      .send({
        name: 'Producto ficticio',
        sku: `TEST-${id}`,
        priceCents: 10000,
        categoryId: category,
        minStock: 2,
      })
      .expect(201)
  ).body.id;
  customer = (
    await call('post', 'customers')
      .send({ name: 'Cliente ficticio', email: 'cliente@example.test' })
      .expect(201)
  ).body.id;
  const log = await call('get', 'audit').expect(200);
  expect(log.body.items.some((i: { action: string }) => i.action === 'PRODUCT_CREATED')).toBe(true);
});
test('aislamiento de lectura, escritura y relaciones entre empresas', async () => {
  const products = await call('get', 'products', cookieB).expect(200);
  expect(products.body.total).toBe(0);
  await call('patch', `products/${product}`, cookieB).send({ name: 'Ataque' }).expect(404);
  await call('delete', `customers/${customer}`, cookieB).expect(404);
  await call('post', 'products', cookieB)
    .send({ name: 'Intrusión', sku: 'BAD', categoryId: category, priceCents: 100 })
    .expect(404);
  await call('post', 'inventory', cookieB)
    .send({ productId: product, type: 'IN', quantity: 5, reason: 'Intento cruzado' })
    .expect(404);
  await call('post', 'invoices', cookieB)
    .send({ customerId: customer, items: [{ productId: product, quantity: 1 }] })
    .expect(404);
  const reports = await call('get', `reports?customerId=${customer}`, cookieB).expect(200);
  expect(reports.body.total).toBe(0);
});
test('restricciones de BD bloquean referencias cruzadas aunque se omita la capa de servicio', async () => {
  await expect(
    db.product.create({
      data: {
        organizationId: orgB,
        categoryId: category,
        name: 'Intento BD',
        sku: 'BAD-DB',
        priceCents: 100,
      },
    }),
  ).rejects.toMatchObject({ code: 'P2003' });
});
test('movimientos preservan historial y evitan stock negativo', async () => {
  await call('post', 'inventory')
    .send({ productId: product, type: 'IN', quantity: 3, reason: 'Entrada de prueba' })
    .expect(201);
  await call('post', 'inventory')
    .send({ productId: product, type: 'OUT', quantity: 4, reason: 'Salida excesiva' })
    .expect(400);
  const p = await db.product.findUniqueOrThrow({ where: { id: product } });
  expect(p.stock).toBe(3);
});
test('facturas calculadas por servidor y pago atómico', async () => {
  const res = await call('post', 'invoices')
    .send({ customerId: customer, items: [{ productId: product, quantity: 2 }] })
    .expect(201);
  invoice = res.body.id;
  expect(res.body.totalCents).toBe(23800);
  expect(res.body.status).toBe('DRAFT');
  await call('get', `invoices/${invoice}`, cookieB).expect(404);
  await call('patch', `invoices/${invoice}/status`).send({ status: 'PAID' }).expect(200);
  await call('patch', `invoices/${invoice}/status`).send({ status: 'PAID' }).expect(200);
  expect((await db.product.findUniqueOrThrow({ where: { id: product } })).stock).toBe(1);
});
test('cancelar revierte stock una sola vez y no permite reabrir', async () => {
  await call('patch', `invoices/${invoice}/status`).send({ status: 'CANCELLED' }).expect(200);
  await call('patch', `invoices/${invoice}/status`).send({ status: 'CANCELLED' }).expect(200);
  expect((await db.product.findUniqueOrThrow({ where: { id: product } })).stock).toBe(3);
  await call('patch', `invoices/${invoice}/status`).send({ status: 'PAID' }).expect(400);
});
test('dos pagos concurrentes no pueden sobre-vender', async () => {
  const payload = { customerId: customer, items: [{ productId: product, quantity: 2 }] };
  const a = await call('post', 'invoices').send(payload).expect(201);
  const b = await call('post', 'invoices').send(payload).expect(201);
  const results = await Promise.all(
    [a, b].map((i) => call('patch', `invoices/${i.body.id}/status`).send({ status: 'PAID' })),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  expect((await db.product.findUniqueOrThrow({ where: { id: product } })).stock).toBe(1);
});
test('reportes filtran y exportan CSV demo', async () => {
  const r = await call(
    'get',
    `reports?status=CANCELLED&customerId=${customer}&productId=${product}`,
  ).expect(200);
  expect(r.body.total).toBe(1);
  expect(r.body.items[0].id).toBe(invoice);
  const csv = await call('get', 'reports/export?status=CANCELLED').expect(200);
  expect(csv.text).toContain('Documento DEMO');
  await call('get', 'reports?from=2026-12-01&to=2026-01-01').expect(400);
});
test('paginación y búsqueda', async () => {
  const r = await call('get', 'customers?page=1&pageSize=1&search=ficticio').expect(200);
  expect(r.body.items).toHaveLength(1);
  expect(r.body.pageSize).toBe(1);
});
test('RBAC VIEWER y SELLER, y desactivación con revocación', async () => {
  for (const role of ['VIEWER', 'SELLER']) {
    const email = `${role}-${id}@example.test`;
    const u = await call('post', 'users')
      .send({ name: 'Usuario ficticio', email, password: 'DemoTesting123!', role })
      .expect(201);
    expect(u.body.passwordHash).toBeUndefined();
    const login = await call('post', 'auth/login', [])
      .send({ email, password: 'DemoTesting123!' })
      .expect(201);
    const c = cookies(login);
    await call('get', 'products', c).expect(200);
    await call('get', 'users', c).expect(403);
    await call('get', 'audit', c).expect(403);
    await call('post', 'products', c)
      .send({ name: 'Prueba', sku: 'BAD', categoryId: category, priceCents: 100 })
      .expect(403);
    await call('post', 'customers', c)
      .send({ name: 'Cliente rol', email: 'rol@example.test' })
      .expect(role === 'SELLER' ? 201 : 403);
    await call('patch', `users/${u.body.id}`).send({ active: false }).expect(200);
    await call('get', 'products', c).expect(401);
    await call('post', 'auth/refresh', c).expect(401);
  }
});
test('soft delete conserva facturas e impide reutilizar cliente archivado', async () => {
  await call('delete', `customers/${customer}`).expect(200);
  expect((await call('get', 'customers?search=ficticio')).body.total).toBe(0);
  await call('get', `invoices/${invoice}`).expect(200);
  await call('post', 'invoices')
    .send({ customerId: customer, items: [{ productId: product, quantity: 1 }] })
    .expect(404);
});
test('refresh rota; logout revoca access y refresh', async () => {
  const res = await call('post', 'auth/refresh').expect(201);
  await call('post', 'auth/refresh').expect(401);
  cookieA = cookies(res);
  await call('get', 'auth/profile').expect(200);
  await call('post', 'auth/logout').expect(201);
  await call('get', 'products').expect(401);
  await call('post', 'auth/refresh').expect(401);
});
test('rate limiting devuelve 429', async () => {
  let limited = false;
  for (let i = 0; i < 50; i++) {
    const r = await call('post', 'auth/recovery', []).send({ email: 'ficticio@example.test' });
    if (r.status === 429) {
      limited = true;
      break;
    }
  }
  expect(limited).toBe(true);
});
