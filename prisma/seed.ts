import { db } from '../apps/api/src/database';
import { AuthService } from '../apps/api/src/auth/auth.service';
import { CatalogService } from '../apps/api/src/catalog/catalog.service';
import { BillingService } from '../apps/api/src/billing/billing.service';
async function seed() {
  const existing = await db.user.findUnique({ where: { email: 'admin@novabill.demo' } });
  if (existing) {
    console.log('Seed ya aplicado; se conservan datos y contraseñas existentes.');
    return;
  }
  const auth = new AuthService();
  const catalog = new CatalogService();
  const billing = new BillingService();
  const session = await auth.register({
    email: 'admin@novabill.demo',
    password: 'Demo1234!',
    name: 'Alex Demo',
    organizationName: 'NovaTech Solutions Demo',
  });
  const actor = session.user;
  const cats = await Promise.all(
    ['Tecnología demo', 'Accesorios demo', 'Oficina demo'].map((name) =>
      catalog.saveCategory(actor, { name }),
    ),
  );
  const clients = [];
  for (const [name, email] of [
    ['Estudio Horizonte · Demo', 'horizonte@example.test'],
    ['Colectivo Prisma · Demo', 'prisma@example.test'],
    ['Atelier Nube · Demo', 'nube@example.test'],
    ['Laboratorio Verde · Demo', 'verde@example.test'],
    ['Taller Órbita · Demo', 'orbita@example.test'],
    ['Casa Modular · Demo', 'modular@example.test'],
  ])
    clients.push(
      await catalog.saveCustomer(actor, {
        name,
        email,
        phone: '000-000-0000',
        address: 'Dirección ficticia · Ciudad Demo',
      }),
    );
  const products = [];
  const entries: [string, string, number, number, number][] = [
    ['Teclado mecánico demo', 'TEC-001', 189000, 70, 0],
    ['Monitor 24 pulgadas demo', 'TEC-002', 890000, 35, 0],
    ['Mouse inalámbrico demo', 'ACC-001', 65000, 80, 1],
    ['Hub USB-C demo', 'ACC-002', 129000, 65, 1],
    ['Soporte de escritorio demo', 'OFI-001', 79000, 60, 2],
    ['Libreta de ideas demo', 'OFI-002', 24000, 90, 2],
    ['Cable USB-C demo', 'ACC-003', 28000, 3, 1],
    ['Base portátil demo', 'OFI-003', 115000, 2, 2],
  ];
  for (const [name, sku, price, stock, cat] of entries) {
    const p = await catalog.saveProduct(actor, {
      name,
      sku,
      priceCents: price * 100,
      categoryId: cats[cat].id,
      minStock: 5,
    });
    products.push(p);
    await billing.move(actor, {
      productId: p.id,
      type: 'IN',
      quantity: stock,
      reason: 'Inventario inicial ficticio para demostración',
    });
  }
  for (let i = 0; i < 26; i++) {
    const invoice = await billing.createInvoice(actor, {
      customerId: clients[i % clients.length].id,
      items: [{ productId: products[i % 6].id, quantity: 1 + (i % 3) }],
    });
    if (i < 23) await billing.changeStatus(actor, invoice.id, { status: 'PAID' });
    else if (i === 24) await billing.changeStatus(actor, invoice.id, { status: 'CANCELLED' });
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - (25 - i));
    day.setUTCHours(14, 0, 0, 0);
    await db.invoice.update({ where: { id: invoice.id }, data: { createdAt: day } });
  }
  await db.refreshToken.updateMany({
    where: { userId: actor.id },
    data: { revokedAt: new Date() },
  });
  console.log(
    'Seed completo: empresa, administrador, 6 clientes, 8 productos y 26 facturas ficticias.',
  );
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
