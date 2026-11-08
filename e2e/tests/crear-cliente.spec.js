import { test, expect } from '@playwright/test';

test('Reto 1: crear un cliente y verificar que aparece en la lista', async ({ page }) => {
  const identificador = require('node:crypto').randomUUID();
  const nombreCliente = `Camila Soto Prueba ${identificador}`;
  const correoCliente = `cliente-${identificador}@example.com`;

  console.log(`Cliente de esta ejecución: ${nombreCliente}`);
  await page.goto('http://localhost:3351/login');
  await page.getByTestId('input-nombre-usuario').click();
  await page.getByTestId('input-nombre-usuario').fill('admin');
  await page.getByTestId('input-password').click();
  await page.getByTestId('input-password').fill('admin');
  await page.getByTestId('input-password').press('Enter');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('main')).toBeVisible();
  const menu = page.getByTestId('button-layout-menu');
  if (await menu.isVisible()) {
    await menu.click();
  }
  await page.getByTestId('link-nav-clientes').click();
  await page.getByRole('tab', { name: 'Crear Cliente' }).click();
  await page.getByRole('textbox', { name: 'RUT' }).click();
  await page.getByRole('textbox', { name: 'RUT' }).fill('11.111.111-1');
  await page.getByRole('textbox', { name: 'Nombre completo' }).fill(nombreCliente);
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).click();
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).fill('C');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).fill('Cliente de ');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).fill('Cliente de P');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Nombre de fantasía' }).fill('Cliente de Prueba');
  await page.getByRole('button', { name: 'Open' }).first().click();
  await page.getByRole('option', { name: 'Asesorías Empresariales' }).click();
  await page.getByRole('textbox', { name: 'Nombre del representante' }).fill(nombreCliente);
  await page.getByRole('button', { name: 'Open' }).nth(1).click();
  await page.getByRole('option', { name: 'Administrador' }).click();
  await page.getByRole('textbox', { name: 'Correo del representante' }).click();
  await page.getByRole('textbox', { name: 'Correo del representante' }).fill('representante@example.com');
  await page.getByRole('textbox', { name: 'Teléfono del representante' }).fill('000000000');
  await page.getByRole('textbox', { name: 'Relación' }).click();
  await page.getByRole('textbox', { name: 'Relación' }).fill('La misma persona titular');
  await page.getByRole('textbox', { name: 'Calle' }).click();
  await page.getByRole('textbox', { name: 'Calle' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Calle' }).fill('C');
  await page.getByRole('textbox', { name: 'Calle' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Calle' }).fill('Calle de ');
  await page.getByRole('textbox', { name: 'Calle' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Calle' }).fill('Calle de P');
  await page.getByRole('textbox', { name: 'Calle' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Calle' }).fill('Calle de Prueba');
  await page.getByRole('textbox', { name: 'Número' }).click();
  await page.getByRole('textbox', { name: 'Número' }).fill('123');
  await page.getByRole('textbox', { name: 'Ciudad' }).click();
  await page.getByRole('textbox', { name: 'Ciudad' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Ciudad' }).fill('L');
  await page.getByRole('textbox', { name: 'Ciudad' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Ciudad' }).fill('Lota');
  await page.getByRole('button', { name: 'Open' }).nth(2).click();
  await page.getByRole('option', { name: 'Región del Biobío' }).click();
  await page.getByRole('textbox', { name: 'Sitio web' }).click();
  await page.getByRole('textbox', { name: 'Sitio web' }).fill('https://example.com');
  await page.getByRole('textbox', { name: 'Teléfono corporativo' }).click();
  await page.getByRole('textbox', { name: 'Teléfono corporativo' }).fill('000000000');
  await page.getByRole('textbox', { name: 'Correo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Correo', exact: true }).fill(correoCliente);
  await page.getByRole('textbox', { name: 'Teléfono', exact: true }).click();
  await page.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('000000000');
  await page.locator('.MuiFormControl-root').filter({ hasText: 'Método de pago' }).getByRole('combobox').click();
  await page.getByRole('option', { name: 'Transferencia' }).click();
  await page.getByRole('spinbutton', { name: 'Día de pago' }).click();
  await page.getByRole('spinbutton', { name: 'Día de pago' }).fill('15');
  await page.locator('.MuiFormControl-root').filter({ hasText: 'Moneda' }).getByRole('combobox').click();
  await page.getByRole('option', { name: 'CLP (Peso Chileno)' }).click();
  await page.getByRole('button', { name: 'Open' }).nth(3).click();
  await page.getByRole('option', { name: 'Banco del Estado de Chile (' }).click();
  await page.getByRole('textbox', { name: 'Nº de cuenta bancaria' }).fill('0000000000');
  await page.getByRole('textbox', { name: 'Titular de la cuenta' }).fill(nombreCliente);
  await page.getByRole('button', { name: 'Crear Cliente' }).click();
  await expect(page.getByRole('tab', { name: 'Listar Clientes' }))
    .toHaveAttribute('aria-selected', 'true');

  await expect(page.getByRole('table').getByText(nombreCliente, {
    exact: true
  })).toBeVisible();
});



