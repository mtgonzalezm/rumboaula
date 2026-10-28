import { test, expect, type Page } from '@playwright/test'
import { empezar, comoProfe, comoJefatura, vigilarErrores, leer, pestaña } from './ayuda'

// Calendario de exámenes por grupo sobre el calendario escolar 2026-2027

async function abrirExamenes(page: Page) {
  await page.locator('.gd-modulos button').filter({ hasText: /^Exámenes/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Calendario de exámenes' })).toBeVisible()
}
async function ponerExamen(page: Page, fecha: string, materia: string) {
  await page.getByRole('button', { name: '+ Poner un examen' }).click()
  await page.locator('#gd-examen-fecha').fill(fecha)
  await page.locator('#gd-examen-materia').fill(materia)
}

test('Exámenes: no deja ponerlos en festivo y avisa si el grupo ya tiene examen ese día', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await abrirExamenes(page)
  await page.locator('#gd-examen-grupo').selectOption('1º ESO A')
  // El 12 de octubre es fiesta nacional: no se puede guardar
  await ponerExamen(page, '2026-10-12', 'Música')
  await expect(page.getByRole('alert').filter({ hasText: /no es lectivo/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Guardar/ })).toBeDisabled()
  // Un miércoles lectivo sí
  await page.locator('#gd-examen-fecha').fill('2026-10-14')
  await page.getByRole('button', { name: /Guardar (examen|igualmente)/ }).click()
  await expect(page.getByRole('status').filter({ hasText: /Anotado: Examen de Música · 1º ESO A/ })).toBeVisible()
  // Un segundo examen ese mismo día: avisa, pero deja guardarlo
  await ponerExamen(page, '2026-10-14', 'Lengua')
  await expect(page.getByRole('alert').filter({ hasText: /1º ESO A ya tiene/ })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar igualmente' }).click()
  const delDia = (await leer(page, 'examenes')).filter((e: { grupo: string, fecha: string }) => e.grupo === '1º ESO A' && e.fecha === '2026-10-14')
  expect(delDia.map((e: { materia: string }) => e.materia)).toEqual(expect.arrayContaining(['Música', 'Lengua']))
  // Salen en «Mis exámenes»
  await pestaña(page, 'Mis exámenes')
  await expect(page.getByText(/Examen de Lengua · 1º ESO A/)).toBeVisible()
  expect(errores).toEqual([])
})

test('Exámenes: Jefatura añade una fiesta local y el curso se ve completo y por evaluaciones', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoJefatura(page)
  await page.locator('.gd-modulos button').filter({ hasText: /^Organización/ }).first().click()
  await pestaña(page, 'Calendario escolar')
  await page.locator('#gd-dia-fecha').fill('2026-11-09')
  await page.locator('#gd-dia-txt').fill('La Almudena')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  expect((await leer(page, 'calendario_escolar')).dias).toEqual(expect.arrayContaining([expect.objectContaining({ fecha: '2026-11-09', tipo: 'local', txt: 'La Almudena' })]))
  // Ya no se pueden poner exámenes ese día
  await abrirExamenes(page)
  await ponerExamen(page, '2026-11-09', 'Inglés')
  await expect(page.getByRole('alert').filter({ hasText: /no es lectivo: la almudena/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  // Curso completo: de septiembre a junio
  await page.getByRole('tab', { name: 'Curso completo' }).click()
  await expect(page.getByRole('button', { name: /^septiembre de 2026/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^junio de 2027/ })).toBeVisible()
  // Por evaluaciones: las tres, con sus fechas
  await page.getByRole('tab', { name: 'Por evaluaciones' }).click()
  for (const ev of ['1ª evaluación', '2ª evaluación', '3ª evaluación']) await expect(page.getByRole('region', { name: ev })).toBeVisible()
  expect(errores).toEqual([])
})
