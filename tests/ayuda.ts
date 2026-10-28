import { expect, type Page } from '@playwright/test'

// Un miércoles lectivo a 5ª hora, en hora de Madrid
export const AHORA = new Date('2026-10-07T12:50:00+02:00')

export function vigilarErrores(page: Page) {
  const errores: string[] = []
  page.on('pageerror', e => { if (!/Fallo de prueba/.test(e.message)) errores.push(e.message) })
  return errores
}

export async function empezar(page: Page, hora = AHORA) {
  await page.clock.install({ time: hora })
  page.on('dialog', d => d.accept())
  await page.goto('/')
  // La app mira primero si hay servidor del centro; se espera a la pantalla de entrada
  await page.locator('#gd-otro-profe').waitFor()
  const empezarBtn = page.getByRole('button', { name: /Empezar/ })
  if (await empezarBtn.count()) await empezarBtn.first().click()
}

// Al entrar se abre el Escritorio; «modulo» lleva después al módulo con el que trabaja la prueba
export async function entrar(page: Page, texto: string | RegExp, modulo?: RegExp) {
  await page.getByRole('button').filter({ hasText: texto }).first().click()
  await expect(page.getByRole('button', { name: /Salir/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  if (modulo) await page.locator('.gd-modulos button').filter({ hasText: modulo }).first().click()
}
export const comoProfe = (page: Page) => entrar(page, 'poner partes, guardias', /^Partes/)
export const comoJefatura = (page: Page) => entrar(page, 'Ana Jiménez · guardias', /Partes & Alumnos/)
export const comoAdmin = (page: Page) => entrar(page, 'Beatriz Navarro · compras', /^Centro/)
export const comoSecretaria = comoAdmin
export const comoTic = (page: Page) => entrar(page, 'Elena Vega · averías', /Material del centro/)
export async function salir(page: Page) {
  await page.getByRole('button', { name: /Salir/ }).first().click()
  await expect(page.locator('#gd-otro-profe')).toBeVisible()
}
export const sinFalloEnPantalla = (page: Page) => expect(page.getByText('Algo ha fallado en esta pantalla')).toHaveCount(0)

// Lee un dato guardado por la app
export const leer = (page: Page, clave: string) =>
  page.evaluate(k => JSON.parse(localStorage.getItem('rumboaula:' + k) || 'null'), clave)

export async function pestaña(page: Page, nombre: string | RegExp) {
  await page.getByRole('button', typeof nombre === 'string' ? { name: nombre, exact: true } : { name: nombre }).first().click()
  await sinFalloEnPantalla(page)
}
