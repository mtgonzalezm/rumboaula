# RumboAula

Aplicación interna para la organización diaria de un centro educativo: convivencia (partes, medidas correctoras y conductas positivas), guardias y ausencias del profesorado, reserva de espacios y llaves, material del centro y mensajes entre el profesorado. Complementa a Raíces, que sigue siendo el registro oficial.

- Demostración con datos ficticios: https://rumboaula.vercel.app
- Manual de uso: https://rumboaula.vercel.app/manual

> Esta versión es una **demostración**: guarda los datos en el navegador de cada dispositivo y no debe usarse con datos reales. Para usarla en un centro hace falta una instalación propia en un servidor del instituto, de uso local con la wifi del centro, y la autorización de la Delegación de Protección de Datos. Ver «Implantación en el centro» en el manual.

## Autoría y licencia

© 2026 **María Teresa González Muñoz**.

- Programa: [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0). Uso libre con fines no comerciales; los centros educativos y las Administraciones públicas pueden usarlo libremente. El uso comercial requiere permiso de la autora.
- Manual y textos: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es).
- Iconos: Font Awesome Free 6.5.2, CC BY 4.0.

Texto completo en [LICENSE](LICENSE).

## Desarrollo

React + Vite. `npm install`, `npm run dev`; pruebas con Playwright: `npm run build && npx playwright test`.
