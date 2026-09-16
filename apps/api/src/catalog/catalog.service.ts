import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, audit, db, transaction, userSelect } from '../database';
import {
  CategoryDto,
  CustomerDto,
  CustomerUpdateDto,
  ListDto,
  OrganizationDto,
  ProductDto,
  ProductUpdateDto,
  UserDto,
  UserUpdateDto,
} from '../dto';
import { hashPassword, requireRole } from '../security';
export const pageArgs = (q: ListDto) => ({ skip: (q.page - 1) * q.pageSize, take: q.pageSize });
export function found<T>(value: T | null): T {
  if (!value) throw new NotFoundException('Registro no encontrado');
  return value;
}
@Injectable()
export class CatalogService {
  async customers(actor: Actor, q: ListDto) {
    const where: Prisma.CustomerWhereInput = {
      organizationId: actor.organizationId,
      deletedAt: null,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await db.$transaction([
      db.customer.findMany({ where, ...pageArgs(q), orderBy: { createdAt: 'desc' } }),
      db.customer.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async saveCustomer(actor: Actor, input: CustomerDto | CustomerUpdateDto, id?: string) {
    requireRole(actor, 'ADMIN', 'SELLER');
    return transaction(actor.organizationId, async (tx) => {
      if (id)
        found(
          await tx.customer.findFirst({
            where: { id, organizationId: actor.organizationId, deletedAt: null },
          }),
        );
      const item = id
        ? await tx.customer.update({ where: { id }, data: input })
        : await tx.customer.create({
            data: { ...(input as CustomerDto), organizationId: actor.organizationId },
          });
      await audit(tx, actor, id ? 'CUSTOMER_UPDATED' : 'CUSTOMER_CREATED', item.id);
      return item;
    });
  }
  async archiveCustomer(actor: Actor, id: string) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      found(
        await tx.customer.findFirst({
          where: { id, organizationId: actor.organizationId, deletedAt: null },
        }),
      );
      const item = await tx.customer.update({ where: { id }, data: { deletedAt: new Date() } });
      await audit(tx, actor, 'CUSTOMER_ARCHIVED', id);
      return item;
    });
  }
  async categories(actor: Actor) {
    return db.category.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: 'asc' },
    });
  }
  async saveCategory(actor: Actor, input: CategoryDto, id?: string) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      if (id)
        found(await tx.category.findFirst({ where: { id, organizationId: actor.organizationId } }));
      const item = id
        ? await tx.category.update({ where: { id }, data: input })
        : await tx.category.create({ data: { ...input, organizationId: actor.organizationId } });
      await audit(tx, actor, id ? 'CATEGORY_UPDATED' : 'CATEGORY_CREATED', item.id);
      return item;
    });
  }
  async products(actor: Actor, q: ListDto) {
    const where: Prisma.ProductWhereInput = {
      organizationId: actor.organizationId,
      deletedAt: null,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { sku: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await db.$transaction([
      db.product.findMany({
        where,
        ...pageArgs(q),
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.product.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async saveProduct(actor: Actor, input: ProductDto | ProductUpdateDto, id?: string) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      if (id)
        found(
          await tx.product.findFirst({
            where: { id, organizationId: actor.organizationId, deletedAt: null },
          }),
        );
      if (input.categoryId)
        found(
          await tx.category.findFirst({
            where: { id: input.categoryId, organizationId: actor.organizationId },
          }),
        );
      const item = id
        ? await tx.product.update({ where: { id }, data: input })
        : await tx.product.create({
            data: { ...(input as ProductDto), organizationId: actor.organizationId },
          });
      await audit(tx, actor, id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED', item.id);
      return item;
    });
  }
  async archiveProduct(actor: Actor, id: string) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      const item = found(
        await tx.product.findFirst({
          where: { id, organizationId: actor.organizationId, deletedAt: null },
        }),
      );
      if (item.stock !== 0)
        throw new BadRequestException('Ajusta el stock a cero antes de archivar');
      const result = await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), active: false },
      });
      await audit(tx, actor, 'PRODUCT_ARCHIVED', id);
      return result;
    });
  }
  organization(actor: Actor) {
    return db.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
  }
  async updateOrganization(actor: Actor, dto: OrganizationDto) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      const org = await tx.organization.update({ where: { id: actor.organizationId }, data: dto });
      await audit(tx, actor, 'ORGANIZATION_UPDATED', org.id);
      return org;
    });
  }
  async users(actor: Actor, q: ListDto) {
    requireRole(actor, 'ADMIN');
    const where = { organizationId: actor.organizationId };
    const [items, total] = await db.$transaction([
      db.user.findMany({ where, select: userSelect, ...pageArgs(q), orderBy: { name: 'asc' } }),
      db.user.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async createUser(actor: Actor, dto: UserDto) {
    requireRole(actor, 'ADMIN');
    const passwordHash = await hashPassword(dto.password);
    return transaction(actor.organizationId, async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId: actor.organizationId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          role: dto.role,
          passwordHash,
        },
        select: userSelect,
      });
      await audit(tx, actor, 'USER_CREATED', user.id);
      return user;
    });
  }
  async updateUser(actor: Actor, id: string, dto: UserUpdateDto) {
    requireRole(actor, 'ADMIN');
    return transaction(actor.organizationId, async (tx) => {
      found(await tx.user.findFirst({ where: { id, organizationId: actor.organizationId } }));
      if (id === actor.id && (dto.active === false || (dto.role && dto.role !== 'ADMIN')))
        throw new BadRequestException('No puedes desactivar o quitar el rol de tu propia cuenta');
      const user = await tx.user.update({
        where: { id },
        data: { ...dto, sessionVersion: { increment: 1 } },
        select: userSelect,
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await audit(tx, actor, 'USER_UPDATED', id);
      return user;
    });
  }
  async audits(actor: Actor, q: ListDto) {
    requireRole(actor, 'ADMIN');
    const where = { organizationId: actor.organizationId };
    const [items, total] = await db.$transaction([
      db.auditLog.findMany({ where, ...pageArgs(q), orderBy: { createdAt: 'desc' } }),
      db.auditLog.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
}
