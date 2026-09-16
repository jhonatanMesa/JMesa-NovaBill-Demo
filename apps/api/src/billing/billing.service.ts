import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, audit, db, transaction } from '../database';
import { InvoiceDto, InvoiceStatusDto, ListDto, MovementDto, ReportDto } from '../dto';
import { requireRole } from '../security';
import { found, pageArgs } from '../catalog/catalog.service';
import { csvCell, stockBalance, totals } from './calculations';
@Injectable()
export class BillingService {
  async move(actor: Actor, dto: MovementDto) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      const product = found(
        await tx.product.findFirst({
          where: {
            id: dto.productId,
            organizationId: actor.organizationId,
            deletedAt: null,
            active: true,
          },
        }),
      );
      const balance = stockBalance(product.stock, dto.type, dto.quantity);
      await tx.product.update({ where: { id: product.id }, data: { stock: balance } });
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId: actor.organizationId,
          productId: product.id,
          type: dto.type,
          quantity: balance - product.stock,
          balance,
          reason: dto.reason,
          actorId: actor.id,
        },
      });
      await audit(tx, actor, 'INVENTORY_MOVEMENT', movement.id);
      return movement;
    });
  }
  async movements(actor: Actor, q: ListDto) {
    const where = { organizationId: actor.organizationId };
    const [items, total] = await db.$transaction([
      db.inventoryMovement.findMany({
        where,
        include: { product: true },
        ...pageArgs(q),
        orderBy: { createdAt: 'desc' },
      }),
      db.inventoryMovement.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async createInvoice(actor: Actor, dto: InvoiceDto) {
    requireRole(actor, 'ADMIN', 'SELLER');
    if (new Set(dto.items.map((i) => i.productId)).size !== dto.items.length)
      throw new BadRequestException('No repitas productos en una factura');
    return transaction(actor.organizationId, async (tx) => {
      found(
        await tx.customer.findFirst({
          where: { id: dto.customerId, organizationId: actor.organizationId, deletedAt: null },
        }),
      );
      const org = await tx.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
      const lines = await Promise.all(
        dto.items.map(async (item) => {
          const product = found(
            await tx.product.findFirst({
              where: {
                id: item.productId,
                organizationId: actor.organizationId,
                active: true,
                deletedAt: null,
              },
            }),
          );
          return {
            productId: product.id,
            name: product.name,
            quantity: item.quantity,
            unitPriceCents: product.priceCents,
            lineTotalCents: product.priceCents * item.quantity,
          };
        }),
      );
      const sums = totals(lines, org.taxRate);
      const invoice = await tx.invoice.create({
        data: {
          organizationId: actor.organizationId,
          customerId: dto.customerId,
          number: `DEMO-${String(org.nextInvoice).padStart(5, '0')}`,
          taxRate: org.taxRate,
          ...sums,
        },
      });
      await tx.invoiceItem.createMany({
        data: lines.map((line) => ({
          ...line,
          organizationId: actor.organizationId,
          invoiceId: invoice.id,
        })),
      });
      await tx.organization.update({
        where: { id: actor.organizationId },
        data: { nextInvoice: { increment: 1 } },
      });
      await audit(tx, actor, 'INVOICE_CREATED', invoice.id);
      return tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { items: true, customer: true },
      });
    });
  }
  async changeStatus(actor: Actor, id: string, dto: InvoiceStatusDto) {
    requireRole(actor, 'ADMIN', 'SELLER');
    return transaction(actor.organizationId, async (tx) => {
      const invoice = found(
        await tx.invoice.findFirst({
          where: { id, organizationId: actor.organizationId },
          include: { items: true },
        }),
      );
      if (invoice.status === dto.status) return invoice;
      if (invoice.status === 'CANCELLED')
        throw new BadRequestException('Una factura cancelada no puede reabrirse');
      if (dto.status === 'PAID' || invoice.status === 'PAID') {
        for (const line of invoice.items) {
          const product = found(
            await tx.product.findFirst({
              where: { id: line.productId, organizationId: actor.organizationId },
            }),
          );
          if (dto.status === 'PAID' && (!product.active || product.deletedAt))
            throw new BadRequestException('Hay productos inactivos en la factura');
          const delta = dto.status === 'PAID' ? -line.quantity : line.quantity;
          const balance = product.stock + delta;
          if (balance < 0 || balance > 1000000)
            throw new BadRequestException(`Stock no disponible: ${product.name}`);
          await tx.product.update({ where: { id: product.id }, data: { stock: balance } });
          await tx.inventoryMovement.create({
            data: {
              organizationId: actor.organizationId,
              productId: product.id,
              type: delta < 0 ? 'SALE' : 'REVERSAL',
              quantity: delta,
              balance,
              reason: invoice.number,
              actorId: actor.id,
            },
          });
        }
      }
      const result = await tx.invoice.update({ where: { id }, data: { status: dto.status } });
      await audit(tx, actor, `INVOICE_${dto.status}`, id);
      return result;
    });
  }
  where(actor: Actor, q: ReportDto): Prisma.InvoiceWhereInput {
    if (q.from && q.to && new Date(q.from) > new Date(q.to))
      throw new BadRequestException('La fecha inicial debe preceder a la final');
    const end = q.to ? new Date(q.to) : undefined;
    if (end && q.to?.length === 10) end.setUTCHours(23, 59, 59, 999);
    return {
      organizationId: actor.organizationId,
      customerId: q.customerId,
      status: q.status,
      ...(q.productId
        ? { items: { some: { organizationId: actor.organizationId, productId: q.productId } } }
        : {}),
      ...(q.from || q.to
        ? { createdAt: { gte: q.from ? new Date(q.from) : undefined, lte: end } }
        : {}),
      ...(q.search ? { number: { contains: q.search, mode: 'insensitive' } } : {}),
    };
  }
  async invoices(actor: Actor, q: ReportDto) {
    const where = this.where(actor, q);
    const [items, total, sums] = await db.$transaction([
      db.invoice.findMany({
        where,
        ...pageArgs(q),
        include: { customer: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.count({ where }),
      db.invoice.aggregate({ where, _sum: { totalCents: true } }),
    ]);
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalCents: sums._sum.totalCents ?? 0,
    };
  }
  async invoice(actor: Actor, id: string) {
    return found(
      await db.invoice.findFirst({
        where: { id, organizationId: actor.organizationId },
        include: { items: true, customer: true },
      }),
    );
  }
  async export(actor: Actor, q: ReportDto) {
    const where = this.where(actor, q);
    const count = await db.invoice.count({ where });
    if (count > 5000)
      throw new BadRequestException('Acota los filtros a 5000 facturas para exportar');
    const items = await db.invoice.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    return (
      '\ufeff' +
      [
        [
          'Documento DEMO',
          'Cliente ficticio',
          'Estado',
          'Fecha',
          'Subtotal COP',
          'Impuesto simulado COP',
          'Total COP',
        ],
        ...items.map((i) => [
          i.number,
          i.customer.name,
          i.status,
          i.createdAt.toISOString(),
          i.subtotalCents / 100,
          i.taxCents / 100,
          i.totalCents / 100,
        ]),
      ]
        .map((row) => row.map(csvCell).join(','))
        .join('\r\n')
    );
  }
  async dashboard(actor: Actor) {
    const org = actor.organizationId;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);
    const [paid, invoiceCount, customerCount, productCount, lowStock, recent, top] =
      await db.$transaction([
        db.invoice.findMany({
          where: { organizationId: org, status: 'PAID', createdAt: { gte: since } },
          select: { createdAt: true, totalCents: true },
        }),
        db.invoice.count({ where: { organizationId: org, createdAt: { gte: since } } }),
        db.customer.count({ where: { organizationId: org, deletedAt: null } }),
        db.product.count({ where: { organizationId: org, deletedAt: null } }),
        db.product.findMany({
          where: {
            organizationId: org,
            deletedAt: null,
            active: true,
            stock: { lte: db.product.fields.minStock },
          },
          orderBy: { stock: 'asc' },
          take: 10,
        }),
        db.invoice.findMany({
          where: { organizationId: org },
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        db.invoiceItem.groupBy({
          by: ['productId', 'name'],
          where: { organizationId: org, invoice: { status: 'PAID', createdAt: { gte: since } } },
          _sum: { quantity: true, lineTotalCents: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
      ]);
    const chart = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      return {
        date,
        totalCents: paid
          .filter((p) => p.createdAt.toISOString().slice(0, 10) === date)
          .reduce((sum, p) => sum + p.totalCents, 0),
      };
    });
    return {
      salesCents: paid.reduce((s, p) => s + p.totalCents, 0),
      invoiceCount,
      customerCount,
      productCount,
      lowStock,
      recent,
      top,
      chart,
    };
  }
}
