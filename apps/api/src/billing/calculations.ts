import { BadRequestException } from '@nestjs/common';
export function totals(lines: { quantity: number; unitPriceCents: number }[], taxRate: number) {
  const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  const totalCents = subtotalCents + taxCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 2000000000)
    throw new BadRequestException('El total supera el límite de la demo');
  return { subtotalCents, taxCents, totalCents };
}
export function stockBalance(current: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', quantity: number) {
  if (type !== 'ADJUSTMENT' && quantity === 0)
    throw new BadRequestException('La cantidad debe ser mayor que cero');
  const balance =
    type === 'ADJUSTMENT' ? quantity : current + (type === 'IN' ? quantity : -quantity);
  if (balance < 0 || balance > 1000000)
    throw new BadRequestException('Stock insuficiente o fuera del límite');
  return balance;
}
export const csvCell = (value: unknown) =>
  `"${String(value ?? '')
    .replace(/^[=+@\-\t\r]/, "'$&")
    .replaceAll('"', '""')}"`;
