import { csvCell, stockBalance, totals } from '../apps/api/src/billing/calculations';
import { digest, hashPassword, verifyPassword } from '../apps/api/src/security';
describe('Cálculos de negocio', () => {
  test('calcula importes en centavos y redondea una sola vez', () => {
    expect(totals([{ quantity: 3, unitPriceCents: 105 }], 19)).toEqual({
      subtotalCents: 315,
      taxCents: 60,
      totalCents: 375,
    });
  });
  test('impide desbordamientos del límite de importes', () => {
    expect(() => totals([{ quantity: 10000, unitPriceCents: 100000000 }], 19)).toThrow();
  });
  test('rechaza stock negativo', () => {
    expect(() => stockBalance(2, 'OUT', 3)).toThrow();
  });
  test('ajusta a saldo absoluto', () => {
    expect(stockBalance(10, 'ADJUSTMENT', 3)).toBe(3);
    expect(stockBalance(10, 'ADJUSTMENT', 0)).toBe(0);
  });
  test('entrada y salida requieren cantidad positiva', () => {
    expect(() => stockBalance(2, 'IN', 0)).toThrow();
    expect(stockBalance(2, 'IN', 3)).toBe(5);
  });
  test('neutraliza fórmulas CSV y escapa comillas', () => {
    expect(csvCell('=cmd()')).toBe('"\'=cmd()"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
});
describe('Contraseñas y tokens', () => {
  test('salt individual y verificación resistente a comparación temporal', async () => {
    const a = await hashPassword('Example123!');
    const b = await hashPassword('Example123!');
    expect(a).not.toBe(b);
    expect(await verifyPassword('Example123!', a)).toBe(true);
    expect(await verifyPassword('wrong', a)).toBe(false);
  });
  test('almacena digest irreversible de refresh', () => {
    expect(digest('token')).toHaveLength(64);
    expect(digest('token')).not.toBe(digest('other'));
  });
});
