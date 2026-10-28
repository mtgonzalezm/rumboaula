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

test('Salidas: alumnos sueltos de varios grupos; los grupos y quién se queda salen solos', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await page.locator('.gd-modulos button').filter({ hasText: /^Salidas/ }).first().click()
  await page.getByRole('button', { name: '+ Nueva salida' }).click()
  await page.locator('#gd-salida-titulo').fill('Concurso de coros')
  await page.locator('#gd-salida-fecha').fill('2026-10-14')
  await page.getByRole('button', { name: '4ª hora', exact: true }).click()
  await page.getByRole('button', { name: 'Alumnos de varios grupos' }).click()
  const alumnos: { id: number, nombre: string, curso: string }[] = await leer(page, 'alumnos')
  const [a1, a2] = [alumnos.find(a => a.curso === '1º ESO A')!, alumnos.find(a => a.curso === '2º ESO B')!]
  for (const a of [a1, a2]) {
    await page.locator('#gd-salida-busca').fill(a.nombre)
    await page.locator(`[data-alumno-elegir="${a.id}"]`).first().click()
  }
  await expect(page.getByText('Van 2 alumnos de 2 grupos: 1º ESO A, 2º ESO B')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar a Jefatura y Dirección' }).click()
  const s = (await leer(page, 'salidas'))[0]
  expect(s).toMatchObject({ titulo: 'Concurso de coros', modo: 'alumnos', grupos: ['1º ESO A', '2º ESO B'] })
  const enGrupos = alumnos.filter(a => s.grupos.includes(a.curso))
  expect(s.noVan).toHaveLength(enGrupos.length - 2)
  expect(s.noVan).not.toContain(a1.id)
  expect(errores).toEqual([])
})

test('Salidas: autorizaciones y pagos; sin autorización se quedan, el dinero se entrega a Secretaría y se recomiendan acompañantes', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)            // Carmen López organiza y va sola
  await page.locator('.gd-modulos button').filter({ hasText: /^Salidas/ }).first().click()
  await page.getByRole('button', { name: '+ Nueva salida' }).click()
  await page.locator('#gd-salida-titulo').fill('Planetario')
  await page.locator('#gd-salida-fecha').fill('2026-10-14')
  await page.getByRole('button', { name: 'Toda la mañana' }).click()
  await page.getByRole('button', { name: '2º ESO B', exact: true }).click()
  // Una sola acompañante: el criterio del centro recomienda al menos 2
  await expect(page.getByRole('alert').filter({ hasText: /el criterio del centro recomienda 2 acompañantes/ })).toBeVisible()
  await page.locator('#gd-salida-importe').fill('10')
  await page.getByRole('button', { name: 'Enviar a Jefatura y Dirección' }).click()
  const s0 = (await leer(page, 'salidas'))[0]
  const alumnos: { id: number, curso: string }[] = (await leer(page, 'alumnos')).filter((a: { curso: string }) => a.curso === '2º ESO B')
  expect(s0.importe).toBe(10)
  // Autorizaciones de todos menos el primero; pagan dos
  await page.getByRole('button', { name: 'Autorizaciones y pagos' }).first().click()
  for (const a of alumnos.slice(1)) await page.locator(`[data-aut="${a.id}"]`).click()
  for (const a of alumnos.slice(0, 2)) await page.locator(`[data-pago="${a.id}"]`).click()
  await expect(page.locator('[data-autorizaciones]').first()).toHaveAttribute('data-autorizaciones', `${alumnos.length - 1}/${alumnos.length}`)
  // Sin autorización no sale: pasa a «se queda»
  await page.getByRole('button', { name: /Quitar de la salida a quien no tiene autorización \(1\)/ }).click()
  let s = (await leer(page, 'salidas'))[0]
  expect(s.noVan).toContain(alumnos[0].id)
  await expect(page.locator('[data-autorizaciones]').first()).toHaveAttribute('data-autorizaciones', `${alumnos.length - 1}/${alumnos.length - 1}`)
  // Solo cuenta lo de quien va: queda pagado 1 × 10 €, que se entrega a Secretaría (Beatriz Navarro)
  await page.getByRole('button', { name: /Entregar a Secretaría \(10 €\)/ }).click()
  s = (await leer(page, 'salidas'))[0]
  expect(s.entregaSecretaria).toMatchObject({ importe: 10, alumnos: 1, por: 'Carmen López' })
  const aviso = (await leer(page, 'mensajes')).find((m: { destinatario: string, texto: string }) => m.destinatario === 'Beatriz Navarro' && /entrega a Secretaría 10 €/.test(m.texto))
  expect(aviso).toBeTruthy()
  expect(errores).toEqual([])
})
