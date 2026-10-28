import { test, expect, type Page } from '@playwright/test'
import { empezar, comoProfe, vigilarErrores, leer, pestaña, salir } from './ayuda'

// Salidas y excursiones: quién va, quién se queda, ausencia del acompañante y pasar lista

type Clase = { grupo: string, materia?: string }
const horarios = (page: Page) => leer(page, 'horarios_clase') as Promise<Record<string, Clase>>
// Entra otra persona del claustro desde la portada; con «perfil» cambia después a ese perfil
async function comoOtro(page: Page, nombre: string, perfil?: RegExp) {
  await salir(page)
  await page.locator('#gd-otro-profe').selectOption(nombre)
  await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  if (perfil) {
    await page.getByRole('button', { name: /Cambiar de perfil|Profesor\/a/ }).first().click()
    await page.getByRole('option', { name: perfil }).click()
    await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  }
}

test('Salidas: Dirección la aprueba; entonces se registra la ausencia del acompañante, el grupo ve quién se queda y al pasar lista salen «De salida»', async ({ page }) => {
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
  await expect(page.getByText(/ℹ️ Cuando Dirección la apruebe se registra la ausencia/)).toBeVisible()
  await page.getByRole('button', { name: 'Enviar a Jefatura y Dirección' }).click()
  await expect(page.getByRole('status').filter({ hasText: /Salida enviada a Jefatura y Dirección: «Museo del Prado»/ })).toBeVisible()

  let salida = (await leer(page, 'salidas'))[0]
  expect(salida).toMatchObject({ titulo: 'Museo del Prado', grupos: [grupo], acompanantes: [acompanante], horas: [hora], estado: 'pendiente' })
  expect(salida.noVan).toHaveLength(1)
  // Pendiente: todavía no hay ausencia del acompañante; Jefatura y Dirección tienen el aviso
  expect((await leer(page, 'ausencias')).some((a: { salidaId?: number }) => a.salidaId === salida.id)).toBe(false)
  const avisos = (await leer(page, 'mensajes')).filter((m: { texto: string }) => /pendiente de aprobación: «Museo del Prado»/.test(m.texto)).map((m: { destinatario: string }) => m.destinatario)
  expect(avisos).toEqual(expect.arrayContaining(['Ana Jiménez', 'Luis García', 'Sofía Martín']))   // Jefatura, Dirección y Extraescolares

  // Dirección (Luis García) la aprueba
  await comoOtro(page, 'Luis García', /Dirección · Convivencia/)
  await expect(page.getByRole('region', { name: 'Avisos' })).toContainText('salida por aprobar')
  await page.locator('.gd-modulos button').filter({ hasText: /^Salidas/ }).first().click()
  await page.getByRole('button', { name: '✓ Aprobar' }).first().click()
  salida = (await leer(page, 'salidas'))[0]
  expect(salida).toMatchObject({ estado: 'aprobada', revision: expect.objectContaining({ por: 'Luis García' }) })
  // Carmen, que tiene clase con el grupo, recibe las listas para pasar lista en Raíces
  const paraRaices = (await leer(page, 'mensajes')).find((m: { destinatario: string, texto: string }) => m.destinatario === 'Carmen López' && /pasar lista en Raíces/.test(m.texto))
  expect(paraRaices.texto).toMatch(new RegExp(`${hora}, ${grupo}: están de salida`))
  // El listado para Extraescolares se descarga en PDF
  await page.getByRole('button', { name: 'Listado para Extraescolares (PDF)' }).first().click()
  await expect(page.getByText(/salida-2026-10-07-museo-del-prado\.pdf/)).toBeVisible()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar PDF/ }).last().click()
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/)
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  // Ausencia del acompañante, con la consigna para la guardia
  const aus = (await leer(page, 'ausencias')).find((a: { salidaId?: number }) => a.salidaId === salida.id)
  expect(aus).toMatchObject({ profesor: acompanante, motivo: 'Salida o excursión', horas: [hora] })
  expect(aus.sesiones[hora].consigna).toMatch(/Museo del Prado/)

  // Escritorio de Carmen: su grupo, con quién se queda
  await comoOtro(page, 'Carmen López')
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
  await expect(page.getByRole('button', { name: /Guardar salida|Enviar a Jefatura y Dirección/ })).toBeDisabled()
  // Un día con examen de un grupo
  const ex = (await leer(page, 'examenes'))[0]
  await page.locator('#gd-salida-fecha').fill(ex.fecha)
  await page.getByRole('button', { name: 'Toda la mañana' }).click()
  await page.getByRole('button', { name: ex.grupo, exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: new RegExp(`${ex.grupo} tiene .* de ${ex.materia}`) })).toBeVisible()
  expect(errores).toEqual([])
})
