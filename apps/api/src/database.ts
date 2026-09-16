import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
export const db = new PrismaClient();
export type Transaction = Prisma.TransactionClient;
export type Actor = {
  id: string;
  organizationId: string;
  role: 'ADMIN' | 'SELLER' | 'VIEWER';
  name: string;
  email: string;
};
export const userSelect = {
  id: true,
  organizationId: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;
export async function transaction<T>(organizationId: string, run: (tx: Transaction) => Promise<T>) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${organizationId}::uuid FOR UPDATE`;
      return run(tx);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export function audit(tx: Transaction, actor: Actor, action: string, entityId: string) {
  return tx.auditLog.create({
    data: { organizationId: actor.organizationId, actorId: actor.id, action, entityId },
  });
}
