import { test, expect } from '@playwright/test'
import { vigilarErrores, empezar, comoProfe, comoJefatura, comoAdmin, salir, leer, pestaña, sinFalloEnPantalla } from './ayuda'

// ───────────────────────── PROFESORADO: partes ─────────────────────────
test('Nuevo parte: se crea, aparece en Mis partes y en Jefatura, y el PDF se descarga', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  const antes = (await leer(page, 'partes')).length
  await page.getByPlaceholder('Nombre o curso…').first().fill('Lucía Martínez')
  await page.getByText('Lucía Martínez García').first().click()
  await expect(page.getByText(/Eres su tutor\/a · Partes en total/)).toBeVisible()
  await page.locator('select').filter({ hasText: 'Muy Grave' }).first().selectOption({ label: '⚠️ Grave' })
  await page.getByPlaceholder(/Describe detalladamente/).fill('Prueba automática: interrumpe la clase repetidamente.')
  await page.getByRole('button', { name: /Generar Parte/ }).click()
  await expect(page.getByText(/✅ Parte generado/)).toBeVisible()
  const partes = await leer(page, 'partes')
  expect(partes.length).toBe(antes + 1)
  expect(partes[0]).toMatchObject({ alumno: 'Lucía Martínez García', gravedad: 'grave', profesor: 'Carmen López' })
  // Mis partes
  await pestaña(page, 'Mis Partes')
  await expect(page.getByText('Prueba automática: interrumpe la clase repetidamente.')).toBeVisible()
  await page.getByRole('button', { name: 'PDF', exact: true }).first().click()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar PDF/ }).first().click()
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/)
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  // Jefatura
  await salir(page)
  await comoJefatura(page)
  await expect(page.getByText(String(antes + 1)).first()).toBeVisible()
  await pestaña(page, 'Partes')
  await expect(page.getByText('Prueba automática: interrumpe la clase repetidamente.')).toBeVisible()
  expect(errores).toEqual([])
})

test('Parte de grupo: crea un parte por cada alumno no excluido', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await pestaña(page, 'Parte de Grupo')
  const alumnos = await leer(page, 'alumnos')
  const delGrupo = alumnos.filter((a: { curso: string }) => a.curso === '2º ESO A').length
  const antes = (await leer(page, 'partes')).length
  await page.locator('select').filter({ hasText: 'Selecciona un curso' }).selectOption('2º ESO A')
  await page.getByPlaceholder(/Describe el comportamiento del grupo/).fill('Prueba automática de grupo.')
  await page.getByRole('button', { name: /Generar Parte para \d+ alumnos/ }).click()
  await expect(page.getByText(`✅ ${delGrupo} partes generados para 2º ESO A`)).toBeVisible()
  expect((await leer(page, 'partes')).length).toBe(antes + delGrupo)
  expect(errores).toEqual([])
})

test('Baños: registrar salida y regreso; Jefatura lo ve', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await pestaña(page, 'Baños')
  await page.getByPlaceholder('Nombre o curso…').fill('Hugo Navarro')
  await page.getByText('Hugo Navarro Delgado').first().click()
  await page.getByRole('button', { name: /Registrar Salida/ }).click()
  await expect(page.getByText(/Fuera ahora \(2\)/)).toBeVisible()
  await salir(page)
  await comoJefatura(page)
  await pestaña(page, 'Baños')
  await expect(page.getByText('2 alumno(s) fuera')).toBeVisible()
  await salir(page)
  await comoProfe(page)
  await pestaña(page, 'Baños')
  await page.locator('div').filter({ hasText: /^Hugo Navarro Delgado/ }).getByRole('button', { name: /Regresó/ }).first().click()
  await expect(page.getByText(/Fuera ahora \(1\)/)).toBeVisible()
  expect(errores).toEqual([])
})

test('Estadísticas del profe: avisar a la familia y marcar como avisado', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await pestaña(page, /Estadísticas/)
  await page.getByRole('button', { name: 'Avisar a la familia' }).first().click()
  await sinFalloEnPantalla(page)
  await pestaña(page, /Estadísticas/)
  await page.getByRole('button', { name: /Ya he avisado/ }).first().click()
  await expect(page.getByRole('button', { name: /Estadísticas · 🔔 1/ })).toBeVisible()
  for (const p of ['Día', 'Semana', 'Mes']) { await page.getByRole('button', { name: p, exact: true }).click(); await sinFalloEnPantalla(page) }
  expect(errores).toEqual([])
})

// ───────────────────────── PROFESORADO: guardias ─────────────────────────
test('Notificar ausencia: llega a Jefatura y aparece como clase sin cubrir', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await page.getByRole('button', { name: 'Guardias', exact: true }).click()
  await pestaña(page, 'Notificar Ausencia')
  await expect(page.locator('select').filter({ hasText: '— Seleccionar —' }).first()).toHaveValue('Carmen López')
  await page.locator('input[type=date]').first().fill('2026-10-07')
  await page.getByRole('button', { name: /6ª hora/ }).click()
  await page.getByPlaceholder(/Describe qué deben hacer los alumnos/).fill('Prueba automática: ejercicios 1 a 5.')
  await page.getByRole('button', { name: /Notificar/ }).last().click()
  const aus = await leer(page, 'ausencias')
  expect(aus.some((a: { profesor: string, horas: string[] }) => a.profesor === 'Carmen López' && a.horas.includes('6ª hora'))).toBe(true)
  await salir(page)
  await comoJefatura(page)
  await page.getByRole('button', { name: /Guardias & Ausencias/ }).click()
  await pestaña(page, 'Ausencias de Profesores')
  await expect(page.getByText('Prueba automática: ejercicios 1 a 5.').first()).toBeVisible()
  await pestaña(page, 'Ahora')
  await page.getByRole('button', { name: '6ª hora', exact: true }).click()
  await expect(page.getByText(/Deja Carmen López/).first()).toBeVisible()
  expect(errores).toEqual([])
})

test('Mi guardia hoy: firmar la guardia y pasar lista; Jefatura lo ve', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page, new Date('2026-10-07T10:30:00+02:00'))
  await comoProfe(page)
  await page.getByRole('button', { name: 'Guardias', exact: true }).click()
  await pestaña(page, 'Mi Guardia Hoy')
  const firmasAntes = (await leer(page, 'firmas_guardia')).length
  await page.getByRole('button', { name: 'Firmar guardia', exact: true }).first().click()
  expect((await leer(page, 'firmas_guardia')).length).toBe(firmasAntes + 1)
  await page.getByRole('button', { name: /Pasar lista · / }).first().click()
  await page.getByRole('button', { name: /Guardar|Terminar|Lista pasada/ }).last().click()
  expect((await leer(page, 'listas_guardia')).length).toBeGreaterThan(0)
  await salir(page)
  await comoJefatura(page)
  await page.getByRole('button', { name: /Guardias & Ausencias/ }).click()
  await pestaña(page, 'Firmas y listas')
  await expect(page.getByText('Carmen López').first()).toBeVisible()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar PDF/ }).click()
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/)
  expect(errores).toEqual([])
})

// ───────────────────────── JEFATURA ─────────────────────────
test('Jefatura: filtros, por alumno, alertas, informe y estadísticas', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoJefatura(page)
  // Por alumno
  await pestaña(page, 'Por Alumno')
  await page.locator('select').filter({ hasText: 'Seleccionar alumno' }).selectOption({ index: 1 })
  await sinFalloEnPantalla(page)
  // Filtro de gravedad: solo muy graves
  await pestaña(page, 'Partes')
  await page.locator('select').filter({ hasText: 'Toda gravedad' }).selectOption({ label: '🔴 Muy Grave' })
  await expect(page.getByText('Leve', { exact: true })).toHaveCount(0)
  // Alertas: al pulsar una se marca como leída
  await pestaña(page, /Alertas/)
  const sinLeer = await page.getByText('● Sin leer').count()
  await page.getByText('● Sin leer').first().click()
  await expect(page.getByText('● Sin leer')).toHaveCount(sinLeer - 1)
  // Informe de partes en PDF: se ve qué filtros arrastra y, al limpiarlos, se descarga
  await pestaña(page, 'Informe')
  await expect(page.getByText(/El informe incluirá 0 parte\(s\).*Lucía Martínez García/)).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await page.getByRole('button', { name: /Ver informe de partes/ }).click()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar PDF/ }).first().click()
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/)
  // Cerrar la vista previa y después el informe
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.getByRole('button', { name: '✕ Cerrar' }).click()
  // Estadísticas
  await pestaña(page, 'Estadísticas')
  for (const p of ['Semana', 'Mes']) { await page.getByRole('button', { name: p, exact: true }).click(); await sinFalloEnPantalla(page) }
  expect(errores).toEqual([])
})

test('Jefatura: ausencia por teléfono y cuadrante de guardias', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoJefatura(page)
  await page.getByRole('button', { name: /Guardias & Ausencias/ }).click()
  await pestaña(page, 'Ausencias de Profesores')
  await page.getByRole('button', { name: /Registrar una ausencia comunicada por teléfono/ }).click()
  await sinFalloEnPantalla(page)
  await pestaña(page, 'Cuadrante')
  await page.locator('select').filter({ hasText: '— Elige un profesor —' }).selectOption('Nuria Gil')
  await sinFalloEnPantalla(page)
  await pestaña(page, 'Parte del Día')
  await expect(page.getByText(/Zonas de guardia/).first()).toBeVisible()
  expect(errores).toEqual([])
})

// ───────────────────────── ADMINISTRACIÓN ─────────────────────────
test('Administración: importar alumnado desde Raíces (CSV) sin duplicar', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoAdmin(page)
  await page.getByRole('button', { name: 'Alumnos', exact: true }).click()
  await page.getByRole('button', { name: /Importar CSV\/Excel/ }).click()
  const antes = (await leer(page, 'alumnos')).length
  const csv = 'Nombre;Curso;Email;Telefono\nAlumna Prueba Uno;1º ESO A;fam1@ejemplo.es;600000001\nAlumno Prueba Dos;1º ESO B;fam2@ejemplo.es;600000002\n'
  const subir = async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'raices.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    await page.getByRole('button', { name: /Confirmar|Importar/ }).last().click()
  }
  await subir()
  await expect(page.getByText(/2 alumno\(s\) importados/)).toBeVisible()
  expect((await leer(page, 'alumnos')).length).toBe(antes + 2)
  // Importar el mismo archivo otra vez no debe duplicar
  await subir()
  await expect(page.getByText(/0 alumno\(s\) importados.*2 ya estaban/)).toBeVisible()
  expect((await leer(page, 'alumnos')).length).toBe(antes + 2)
  // El alumno importado se puede usar al poner un parte
  await salir(page)
  await comoProfe(page)
  await page.getByPlaceholder('Nombre o curso…').first().fill('Alumna Prueba')
  await expect(page.getByText('Alumna Prueba Uno').first()).toBeVisible()
  expect(errores).toEqual([])
})

test('Administración: tutorías y profesorado', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoAdmin(page)
  await page.getByRole('button', { name: 'Alumnos', exact: true }).click()
  await page.getByLabel('Tutor/a de 1º ESO A', { exact: true }).selectOption('Nuria Gil')
  expect((await leer(page, 'tutores'))['1º ESO A'].tutor).toBe('Nuria Gil')
  await page.getByRole('button', { name: 'Profesores', exact: true }).click()
  await page.getByPlaceholder('Nombre completo del profesor').fill('Profesora Prueba Nueva')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  expect(await leer(page, 'profesores')).toContain('Profesora Prueba Nueva')
  // El tutor nuevo sale al poner un parte a un alumno de 1º ESO A
  await salir(page)
  await comoProfe(page)
  await page.getByPlaceholder('Nombre o curso…').first().fill('Lucía Martínez')
  await page.getByText('Lucía Martínez García').first().click()
  await expect(page.getByText(/Tutor\/a:\s*Nuria Gil/)).toBeVisible()
  expect(errores).toEqual([])
})

// ───────────────────────── Reglas de la app ─────────────────────────
test('Un parte puesto en 7ª hora (15:10) no salta como «fuera de horario»', async ({ page }) => {
  await empezar(page, new Date('2026-10-07T15:10:00+02:00'))
  await comoProfe(page)
  await page.getByPlaceholder('Nombre o curso…').first().fill('Lucía Martínez')
  await page.getByText('Lucía Martínez García').first().click()
  await page.locator('select').filter({ hasText: '7ª hora' }).first().selectOption({ label: '7ª hora · 14:30 – 15:25' })
  await page.getByPlaceholder(/Describe detalladamente/).fill('Prueba automática en 7ª hora.')
  await page.getByRole('button', { name: /Generar Parte/ }).click()
  const alertas = await leer(page, 'alertas')
  expect(alertas.filter((a: { tipo: string, msg: string }) => a.tipo === 'fuera_horario' && /15:10/.test(a.msg))).toHaveLength(0)
})

test('Administración: alta manual de alumno, sin duplicados y con aviso de campos obligatorios', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoAdmin(page)
  await page.getByRole('button', { name: 'Alumnos', exact: true }).click()
  await page.getByRole('button', { name: /Añadir manual/ }).click()
  const antes = (await leer(page, 'alumnos')).length
  await page.getByRole('button', { name: /Añadir Alumno/ }).click()
  await expect(page.getByText('Escribe el nombre completo y el curso: son obligatorios.')).toBeVisible()
  await page.getByLabel('Nombre completo').fill('Alumno Manual Prueba')
  await page.getByLabel('Curso / Aula').fill('3º ESO B')
  await page.getByRole('button', { name: /Añadir Alumno/ }).click()
  expect((await leer(page, 'alumnos')).length).toBe(antes + 1)
  await page.getByLabel('Nombre completo').fill('alumno manual prueba')
  await page.getByLabel('Curso / Aula').fill('3º ESO B')
  await page.getByRole('button', { name: /Añadir Alumno/ }).click()
  await expect(page.getByText(/ya está dado\/a de alta/)).toBeVisible()
  expect((await leer(page, 'alumnos')).length).toBe(antes + 1)
  await page.getByRole('button', { name: /Lista completa/ }).click()
  await expect(page.getByText(`${antes + 1} alumno(s) en el sistema`)).toBeVisible()
  expect(errores).toEqual([])
})

test('Ficha del alumno: el contacto y el total de partes solo los ve su tutor/a', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page) // Carmen López, tutora de 1º ESO A
  // Alumno de otro grupo: solo sus propios partes y sin contacto de la familia
  await page.getByPlaceholder('Nombre o curso…').first().fill('Diego Sánchez')
  await page.getByText('Diego Sánchez Blanco').first().click()
  await expect(page.getByText(/Partes que le has puesto tú:\s*1/)).toBeVisible()
  await expect(page.getByText('El contacto de la familia aparece al generar el parte')).toBeVisible()
  await expect(page.getByText(/Partes en total/)).toHaveCount(0)
  const al = (await leer(page, 'alumnos')).find((a: { nombre: string }) => a.nombre === 'Diego Sánchez Blanco')
  await expect(page.getByText(al.email)).toHaveCount(0)
  // Al generar el parte, quien lo pone sí ve cómo avisar a la familia
  await page.getByPlaceholder(/Describe detalladamente/).fill('Prueba automática de privacidad.')
  await page.getByRole('button', { name: /Generar Parte/ }).click()
  await expect(page.getByText(/✅ Parte generado/)).toBeVisible()
  // Alumna de su tutoría: ve el contacto y el total
  await page.getByPlaceholder('Nombre o curso…').first().fill('Lucía Martínez')
  await page.getByText('Lucía Martínez García').first().click()
  await expect(page.getByText(/Eres su tutor\/a · Partes en total/)).toBeVisible()
  expect(errores).toEqual([])
})

// ───────────────────────── Medidas correctoras ─────────────────────────
test('Medidas correctoras: la profe pone una supresión de recreo y Jefatura controla si se cumple', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page) // Carmen López
  // Parte leve con su medida para hoy
  await page.getByPlaceholder('Nombre o curso…').first().fill('Lucía Martínez')
  await page.getByText('Lucía Martínez García', { exact: true }).first().click()
  await page.getByPlaceholder(/Describe detalladamente/).fill('Prueba automática: medida de recreo.')
  await page.getByRole('button', { name: /Generar Parte/ }).click()
  await page.getByRole('button', { name: /Poner medida correctora/ }).click()
  await page.locator('#gd-medida-tipo').selectOption('recreo')
  await page.getByRole('button', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar medida' }).click()
  const parte = (await leer(page, 'partes'))[0]
  const medida = (await leer(page, 'medidas')).find((m: { parteId: number }) => m.parteId === parte.id)
  expect(medida).toMatchObject({ tipo: 'recreo', alumno: 'Lucía Martínez García', puestaPor: 'Carmen López', sesiones: [{ fecha: '2026-10-07', hora: 'Recreo', estado: 'pendiente' }] })
  // En un parte grave, la medida la pone Jefatura
  await page.getByPlaceholder('Nombre o curso…').first().fill('Lucía Martínez')
  await page.getByText('Lucía Martínez García', { exact: true }).first().click()
  await page.locator('select').filter({ hasText: 'Muy Grave' }).first().selectOption({ label: '⚠️ Grave' })
  await page.getByPlaceholder(/Describe detalladamente/).fill('Prueba automática: parte grave.')
  await page.getByRole('button', { name: /Generar Parte/ }).click()
  await expect(page.getByText('Las medidas de las faltas graves y muy graves las pone Jefatura de Estudios.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Poner medida correctora/ })).toHaveCount(0)
  // Jefatura: no se presenta, sale la alerta y pone el parte 9L
  await salir(page)
  await comoJefatura(page)
  await pestaña(page, /Medidas/)
  await page.locator(`[data-medida="${medida.id}"]`).getByRole('button', { name: /No se ha presentado/ }).first().click()
  const tras = (await leer(page, 'medidas')).find((m: { id: number }) => m.id === medida.id)
  expect(tras.sesiones[0].estado).toBe('ausente')
  expect((await leer(page, 'alertas')).some((a: { tipo: string, alumno: string }) => a.tipo === 'medida_incumplida' && a.alumno === 'Lucía Martínez García')).toBe(true)
  const antes = (await leer(page, 'partes')).length
  await page.locator(`[data-medida="${medida.id}"]`).getByRole('button', { name: 'Poner parte por no cumplirla' }).last().click()
  const partes = await leer(page, 'partes')
  expect(partes.length).toBe(antes + 1)
  expect(partes[0]).toMatchObject({ alumno: 'Lucía Martínez García', gravedad: 'leve', tipificacion: '9L', profesor: 'Ana Jiménez' })
  await sinFalloEnPantalla(page)
  expect(errores).toEqual([])
})
