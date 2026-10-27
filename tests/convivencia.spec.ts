import { test, expect, type Page } from '@playwright/test'
import { vigilarErrores, empezar, comoProfe, comoJefatura, comoSecretaria, salir, leer, pestaña } from './ayuda'

type Al = { id: number, nombre: string, curso: string }
const comoOtroProfe = async (page: Page, nombre: string) => {
  await salir(page)
  await page.locator('#gd-otro-profe').selectOption(nombre)
  await expect(page.getByRole('button', { name: /Salir/ })).toBeVisible()
  // Se entra por el Escritorio; las pruebas trabajan en Partes
  await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  await page.locator('.gd-modulos button').filter({ hasText: /^Partes/ }).first().click()
}
const buscarAlumno = async (page: Page, nombre: string) => {
  await page.getByPlaceholder('Nombre o curso…').first().fill(nombre)
  await page.getByText(nombre).first().click()
}
// El alumnado de ejemplo con alerta temprana es el último de 1º ESO A (tutoría de Carmen López)
const alumnoAlerta = async (page: Page) => (await leer(page, 'alumnos') as Al[]).filter(a => a.curso === '1º ESO A').at(-1)!

// ───────────────────────── Parte leve exprés ─────────────────────────
test('Parte leve exprés: pestaña propia, motivo con un toque y tipificación sola', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  const antes = (await leer(page, 'partes')).length
  await pestaña(page, 'Parte exprés')
  await page.locator('#gd-expres-busca').fill('Lucía Martínez')
  await page.getByRole('button', { name: /Lucía Martínez García/ }).first().click()
  const motivos = page.locator('[data-parte-expres]')
  const generar = page.getByRole('button', { name: /Generar parte leve/ })
  await expect(generar).toBeDisabled()
  // «Falta de respeto o de material» pide elegir cuál de las dos
  await motivos.getByRole('button', { name: /Falta de respeto o de material/ }).click()
  await expect(generar).toBeDisabled()
  await page.getByRole('button', { name: 'Falta de material', exact: true }).click()
  await expect(page.getByText(/2L\. Falta de colaboración/)).toBeVisible()
  // «Otros» necesita una observación
  await motivos.getByRole('button', { name: /Otros/ }).click()
  await expect(generar).toBeDisabled()
  await page.getByPlaceholder(/Qué ha pasado/).fill('Lanza papeles.')
  await expect(generar).toBeEnabled()
  await motivos.getByRole('button', { name: /Móvil o dispositivos/ }).click()
  await page.getByPlaceholder(/Qué ha pasado|Una frase/).fill('Lo saca durante el examen.')
  await expect(page.locator('#gd-expres-hora')).toHaveValue('5ª hora')
  await generar.click()
  await expect(page.getByText(/✅ Parte generado/)).toBeVisible()
  await expect(page.getByText('Cómo avisar a la familia y a Jefatura')).toBeVisible()
  const partes = await leer(page, 'partes')
  expect(partes.length).toBe(antes + 1)
  expect(partes[0]).toMatchObject({ alumno: 'Lucía Martínez García', gravedad: 'leve', tipificacion: '8L', tipo: 'Comportamiento', hora: '5ª hora', expres: true,
    descripcion: 'Móvil o dispositivos. Lo saca durante el examen.', profesor: 'Carmen López' })
  // Es un parte como los demás: sale en Mis partes
  await pestaña(page, 'Mis Partes')
  await expect(page.getByText('Móvil o dispositivos. Lo saca durante el examen.')).toBeVisible()
  // «Nuevo Parte» sigue igual, con todas las tipificaciones
  await pestaña(page, /^Nuevo Parte/)
  await expect(page.getByPlaceholder(/Describe detalladamente/)).toBeVisible()
  await expect(page.locator('[data-parte-expres]')).toHaveCount(0)
  expect(errores).toEqual([])
})

// ───────────────────────── Alerta temprana ─────────────────────────
test('Alerta temprana: 2 partes leves en asignaturas distintas en 14 días avisan al tutor/a', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  const al = await alumnoAlerta(page)
  await pestaña(page, 'Resumen de tutoría')
  const alerta = page.locator('[data-alerta-temprana]')
  await expect(alerta).toContainText(`${al.nombre} — 1º ESO A · 2 partes leves en Inglés, Matemáticas`)
  await alerta.getByRole('button', { name: 'Visto' }).click()
  expect(Object.keys(await leer(page, 'alertas_tempranas_vistas')).length).toBe(1)
  await alerta.getByRole('button', { name: 'Ver resumen' }).click()
  await expect(page.locator('#gd-resumen-alumno')).toHaveValue(String(al.id))
  // Otro profe le pone un parte leve: la alerta vuelve a salir como nueva para la tutora
  await comoOtroProfe(page, 'Laura Torres')
  await pestaña(page, 'Parte exprés')
  await page.locator('#gd-expres-busca').fill(al.nombre)
  await page.getByRole('button', { name: new RegExp(al.nombre) }).first().click()
  await page.locator('[data-parte-expres]').getByRole('button', { name: /Interrupción de clase/ }).click()
  await page.getByRole('button', { name: /Generar parte leve/ }).click()
  await expect(page.getByText(/✅ Parte generado/)).toBeVisible()
  await salir(page)
  await comoProfe(page)
  await pestaña(page, 'Resumen de tutoría')
  await expect(alerta).toContainText('1 nueva')
  await expect(alerta).toContainText('3 partes leves')
  expect(errores).toEqual([])
})

// ───────────────────────── Notas de aula ─────────────────────────
test('Notas de aula: solo las ven quien la escribe y el tutor/a, y no son partes', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  const al = await alumnoAlerta(page)
  const partesAntes = (await leer(page, 'partes')).length
  await comoOtroProfe(page, 'Laura Torres')
  await pestaña(page, 'Notas de aula')
  await page.locator('#gd-nota-busca').fill(al.nombre)
  await page.getByRole('button', { name: new RegExp(al.nombre) }).first().click()
  await page.getByRole('button', { name: 'Olvido de material' }).click()
  await page.locator('#gd-nota-texto').fill('Prueba automática: sin el cuaderno.')
  await page.getByRole('button', { name: /Guardar nota/ }).click()
  const nota = (await leer(page, 'notas_aula'))[0]
  expect(nota).toMatchObject({ alumno: al.nombre, profesor: 'Laura Torres', categoria: 'Olvido de material' })
  expect((await leer(page, 'partes')).length).toBe(partesAntes)
  // La tutora (Carmen López) la ve en su tutoría y en el resumen
  await salir(page)
  await comoProfe(page)
  await pestaña(page, 'Notas de aula')
  await expect(page.locator(`[data-nota="${nota.id}"]`)).toContainText('Prueba automática: sin el cuaderno.')
  await pestaña(page, 'Resumen de tutoría')
  await page.locator('#gd-resumen-alumno').selectOption(String(al.id))
  await expect(page.getByText('Prueba automática: sin el cuaderno.')).toBeVisible()
  await page.getByRole('button', { name: /Descargar PDF/ }).click()
  await expect(page.getByText(/resumen-tutoria-.*\.pdf/)).toBeVisible()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar PDF/ }).last().click()
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/)
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  // Otro profe que no es su tutor no la ve
  await comoOtroProfe(page, 'Jorge Ruiz')
  await pestaña(page, 'Notas de aula')
  await expect(page.locator(`[data-nota="${nota.id}"]`)).toHaveCount(0)
  // Jefatura no tiene notas de aula
  await salir(page)
  await comoJefatura(page)
  await expect(page.getByRole('button', { name: /Notas de aula/ })).toHaveCount(0)
  expect(errores).toEqual([])
})

// ───────────────────────── Mediación y compromisos ─────────────────────────
test('Compromisos: mediación entre dos alumnos, seguimiento y estados sin partes', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  const partesAntes = (await leer(page, 'partes')).length
  await pestaña(page, 'Compromisos')
  await page.getByRole('button', { name: 'Acuerdo de mediación' }).click()
  await page.locator('#gd-comp-busca').fill('Lucía Martínez')
  await page.getByRole('button', { name: /Lucía Martínez García/ }).first().click()
  await page.locator('#gd-comp-acuerdo').fill('Prueba automática: hablar con respeto.')
  await expect(page.getByRole('button', { name: /Registrar/ })).toBeDisabled()
  await page.locator('#gd-comp-busca').fill('Diego Sánchez')
  await page.getByRole('button', { name: /Diego Sánchez Blanco/ }).first().click()
  await page.getByRole('button', { name: /Registrar/ }).click()
  const c = (await leer(page, 'compromisos'))[0]
  expect(c).toMatchObject({ tipo: 'mediacion', estado: 'en_proceso', creadoPor: 'Carmen López', acuerdo: 'Prueba automática: hablar con respeto.' })
  expect(c.alumnos.map((a: Al) => a.nombre)).toEqual(['Lucía Martínez García', 'Diego Sánchez Blanco'])
  const tarjeta = page.locator(`[data-compromiso="${c.id}"]`)
  await tarjeta.getByPlaceholder('Anotar cómo va…').fill('Primera semana bien.')
  await tarjeta.getByRole('button', { name: 'Anotar' }).click()
  await tarjeta.getByRole('button', { name: 'Cumplido', exact: true }).click()
  const guardado = (await leer(page, 'compromisos')).find((x: { id: number }) => x.id === c.id)
  expect(guardado.estado).toBe('cumplido')
  expect(guardado.seguimiento.map((s: { texto: string }) => s.texto)).toEqual(['Primera semana bien.', 'Estado: Cumplido'])
  expect((await leer(page, 'partes')).length).toBe(partesAntes)
  // El tutor/a de Diego recibe un aviso; Jefatura lo ve en su pestaña
  const tutorDiego = (await leer(page, 'tutores'))[c.alumnos[1].curso]?.tutor
  if (tutorDiego && tutorDiego !== 'Carmen López')
    expect((await leer(page, 'mensajes')).some((m: { destinatario: string, texto: string }) => m.destinatario === tutorDiego && m.texto.includes('Prueba automática: hablar con respeto.'))).toBe(true)
  await salir(page)
  await comoJefatura(page)
  await pestaña(page, 'Compromisos')
  await page.getByRole('button', { name: /^Cumplidos/ }).click()
  await expect(page.locator(`[data-compromiso="${c.id}"]`)).toContainText('Primera semana bien.')
  expect(errores).toEqual([])
})

// ───────────────────────── Perfiles: Tutor/a y alta del profesorado ─────────────────────────
test('Tutor/a: quien tiene una tutoría tiene los perfiles Profesor/a y Tutor/a', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  // Carmen López es tutora de 1º ESO A: cambia al perfil Tutor/a
  await page.getByRole('button', { name: /Cambiar de perfil|Profesor\/a/ }).first().click()
  await page.getByRole('option', { name: /Tutor\/a de 1º ESO A/ }).click()
  expect((await leer(page, 'sesion')).perfil).toMatchObject({ cargo: 'tutor', id: 'profesor' })
  await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  await page.getByRole('button', { name: /Mi tutoría/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Resumen de tutoría' })).toBeVisible()
  for (const t of ['Partes y familias', 'Asistencia del grupo', 'Notas de aula', 'Compromisos', 'Resumen de tutoría']) await pestaña(page, t)
  // Y vuelve al perfil Profesor/a, con Nuevo Parte
  await page.getByRole('button', { name: /Cambiar de perfil|Tutor\/a de/ }).first().click()
  await page.getByRole('option', { name: /^Profesor\/a/ }).click()
  await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  await page.locator('.gd-modulos button').filter({ hasText: /^Partes/ }).first().click()
  await expect(page.getByPlaceholder(/Describe detalladamente/)).toBeVisible()
  // Desde la portada, «Tutor/a de un grupo» entra en su Escritorio, con «Mi tutoría» en el menú
  await salir(page)
  await page.getByRole('button').filter({ hasText: 'tutoría de' }).first().click()
  await expect(page.getByRole('region', { name: 'Avisos' })).toBeVisible()
  await page.getByRole('button', { name: /Mi tutoría/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Resumen de tutoría' })).toBeVisible()
  // Quien no tiene tutoría no tiene ese perfil
  await comoOtroProfe(page, 'Nuria Gil')
  expect(await page.getByRole('option', { name: /Tutor\/a de/ }).count()).toBe(0)
  expect(errores).toEqual([])
})

test('Jefatura de Estudios da de alta al profesorado en Organización', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoJefatura(page)
  await page.getByRole('button', { name: /^Organización/ }).first().click()
  await pestaña(page, 'Profesorado')
  await page.getByPlaceholder('Nombre completo del profesor').fill('Profesora De Prueba')
  await page.getByRole('button', { name: /^Añadir$/ }).click()
  expect(await leer(page, 'profesores')).toContain('Profesora De Prueba')
  expect(errores).toEqual([])
})

test('Jefatura de Estudios y Dirección no tienen tutoría', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoJefatura(page)
  // En los datos de ejemplo nadie de Jefatura es tutor/a, y no tiene el perfil Tutor/a
  const tutoresEj = Object.values(await leer(page, 'tutores')).map((t: any) => t.tutor)
  expect(tutoresEj).not.toContain('Ana Jiménez')
  expect(tutoresEj).not.toContain('Luis García')
  await page.getByRole('button', { name: /Cambiar de perfil|Jefatura/ }).first().click()
  expect(await page.getByRole('option', { name: /Tutor\/a de/ }).count()).toBe(0)
  await page.keyboard.press('Escape')
  await salir(page)
  // Secretaría no la ve en la lista de tutores
  await comoSecretaria(page)
  await page.getByRole('button', { name: /^Alumnos/ }).first().click()
  const sel = page.getByLabel('Tutor/a de 2º ESO A', { exact: true })
  await expect(sel.locator('option', { hasText: 'Ana Jiménez' })).toHaveCount(0)
  await expect(sel.locator('option', { hasText: 'Luis García' })).toHaveCount(0)
  // Si a un tutor/a se le da el cargo de Jefatura de Estudios, deja la tutoría
  await page.getByRole('button', { name: /^Profesores/ }).first().click()
  await page.getByRole('group', { name: 'Cargos de Laura Torres' }).getByRole('button', { name: /Jefatura de Estudios/ }).click()
  expect((await leer(page, 'tutores'))['2º ESO A'].tutor).toBe('')
  expect(errores).toEqual([])
})
