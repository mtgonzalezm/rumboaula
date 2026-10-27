# Servidor del centro · prueba en red

Con el servidor, varios equipos conectados a la misma wifi comparten los datos de RumboAula:
lo que se hace en uno aparece en los demás en un par de segundos.

Esta versión es para la **demostración con datos ficticios**: se entra sin clave, con los perfiles
de la demostración. El uso real en un centro (claves, HTTPS, autorización de la Delegación de
Protección de Datos) se describe en el manual, apartados «Implantación» y «Para el TIC».

## Qué hace falta

- Un ordenador que haga de servidor (por ejemplo, un MacBook) con Node.js 22.13 o posterior.
- Los demás equipos, en la **misma wifi**, con un navegador (Chrome, Edge, Safari…).

No se instala nada más ni se cambia nada del sistema: todo está en la carpeta del proyecto.

## Ponerlo en marcha

1. Abre el Terminal y entra en la carpeta del proyecto: `cd ~/Proyectos/rumboaula`
2. Escribe: `npm run servidor`
3. Si macOS pregunta si permites que «node» acepte conexiones entrantes, pulsa **Permitir**.
4. El Terminal muestra dos direcciones:
   - **En este equipo**: `http://localhost:8080`
   - **En los demás equipos**: `http://192.168.x.x:8080` (la escribes en el navegador del otro ordenador)
5. Abre primero RumboAula **en el servidor** y pulsa «Empezar»: así se cargan los datos de ejemplo.
   Después, abre la otra dirección en los demás equipos.

Arriba, el aviso amarillo dice «En red: los equipos conectados comparten los datos».

## Pararlo

Pulsa **Control + C** en el Terminal o cierra su ventana. Nada queda funcionando.

## Empezar de cero

Los datos de la prueba están en `servidor/datos/` (la base de datos y una copia diaria).
Para volver a los datos de ejemplo, para el servidor y borra esa carpeta.

## Si el otro equipo no conecta

- Comprueba que los dos están en la **misma wifi**.
- Algunas redes (de invitados, de hoteles, de algunos centros) no dejan que los equipos se vean
  entre sí. En ese caso, conecta los dos ordenadores a la zona wifi (punto de acceso) de un móvil.
- Si el puerto 8080 está ocupado: `PUERTO=8081 npm run servidor`.
