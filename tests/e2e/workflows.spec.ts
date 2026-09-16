import { test, expect } from '@playwright/test';
test('recorrido completo: registro, catálogo, inventario, factura, reporte y auditoría', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear una empresa demo', exact: true }).click();
  await page.getByLabel('Nombre ficticio', { exact: true }).fill('Alex E2E Demo');
  await page.getByLabel('Empresa ficticia', { exact: true }).fill('Empresa E2E Ficticia');
  await page.getByLabel('Correo electrónico').fill(`e2e-${Date.now()}@example.test`);
  await page.getByLabel('Contraseña', { exact: true }).fill('DemoTesting123!');
  await page.getByRole('button', { name: 'Crear empresa demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu negocio, en un vistazo' })).toBeVisible();
  await page.getByRole('button', { name: 'Categorías', exact: true }).click();
  await page.getByRole('button', { name: 'Crear registro' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Categoría E2E');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados correctamente.')).toBeVisible();
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await page.getByRole('button', { name: 'Crear registro' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Producto E2E');
  await page.getByLabel('SKU', { exact: true }).fill('E2E-001');
  await page.getByLabel('Categoría', { exact: true }).selectOption({ label: 'Categoría E2E' });
  await page.getByLabel('Precio (COP)', { exact: true }).fill('15000');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Producto E2E', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Crear registro' }).click();
  await page.getByLabel('Nombre ficticio', { exact: true }).fill('Cliente E2E');
  await page.getByLabel('Correo', { exact: true }).fill('cliente-e2e@example.test');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cliente E2E', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Inventario', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  await page
    .locator('select[name="productId"]')
    .selectOption({ label: 'Producto E2E · E2E-001 · Stock: 0' });
  await page.getByLabel('Cantidad / saldo objetivo').fill('10');
  await page.getByLabel('Motivo').fill('Entrada ficticia E2E');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Entrada ficticia E2E')).toBeVisible();
  await page.getByRole('button', { name: 'Facturas demo', exact: true }).click();
  await page.getByRole('button', { name: 'Crear factura demo' }).click();
  await page.locator('select[name="customerId"]').selectOption({ label: 'Cliente E2E' });
  await page
    .locator('select[name="product0"]')
    .selectOption({ label: 'Producto E2E · E2E-001 · Stock: 10' });
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await page.getByRole('button', { name: 'Ver detalle' }).click();
  await expect(page.getByRole('dialog').getByText('$ 35.700', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Marcar pagada' }).click();
  await expect(page.getByText('Pagada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await expect(page.getByText('8 uds.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reportes', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV demo' }).click();
  expect((await download).suggestedFilename()).toBe('novabill-reporte-demo.csv');
  await page.getByRole('button', { name: 'Auditoría', exact: true }).click();
  await expect(page.getByText('INVOICE_PAID', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Entrar a la demo' })).toBeVisible();
});
test('demo precargada, detalle, búsqueda y navegación móvil sin desbordamiento', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar a la demo' }).click();
  await expect(page.getByRole('heading', { name: 'Así se mueven tus ventas' })).toBeVisible();
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByLabel('Buscar registros').fill('Horizonte');
  await expect(page.getByText('Estudio Horizonte · Demo', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Resumen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu negocio, en un vistazo' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile-dashboard.png', fullPage: true });
});
