import { test, expect, type Page } from '@playwright/test'
import { empezar, comoProfe, vigilarErrores, leer, pestaña } from './ayuda'

// Salidas y excursiones: quién va, quién se queda, ausencia del acompañante y pasar lista

type Clase = { grupo: string, materia?: string }
const horarios = (page: Page) => leer(page, 'horarios_clase') as Promise<Record<string, Clase>>

test('Salidas: el profesorado del grupo ve quién se queda, al pasar lista salen «De salida» y se registra la ausencia del acompañante', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)              // miércoles 7 de octubre de 2026, 5ª hora
  await comoProfe(page)            // Carmen López
  const h = await horarios(page)
  const hora = ['5ª hora', '4ª hora', '6ª hora', '3ª hora', '2ª hora', '1ª hora'].find(x => h[`Miércoles|${x}|Carmen López`])!
  const grupo = h[`Miércoles|${hora}|Carmen López`].grupo
  // Acompañante: alguien que a esa hora da clase a otro grupo
  const acompanante = Object.entries(h).map(([k, c]) => [k.split('|'), c] as const)
    .find(([[d, hh, p], c]) => d === 'Miércoles' && hh === hora && p !== 'Carmen López' && c.grupo !== grupo)![0][2]

  await page.locator('.gd-modulos button').filter({ hasText: /^Salidas/ }).first().click()
  await page.getByRole('button', { name: '+ Nueva salida' }).click()
  await page.locator('#gd-salida-titulo').fill('Museo del Prado')
  await page.locator('#gd-salida-fecha').fill('2026-10-07')
  await page.getByRole('button', { name: hora, exact: true }).click()
  await page.getByRole('button', { name: grupo, exact: true }).click()
  await page.locator('[data-alumno-salida]').first().click()            // uno se queda
  await page.getByRole('button', { name: 'Carmen López', exact: true }).click()   // Carmen no va: se queda con su clase
  await page.getByRole('button', { name: acompanante, exact: true }).click()
  await expect(page.getByText(/ℹ️ Al guardar se registra la ausencia/)).toBeVisible()
  await page.getByRole('button', { name: 'Guardar salida' }).click()
  await expect(page.getByRole('status').filter({ hasText: /Salida guardada: «Museo del Prado»/ })).toBeVisible()

  const salida = (await leer(page, 'salidas'))[0]
  expect(salida).toMatchObject({ titulo: 'Museo del Prado', grupos: [grupo], acompanantes: [acompanante], horas: [hora] })
  expect(salida.noVan).toHaveLength(1)
  // Ausencia del acompañante, con la consigna para la guardia
  const aus = (await leer(page, 'ausencias')).find((a: { salidaId?: number }) => a.salidaId === salida.id)
  expect(aus).toMatchObject({ profesor: acompanante, motivo: 'Salida o excursión', horas: [hora] })
  expect(aus.sesiones[hora].consigna).toMatch(/Museo del Prado/)

  // Escritorio de Carmen: su grupo, con quién se queda
  await page.locator('.gd-modulos button').filter({ hasText: /^Escritorio/ }).first().click()
  await expect(page.getByRole('region', { name: 'Hoy' })).toContainText(`${grupo}:`)
  await expect(page.getByRole('region', { name: 'Hoy' })).toContainText('se quedan 1 contigo')

  // Pasar lista: los que están de salida no pueden tener falta
  await page.locator('.gd-modulos button').filter({ hasText: /^Asistencia/ }).first().click()
  await pestaña(page, 'Pasar lista')
  await page.locator('#gd-asis-hora').selectOption(hora)
  await expect(page.getByRole('note').filter({ hasText: /están en la salida «Museo del Prado»/ })).toBeVisible()
  const total = await page.locator('[data-alumno-lista]').count()
  await expect(page.getByText('🚌 De salida')).toHaveCount(total - 1)

  // Anular la salida quita también la ausencia
  await page.locator('.gd-modulos button').filter({ hasText: /^Salidas/ }).first().click()
  await page.getByRole('button', { name: 'Anular' }).first().click()
  expect(await leer(page, 'salidas')).toHaveLength(0)
  expect((await leer(page, 'ausencias')).some((a: { salidaId?: number }) => a.salidaId === salida.id)).toBe(false)
  expect(errores).toEqual([])
})

test('Salidas: no deja ponerlas en un día no lectivo y avisa si el grupo tiene examen', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await page.locator('.gd-modulos button').filter({ hasText: /^Salidas/ }).first().click()
  await page.getByRole('button', { name: '+ Nueva salida' }).click()
  await page.locator('#gd-salida-titulo').fill('Teatro')
  await page.locator('#gd-salida-fecha').fill('2026-10-12')
  await expect(page.getByRole('alert').filter({ hasText: /no es lectivo/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar salida' })).toBeDisabled()
  // Un día con examen de un grupo
  const ex = (await leer(page, 'examenes'))[0]
  await page.locator('#gd-salida-fecha').fill(ex.fecha)
  await page.getByRole('button', { name: 'Toda la mañana' }).click()
  await page.getByRole('button', { name: ex.grupo, exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: new RegExp(`${ex.grupo} tiene .* de ${ex.materia}`) })).toBeVisible()
  expect(errores).toEqual([])
})
