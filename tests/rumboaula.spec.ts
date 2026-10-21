import { test, expect, type Page } from '@playwright/test'

// Todas las pruebas usan un miércoles lectivo a 5ª hora (12:50) y los datos de ejemplo.
const AHORA = new Date('2026-10-07T12:50:00+02:00')

// Errores de la página: si salta alguno, la prueba falla
function vigilarErrores(page: Page) {
  const errores: string[] = []
  page.on('pageerror', e => { if (!/Fallo de prueba/.test(e.message)) errores.push(e.message) })
  return errores
}

async function empezar(page: Page, hora = AHORA) {
  await page.clock.install({ time: hora })
  page.on('dialog', d => d.accept())
  await page.goto('/')
  const empezarBtn = page.getByRole('button', { name: /Empezar/ })
  if (await empezarBtn.count()) await empezarBtn.first().click()
}

async function entrar(page: Page, texto: string | RegExp) {
  await page.getByRole('button').filter({ hasText: texto }).first().click()
  await expect(page.getByRole('button', { name: /Salir/ })).toBeVisible()
}
const comoProfe = (page: Page) => entrar(page, 'poner partes, guardias')
const comoJefatura = (page: Page) => entrar(page, 'Ana Jiménez · convivencia')
async function salir(page: Page) {
  await page.getByRole('button', { name: /Salir/ }).first().click()
  await expect(page.locator('#gd-otro-profe')).toBeVisible()
}
const sinFalloEnPantalla = (page: Page) => expect(page.getByText('Algo ha fallado en esta pantalla')).toHaveCount(0)

// Pulsa todos los módulos y todas las pestañas visibles y comprueba que ninguna se rompe
async function recorrerPantallas(page: Page) {
  const modulos = page.locator('.gd-modulos button')
  const nMod = await modulos.count()
  for (let i = 0; i < Math.max(nMod, 1); i++) {
    if (nMod) await modulos.nth(i).click()
    const pestañas = page.locator('button').filter({ hasNot: page.locator('.gd-modulos') })
    const nombres = await page.evaluate(() => {
      const mod = document.querySelector('.gd-modulos')
      const sig = mod?.nextElementSibling
      return sig ? Array.from(sig.querySelectorAll('button')).map(b => { const c = b.cloneNode(true) as HTMLElement; c.querySelectorAll('.gd-globo').forEach(g => g.remove()); return (c.textContent || '').trim() }).filter(Boolean) : []
    })
    for (const n of nombres) {
      await page.getByRole('button', { name: n, exact: true }).first().click()
      await sinFalloEnPantalla(page)
    }
    void pestañas
  }
}

test.describe('Todas las pantallas se abren sin fallos', () => {
  for (const [perfil, quien] of [
    ['Profesor/a', 'poner partes, guardias'],
    ['Tutor/a', 'tutoría de'],
    ['Jefatura', 'Ana Jiménez · convivencia'],
    ['Administración', 'Elena Vega · alumnado'],
  ] as const) {
    test(perfil, async ({ page }) => {
      const errores = vigilarErrores(page)
      await empezar(page)
      await entrar(page, quien)
      await recorrerPantallas(page)
      expect(errores).toEqual([])
    })
  }
})

test('Ahora: muestra la hora en curso y el equipo de cada zona', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoJefatura(page)
  await page.getByRole('button', { name: /Guardias & Ausencias/ }).click()
  await page.getByRole('button', { name: 'Ahora', exact: true }).click()
  await expect(page.getByText('5ª hora · 12:40 – 13:35').first()).toBeVisible()
  await expect(page.getByText('Zonas de guardia · 5ª hora')).toBeVisible()
  await expect(page.getByText('APOYO (PAREJA)').first()).toBeVisible()
  expect(errores).toEqual([])
})

test('Cubrir clases: jefatura asigna y la profe lo ve', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page, new Date('2026-10-07T10:40:00+02:00'))
  await comoJefatura(page)
  await page.getByRole('button', { name: /Guardias & Ausencias/ }).click()
  await page.getByRole('button', { name: 'Ahora', exact: true }).click()
  await expect(page.getByText('1 sin cubrir')).toBeVisible()
  // La primera sugerencia es del mismo edificio que la clase y, a igualdad, quien menos ha cubierto en el curso
  await expect(page.getByText('⭐ Pablo Díaz')).toBeVisible()
  await page.getByRole('button', { name: 'Asignar' }).first().click()
  await expect(page.getByText('✅ Cubre Pablo Díaz')).toBeVisible()
  await expect(page.getByText('todas cubiertas')).toBeVisible()
  await expect(page.getByText(/Cubre 2º ESO B de Marta Rubio/).first()).toBeVisible()
  expect(errores).toEqual([])
})

test('Galvángram: aviso urgente a la pareja de guardia, respuesta «Voy»', async ({ page }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await comoProfe(page)
  await page.getByRole('button', { name: /Galvángram/ }).first().click()
  await page.getByRole('button', { name: 'Emergencia' }).click()
  // Lugar según el horario y zonas del mismo edificio primero
  await expect(page.getByText('📍 1º ESO A · Aula A1.01 · Edificio A')).toBeVisible()
  await expect(page.getByText('⭐ Edificio A · Planta 0 · Pasillo')).toBeVisible()
  await page.getByRole('button', { name: '📣 Avisar a la zona' }).first().click()
  await expect(page.getByRole('button', { name: 'Quitar a Laura Torres' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quitar a Sofía Martín' })).toBeVisible()
  await page.getByRole('button', { name: 'Enviar Mensaje' }).last().click()
  // Laura recibe el aviso a pantalla completa
  await salir(page)
  await expect(page.locator('#gd-otro-profe option', { hasText: 'Laura Torres · 🚨' })).toHaveCount(1)
  await page.locator('#gd-otro-profe').selectOption('Laura Torres')
  const aviso = page.getByRole('alertdialog')
  await expect(aviso).toContainText('AVISO URGENTE')
  await expect(aviso).toContainText('1º ESO A · Aula A1.01 · Edificio A')
  await expect(aviso).toContainText('Sofía Martín')
  await aviso.getByRole('button', { name: /Voy/ }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  // Quien lo envió ve la respuesta
  await salir(page)
  await comoProfe(page)
  await expect(page.getByRole('status').first()).toContainText('Laura Torres va de camino')
  expect(errores).toEqual([])
})

test('Galvángram: un aviso urgente no se envía sin lugar', async ({ page }) => {
  await empezar(page, new Date('2026-10-07T10:40:00+02:00'))
  await comoProfe(page)
  const avisos: string[] = []
  page.on('dialog', d => avisos.push(d.message()))
  await page.getByRole('button', { name: /Galvángram/ }).first().click()
  await page.getByRole('button', { name: 'Alumno enfermo' }).click()
  await page.getByRole('button', { name: '✏️ A mano' }).click()
  await page.locator('select').filter({ hasText: 'Añadir a cualquier' }).first().selectOption('Ana Jiménez')
  await page.getByRole('button', { name: 'Enviar Mensaje' }).last().click()
  await expect.poll(() => avisos.join(' ')).toContain('hay que indicar dónde estás')
})

test('Galvángram: cada uno ve solo sus mensajes', async ({ page }) => {
  await empezar(page)
  await comoProfe(page)
  await page.getByRole('button', { name: /Galvángram/ }).first().click()
  await page.getByRole('button', { name: 'Falta material' }).click()
  await page.locator('select').filter({ hasText: 'Añadir a cualquier' }).first().selectOption('Laura Torres')
  await page.getByRole('button', { name: 'Enviar Mensaje' }).last().click()
  await salir(page)
  await comoJefatura(page)
  await page.getByRole('button', { name: /Galvángram/ }).first().click()
  await page.getByRole('button', { name: /Historial/ }).click()
  await expect(page.getByText('Necesito material urgente')).toHaveCount(0)
})

test('Red de seguridad: si una pantalla falla, se puede avisar', async ({ page }) => {
  await page.goto('/?probar-fallo=pantalla')
  await expect(page.getByText('Algo ha fallado en esta pantalla')).toBeVisible()
  await expect(page.getByRole('button', { name: /Avisar a la responsable/ })).toBeVisible()
  await expect(page.getByText('mtgonzalezmunoz@educa.madrid.org')).toBeVisible()
  const guardados = await page.evaluate(() => JSON.parse(localStorage.getItem('galvandesk:errores') || '[]'))
  expect(guardados[0].mensaje).toContain('Fallo de prueba')
})

test('Red de seguridad: un error suelto muestra el aviso «Avisar»', async ({ page }) => {
  await page.goto('/?probar-fallo=script')
  const cerrar = page.getByRole('button', { name: 'Cerrar', exact: true })
  if (await cerrar.count()) await cerrar.first().click()
  await expect(page.getByText('Algo no ha ido bien en esta pantalla')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Avisar' }).click()
  await expect(page.getByRole('dialog', { name: /Informar de un problema/ })).toContainText('Se incluirá el error técnico')
})

test('Informar de un problema: siempre disponible', async ({ page }) => {
  await empezar(page)
  await comoProfe(page)
  await page.getByRole('button', { name: 'Informar de un problema' }).click()
  const dialogo = page.getByRole('dialog', { name: /Informar de un problema/ })
  await expect(dialogo).toContainText('No se envían datos del alumnado')
  await expect(dialogo.getByRole('button', { name: /Abrir el correo/ })).toBeVisible()
})

test('Preguntas frecuentes: desde la entrada (cómo instalar) y desde dentro de la app', async ({ page, isMobile }) => {
  const errores = vigilarErrores(page)
  await empezar(page)
  await page.getByRole('button', { name: /Instalar la app/ }).click()
  const faq = page.getByRole('dialog', { name: 'Preguntas frecuentes' })
  await expect(faq).toBeVisible()
  // La guía de instalación sale abierta y elige el dispositivo
  await expect(faq.getByText('no hace falta instalar nada')).toBeVisible()
  await expect(faq.getByRole('tab', { selected: true })).toContainText(isMobile ? 'Android' : 'Ordenador')
  await faq.getByRole('tab', { name: /iPhone/ }).click()
  await expect(faq.getByText('Añadir a pantalla de inicio')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(faq).toHaveCount(0)
  // Desde dentro de la app
  await comoProfe(page)
  await page.getByRole('button', { name: 'Preguntas frecuentes' }).click()
  await page.getByText('¿Qué datos del alumnado guarda y quién los ve?').click()
  await expect(page.getByText(/Solo los ven jefatura y el profesorado implicado/)).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar preguntas frecuentes' }).click()
  await expect(page.getByRole('dialog', { name: 'Preguntas frecuentes' })).toHaveCount(0)
  expect(errores).toEqual([])
})

test('Manual de uso: enlazado desde la app y con sus imágenes', async ({ page }) => {
  await empezar(page)
  await expect(page.getByRole('link', { name: /Manual de uso/ })).toHaveAttribute('href', '/manual/')
  await page.goto('/manual/')
  await expect(page.getByRole('heading', { name: 'Manual de uso' })).toBeVisible()
  // Todas las imágenes del manual existen
  const rotas = await page.evaluate(async () => {
    const urls = [...new Set([...document.querySelectorAll('img')].map(i => i.getAttribute('src')).concat([...document.querySelectorAll('[data-ampliar]')].map(b => b.getAttribute('data-ampliar'))))].filter(Boolean)
    const r = await Promise.all(urls.map(async u => [u, (await fetch(new URL(u, location.href))).ok]))
    return r.filter(([, ok]) => !ok).map(([u]) => u)
  })
  expect(rotas).toEqual([])
})
