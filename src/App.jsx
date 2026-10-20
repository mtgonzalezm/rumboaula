import { Component, useState, useEffect, useRef, createContext, useContext } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// ─── Paleta de colores ───────────────────────────────────────────────────────
// ─── Nombre de la aplicación y del centro (cámbialos aquí para otro instituto) ─
const APP = "RumboAula";
// Nombre y localidad del centro: se cambian en Administración › Alumnos › «Datos del centro».
// Se guardan con los demás datos y se aplican aquí para que los usen también los PDF y los correos.
const CENTRO_POR_DEFECTO = { nombre: "Centro educativo", ciudad: "Madrid" };
let CENTRO = CENTRO_POR_DEFECTO.nombre;
let CIUDAD = CENTRO_POR_DEFECTO.ciudad;
let LOGO_CENTRO = null; // { data, w, h }: imagen que el centro pone al pie de los PDF
function fijarCentro(d) {
  CENTRO = d?.nombre?.trim() || CENTRO_POR_DEFECTO.nombre;
  CIUDAD = d?.ciudad?.trim() || CENTRO_POR_DEFECTO.ciudad;
  LOGO_CENTRO = d?.logo?.data ? d.logo : null;
}

// Colores con los que se pinta toda la app. Los nombres son los de siempre, pero los valores
// son ya los de Raíces (petróleo, azul, gris azulado, crema), con contraste suficiente para leer.
const C = {
  cream: "#EBF0F6", teal: "#275D8C", blue: "#2B647E", salmon: "#275D8C",
  dark: "#2B647E", white: "#FFFFFF", gray: "#2B647E", light: "#EBF0F6",
  amber: "#2B647E", amberBg: "#FDF1D9",
};

// Letra del texto como la de Raíces; los títulos van en Montserrat (guardada en public/fonts, ver index.css)
const FUENTE = `"Helvetica Neue", Helvetica, Arial, sans-serif`;

// Paleta de Raíces (medida en sus pantallas).
// Sobre turquesa, mostaza y verde el texto va en «noche»: en blanco no se leería.
const R = {
  petroleo: "#2B647E", noche: "#16333F", azul: "#275D8C", turquesa: "#65B9C9", turquesaClaro: "#CDE9ED",
  mostaza: "#F6C862", verde: "#63CBA1", azulClaro: "#DDF0F4", crema: "#FDF1D9", gris: "#EBF0F6",
};
// Gravedad de menos a más intensa, con colores de Raíces
const COLOR_GRAVEDAD = { leve: R.verde, grave: R.mostaza, muy_grave: R.azul };
const TITULO = `"Montserrat", "Segoe UI", system-ui, sans-serif`;

// Título de bloque como los de Raíces: título grande, subtítulo, dibujo a la derecha y línea azul debajo
const TituloBloque = ({ titulo, sub, icono, nivel = "h2" }) => {
  const Tag = nivel;
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <Tag className="gd-titulo-bloque" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 34, lineHeight: 1.1, color: R.petroleo, textWrap: "balance" }}>{titulo}</Tag>
          {sub && <div style={{ fontSize: 17, color: R.petroleo, marginTop: 6 }}>{sub}</div>}
        </div>
        {icono && <Icono nombre={icono} tam={56} />}
      </div>
      <div aria-hidden="true" style={{ height: 5, background: R.azul, width: "70%", marginTop: 10 }} />
    </div>
  );
};

// Logotipo de RumboAula (public/logo-rumboaula-completo.png y, sin el texto de arriba, logo-rumboaula-nombre.png).
// En la cabecera, las pantallas estrechas muestran la versión corta (ver la regla .gd-logo-corto).
const Logo = ({ alto = 64, corto = false }) => (
  <span style={{ display: "inline-flex", flexShrink: 0 }}>
    <img className={corto ? "gd-logo-grande" : undefined} src="/logo-rumboaula-completo.png" alt={`${APP} · Sistema para la Gestión de Centro`}
      style={{ height: alto, width: "auto", maxWidth: "100%", display: "block" }} />
    {corto && <img className="gd-logo-corto" src="/logo-rumboaula-nombre.png" alt={APP} style={{ height: Math.round(alto * 0.5), width: "auto", display: "none" }} />}
  </span>
);

// Enlace «Ver todos ▷» de Raíces: texto azul con triángulo mostaza
const triangulo = { display: "inline-block", width: 0, height: 0, borderLeft: `11px solid ${R.mostaza}`, borderTop: "8px solid transparent", borderBottom: "8px solid transparent" };

// Caja de aviso: fondo blanco, contorno del color del aviso y franja más gruesa a la izquierda
const caja = color => ({ background: C.white, border: `3px solid ${color}`, borderLeftWidth: 12 });

// ─── Datos demo ──────────────────────────────────────────────────────────────
const DEMO_ALUMNOS = [
  { id: 1, nombre: "Lucía Martínez García",    curso: "1º ESO A", tutor: "Carmen López",   email: "familia.martinez@email.com", telefono: "612345678", nia: "" },
  { id: 2, nombre: "Marcos Fernández Ruiz",    curso: "1º ESO A", tutor: "Carmen López",   email: "familia.fernandez@email.com", telefono: "623456789", nia: "" },
  { id: 3, nombre: "Sara González Pérez",      curso: "2º ESO B", tutor: "Pedro Sánchez",  email: "familia.gonzalez@email.com", telefono: "634567890", nia: "" },
  { id: 4, nombre: "Alejandro Torres Díaz",    curso: "2º ESO B", tutor: "Pedro Sánchez",  email: "familia.torres@email.com", telefono: "645678901", nia: "" },
  { id: 5, nombre: "Paula Ramírez Moreno",     curso: "3º ESO A", tutor: "Ana Jiménez",    email: "familia.ramirez@email.com", telefono: "656789012", nia: "" },
  { id: 6, nombre: "Diego Sánchez Blanco",     curso: "3º ESO A", tutor: "Ana Jiménez",    email: "familia.sanchez@email.com", telefono: "667890123", nia: "" },
  { id: 7, nombre: "Elena Romero Castro",      curso: "4º ESO C", tutor: "Luis García",    email: "familia.romero@email.com", telefono: "678901234", nia: "" },
  { id: 8, nombre: "Adrián López Vega",        curso: "4º ESO C", tutor: "Luis García",    email: "familia.lopez@email.com", telefono: "689012345", nia: "" },
];

const DEMO_PROFESORES = [
  "Carmen López", "Pedro Sánchez", "Ana Jiménez", "Luis García",
  "Carlos Moreno", "María Fernández", "Jorge Ruiz", "Laura Torres",
  "Sofía Martín", "Pablo Díaz", "Elena Vega", "Roberto Castro",
  "Beatriz Navarro", "Javier Ortega", "Rocío Herrera", "Miguel Romero",
  "Nuria Gil", "Óscar Molina", "Raquel Serrano", "Sergio Delgado",
  "Inés Prieto", "Álvaro Cano", "Marta Rubio", "David Ibáñez",
];

// color: relleno de la gravedad (verde, mostaza y azul de Raíces); texto: color de la letra sobre ese relleno
const GRAVEDAD = [
  { id: "leve",      label: "🟡 Leve",      color: R.verde,   texto: R.noche, desc: "Reglamento de Centro" },
  { id: "grave",     label: "⚠️ Grave",     color: R.mostaza, texto: R.noche, desc: "Normativa CAM" },
  { id: "muy_grave", label: "🔴 Muy Grave", color: R.azul,    texto: "#fff",  desc: "Normativa CAM (nivel superior)" },
];

// ─── Tipificación normativa ───────────────────────────────────────────────────
const TIPIFICACION = {
  leve: [
    { id: "1L",  label: "1. Perturbación del normal desarrollo de las actividades de la clase" },
    { id: "2L",  label: "2L. Falta de colaboración sistemática en la realización de las actividades de clase o ausencia de material" },
    { id: "3L",  label: "3L. Faltas injustificadas de puntualidad o faltas injustificadas de asistencia a clase" },
    { id: "4L",  label: "4L. Permanecer fuera del aula sin permiso del profesorado o por el cambio de clase" },
    { id: "5L",  label: "5L. Impedir o dificultar el estudio de sus compañeros" },
    { id: "6L",  label: "6L. Actuaciones incorrectas hacia algún miembro de la comunidad educativa" },
    { id: "7L",  label: "7L. Daños en instalaciones o documentos del centro o pertenencias de un miembro" },
    { id: "8L",  label: "8. Uso del teléfono móvil o cualquier dispositivo electrónico sin permiso del profesorado" },
    { id: "9L",  label: "9L. Incumplimiento de la sanción impuesta por una falta leve" },
    { id: "10L", label: "10L. Otras (especificar)" },
  ],
  grave: [
    { id: "aG", label: "a) Las faltas reiteradas de puntualidad o de asistencia a clase que, a juicio del tutor, no estén justificadas" },
    { id: "bG", label: "b) Las conductas que impidan o dificulten a otros compañeros el ejercicio del derecho o el cumplimiento del deber del estudio" },
    { id: "cG", label: "c) Los actos de incorrección o desconsideración con compañeros u otros miembros de la comunidad escolar" },
    { id: "dG", label: "d) Los actos de indisciplina y los que perturben el desarrollo normal de las actividades del centro" },
    { id: "eG", label: "e) Los daños causados en las instalaciones o el material del centro" },
    { id: "fG", label: "f) La sustracción, daño u ocultación de los bienes o pertenencias de los miembros de la comunidad educativa" },
    { id: "gG", label: "g) La incitación a la comisión de una falta grave contraria a las normas de convivencia" },
    { id: "hG", label: "h) La participación en riñas mutuamente aceptadas" },
    { id: "iG", label: "i) La alteración grave e intencionada del normal desarrollo de la actividad escolar que no constituya falta muy grave" },
    { id: "jG", label: "j) La reiteración en el mismo trimestre de dos o más faltas leves" },
    { id: "kG", label: "k) Los actos que impidan la correcta evaluación del aprendizaje o falseen los resultados académicos" },
    { id: "lG", label: "l) La omisión del deber de comunicar al personal del centro situaciones de acoso o que puedan poner en riesgo grave la integridad física o moral de otros miembros" },
    { id: "mG", label: "m) La difusión por cualquier medio de imágenes o informaciones de ámbito escolar o personal que menoscaben la imagen personal de miembros de la comunidad educativa" },
    { id: "nG", label: "n) El incumplimiento de una medida correctora impuesta por la comisión de una falta leve, así como el incumplimiento de las medidas dirigidas a reparar los daños o asumir su coste" },
  ],
  muy_grave: [
    { id: "aMG", label: "a) Los actos graves de indisciplina, desconsideración, insultos, amenazas, falta de respeto o actitudes desafiantes, cometidos hacia los profesores y demás personal del centro" },
    { id: "bMG", label: "b) El acoso físico o moral a los compañeros" },
    { id: "cMG", label: "c) El uso de la intimidación o la violencia, las agresiones, las ofensas graves y los actos que atenten gravemente contra el derecho a la intimidad, al honor o a la propia imagen o la salud" },
    { id: "dMG", label: "d) La discriminación, las vejaciones o las humillaciones a cualquier miembro de la comunidad educativa, por razón de nacimiento, raza, sexo, religión, orientación sexual, opinión u otras circunstancias" },
    { id: "eMG", label: "e) La grabación, publicidad o difusión, a través de cualquier medio o soporte, de agresiones o humillaciones cometidas o con contenido vejatorio para los miembros de la comunidad educativa" },
    { id: "fMG", label: "f) Los daños graves causados intencionadamente o por uso indebido en las instalaciones, materiales y documentos del centro o en las pertenencias de otros miembros de la comunidad" },
    { id: "gMG", label: "g) La suplantación de personalidad y la falsificación o sustracción de documentos académicos" },
    { id: "hMG", label: "h) El uso, la incitación al mismo, la introducción en el centro o el comercio de objetos o sustancias perjudiciales para la salud o peligrosas para la integridad personal" },
    { id: "iMG", label: "i) El acceso indebido o sin autorización a documentos, ficheros y servidores del centro" },
    { id: "jMG", label: "j) La grave perturbación del normal desarrollo de las actividades del centro y en general cualquier incumplimiento grave de las normas de conducta" },
    { id: "kMG", label: "k) La reiteración en el mismo trimestre de dos o más faltas graves" },
    { id: "lMG", label: "l) La incitación o estímulo a la comisión de una falta muy grave contraria a las normas de convivencia" },
    { id: "mMG", label: "m) El incumplimiento de una medida correctora impuesta por la comisión de una falta grave, así como el incumplimiento de las medidas dirigidas a reparar los daños o asumir su coste" },
  ],
};

const TIPOS   = ["Comportamiento", "Ausencia", "Académico", "Otro"];
const HORAS_RECTIFICAR = 48; // plazo para rectificar un parte tras ponerlo

// ─── Frases rápidas para la descripción del parte ────────────────────────────
// Frases breves y objetivas: describen lo que ocurre, sin juicios. Se añaden al texto y se pueden editar.
const FRASES_TIPO = {
  Comportamiento: ["Se le avisa varias veces y no rectifica.", "Continúa con la misma actitud tras la advertencia.", "Se le pide que salga un momento del aula para hablar con él/ella."],
  Ausencia: ["No presenta justificante.", "Se comunica a la familia y a la tutoría.", "No es la primera vez que ocurre."],
  Académico: ["No realiza la tarea propuesta en clase.", "No trae el material necesario.", "Se le ofrece ayuda y no la acepta."],
  Otro: ["Se informa a la tutoría.", "Se habla con el alumno/a al final de la clase.", "Se comunica a Jefatura de Estudios."],
};
const FRASES_TIPIFICACION = {
  "1L":  ["Interrumpe la explicación con comentarios en voz alta.", "Hace ruidos y distrae al grupo durante la clase.", "Se levanta de su sitio sin permiso repetidamente."],
  "2L":  ["No trae el material de la asignatura.", "No realiza las actividades propuestas en clase.", "Se niega a participar en la tarea del grupo."],
  "3L":  ["Llega tarde a clase sin justificación.", "Falta a clase sin justificación.", "Se incorpora al aula una vez empezada la clase sin motivo."],
  "4L":  ["Permanece en el pasillo durante el cambio de clase.", "Sale del aula sin permiso del profesor/a.", "Tarda en volver al aula tras salir con permiso."],
  "5L":  ["Habla continuamente con los compañeros e impide que trabajen.", "Molesta a un compañero/a que intenta hacer la tarea.", "Distrae a los compañeros de mesa durante la explicación."],
  "6L":  ["Contesta de malas formas a un compañero/a.", "Se dirige al profesor/a con un tono inadecuado.", "Hace un comentario despectivo a un compañero/a."],
  "7L":  ["Pinta o raya la mesa.", "Estropea material del aula.", "Daña una pertenencia de un compañero/a sin intención de hacerlo."],
  "8L":  ["Usa el móvil en clase sin permiso.", "Se le pide que guarde el móvil y no lo hace.", "Usa auriculares o un dispositivo electrónico sin permiso."],
  "9L":  ["No cumple la sanción impuesta por un parte leve anterior.", "No acude a la recuperación en el recreo.", "No entrega la tarea correctora que se le había pedido."],
  "10L": ["Lanza objetos en el aula.", "Come o bebe en clase sin permiso.", "No respeta las normas del aula."],
  aG:  ["Acumula faltas de asistencia injustificadas.", "Llega tarde a clase de forma reiterada sin justificación.", "La tutoría comunica la situación a Jefatura."],
  bG:  ["Impide de forma continuada que la clase se desarrolle con normalidad.", "Molesta a los compañeros durante el examen.", "Sigue impidiendo el estudio de los compañeros pese a los avisos."],
  cG:  ["Insulta a un compañero/a delante del grupo.", "Se burla de un compañero/a de forma reiterada.", "Falta al respeto a un miembro del personal del centro."],
  dG:  ["Se niega a seguir las indicaciones del profesor/a.", "Desafía al profesor/a delante del grupo.", "Se niega a cambiarse de sitio cuando se le pide."],
  eG:  ["Rompe intencionadamente material del centro.", "Causa daños en las instalaciones del centro.", "Daña el mobiliario del aula."],
  fG:  ["Esconde las pertenencias de un compañero/a.", "Coge sin permiso objetos de un compañero/a.", "Daña una pertenencia de un compañero/a."],
  gG:  ["Anima a sus compañeros a incumplir las normas.", "Incita a otros a salir del aula sin permiso.", "Provoca que otros compañeros alteren la clase."],
  hG:  ["Participa en una pelea con otro alumno/a.", "Se enfrenta físicamente a un compañero/a; ambos aceptan la pelea.", "Hay que separar a los alumnos implicados."],
  iG:  ["Altera de forma intencionada el desarrollo de la clase.", "Activa la alarma sin motivo.", "Provoca una interrupción que obliga a detener la actividad."],
  jG:  ["Reiteración de faltas leves en el mismo trimestre.", "Acumula varios partes leves este trimestre.", "Se comunica a Jefatura por la acumulación de partes."],
  kG:  ["Copia en el examen.", "Usa el móvil durante el examen.", "Entrega como propio un trabajo que no ha hecho."],
  lG:  ["Conocía una situación de acoso y no la comunicó.", "No avisa al profesorado de una situación de riesgo para un compañero/a.", "Oculta información sobre un incidente grave."],
  mG:  ["Difunde una foto de un compañero/a sin su permiso.", "Comparte en redes información de un miembro del centro.", "Graba a un compañero/a en clase sin permiso."],
  nG:  ["No cumple la medida correctora impuesta.", "No repara el daño causado como se le había pedido.", "No asume el coste del material dañado."],
  aMG: ["Insulta gravemente al profesor/a.", "Amenaza a un miembro del personal del centro.", "Se enfrenta al profesor/a de forma desafiante y agresiva."],
  bMG: ["Humilla de forma reiterada a un compañero/a.", "Se confirma una situación de acoso a un compañero/a.", "Aísla y excluye a un compañero/a de forma continuada."],
  cMG: ["Agrede físicamente a un compañero/a.", "Intimida a un compañero/a con amenazas.", "El compañero/a agredido necesita atención."],
  dMG: ["Dirige insultos discriminatorios a un compañero/a.", "Humilla a un compañero/a por su origen, sexo u otra circunstancia.", "Hace comentarios vejatorios delante del grupo."],
  eMG: ["Graba una agresión y la difunde.", "Comparte en redes un vídeo humillante de un compañero/a.", "Difunde contenido vejatorio sobre un miembro del centro."],
  fMG: ["Causa daños graves de forma intencionada en el centro.", "Destroza material o instalaciones del centro.", "Daña gravemente las pertenencias de otra persona."],
  gMG: ["Falsifica la firma de la familia.", "Se hace pasar por otra persona.", "Sustrae un documento académico."],
  hMG: ["Se le encuentra con una sustancia o un objeto peligroso.", "Ofrece a compañeros una sustancia perjudicial para la salud.", "Introduce en el centro un objeto peligroso."],
  iMG: ["Accede sin permiso a documentos o archivos del centro.", "Usa la contraseña de otra persona.", "Modifica sin autorización información del centro."],
  jMG: ["Provoca una alteración grave de la actividad del centro.", "Su conducta obliga a interrumpir la actividad del centro.", "Incumple gravemente las normas de conducta."],
  kMG: ["Reiteración de faltas graves en el mismo trimestre.", "Acumula dos o más partes graves este trimestre.", "Se comunica a Jefatura y a Dirección."],
  lMG: ["Incita a otros a agredir a un compañero/a.", "Anima a cometer una falta muy grave.", "Organiza a otros para incumplir gravemente las normas."],
  mMG: ["No cumple la medida correctora impuesta por una falta grave.", "Acude al centro durante los días de expulsión.", "No repara el daño causado como se le exigía."],
};
// ─── Horario del centro ──────────────────────────────────────────────────────
// Los nombres ("1ª hora", "Recreo"...) son la clave con la que se guardan los datos;
// el intervalo solo se muestra. La 7ª hora es solo para algunos grupos.
// Las horas de cada franja se cambian en Administración › Alumnos › «Horario del centro».
const HORARIO_POR_DEFECTO = {
  "1ª hora": "8:30 – 9:25",
  "2ª hora": "9:25 – 10:20",
  "3ª hora": "10:20 – 11:15",
  "Recreo":  "11:15 – 11:45",
  "4ª hora": "11:45 – 12:40",
  "5ª hora": "12:40 – 13:35",
  "6ª hora": "13:35 – 14:30",
  "7ª hora": "14:30 – 15:25",
};
const HORARIO = { ...HORARIO_POR_DEFECTO };
const HORAS = Object.keys(HORARIO);
const enMinutos = t => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
// Una franja vale si tiene inicio y fin con formato de hora y empieza antes de acabar
const tramoValido = t => { const p = String(t || "").split("–").map(x => x.trim()); return p.length === 2 && p.every(x => /^\d{1,2}:\d{2}$/.test(x)) && enMinutos(p[0]) < enMinutos(p[1]); };
function fijarHorario(cambios = {}) {
  HORAS.forEach(h => { HORARIO[h] = tramoValido(cambios[h]) ? cambios[h] : HORARIO_POR_DEFECTO[h]; });
}
const conTramo = h => HORARIO[h] ? `${h} · ${HORARIO[h]}` : h;
// Hora del horario en curso ahora mismo (o null fuera del horario)
function horaEnCurso(ahora = new Date()) {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  const aMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return HORAS.find(h => { const [ini, fin] = HORARIO[h].split("–").map(x => aMin(x.trim())); return min >= ini && min < fin; }) || null;
}
const MODULOS = ["Módulo A", "Módulo B", "Módulo C"];
const MOTIVOS = ["Enfermedad", "Asunto personal", "Formación", "Baja médica", "Otro"];
const ZONAS_GUARDIA = ["Patio A", "Patio B", "Pasillo Planta Baja", "Pasillo 1ª Planta", "Pasillo 2ª Planta", "Biblioteca", "Sala de Usos Múltiples", "Aula asignada", "Otra zona"];

// ─── CSV import ──────────────────────────────────────────────────────────────
const COLUMN_MAP = {
  nombre:   ["nombre", "alumno", "apellidos y nombre", "nombre y apellidos", "nombre completo", "alumno/a", "nombre alumno"],
  curso:    ["curso", "grupo", "unidad", "curso/grupo", "nivel", "clase"],
  tutor:    ["tutor", "tutor/a", "profesor tutor", "tutor grupo"],
  email:    ["email", "correo", "e-mail", "correo electrónico", "email familia", "correo familia", "email tutor"],
  telefono: ["teléfono", "telefono", "tel", "móvil", "movil", "teléfono familia", "tel familia", "tfno"],
  nia:      ["nia", "dni", "expediente", "nº expediente", "id alumno", "código alumno"],
};

function detectCol(headers, field) {
  const variants = COLUMN_MAP[field];
  return headers.findIndex(h => variants.some(v => h.toLowerCase().trim().includes(v)));
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, "").trim());
  const cols = {
    nombre:   detectCol(headers, "nombre"),
    curso:    detectCol(headers, "curso"),
    tutor:    detectCol(headers, "tutor"),
    email:    detectCol(headers, "email"),
    telefono: detectCol(headers, "telefono"),
    nia:      detectCol(headers, "nia"),
  };
  return lines.slice(1).map((line, i) => {
    const cells = line.split(sep).map(c => c.replace(/^"|"$/g, "").trim());
    return {
      id: Date.now() + i,
      nombre:   cols.nombre   >= 0 ? cells[cols.nombre]   : "",
      curso:    cols.curso    >= 0 ? cells[cols.curso]    : "",
      tutor:    cols.tutor    >= 0 ? cells[cols.tutor]    : "",
      email:    cols.email    >= 0 ? cells[cols.email]    : "",
      telefono: cols.telefono >= 0 ? cells[cols.telefono] : "",
      nia:      cols.nia      >= 0 ? cells[cols.nia]      : "",
    };
  }).filter(a => a.nombre);
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
const fmt  = d => new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtD = d => new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
const todayStr = () => new Date().toISOString().split("T")[0];
const weekKey  = d => { const dt = new Date(d), day = dt.getDay(), diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(new Date(d).setDate(diff)).toISOString().split("T")[0]; };
const gObj     = g => GRAVEDAD.find(x => x.id === g);

// ─── Storage ──────────────────────────────────────────────────────────────────
// Mientras la app no esté autorizada y en el servidor del centro, se muestra
// un aviso para no introducir datos reales. Poner a false cuando se autorice.
const MODO_DEMO = true;

const PERFILES = [
  { id: "profesor", label: "👨‍🏫 Profesor" },
  { id: "jefatura", label: "📊 Jefatura y Dirección" },
  { id: "admin",    label: "⚙️ Administración" },
];
const tabInicial = id => id === "jefatura" ? "dashboard" : id === "admin" ? "admin_panel" : "partes";

// ─── Cargos y acceso ─────────────────────────────────────────────────────────
// Cada profesor tiene un cargo, y el cargo decide a qué perfiles puede entrar.
const CARGOS = [
  { id: "profesor",   label: "Profesor/a",           perfiles: ["profesor"] },
  { id: "jefatura",   label: "Jefatura de Estudios", perfiles: ["profesor", "jefatura"] },
  { id: "direccion",  label: "Dirección",            perfiles: ["profesor", "jefatura", "admin"] },
  { id: "secretaria", label: "Secretaría",           perfiles: ["profesor", "admin"] },
  { id: "tic",        label: "Coordinación TIC",     perfiles: ["profesor", "admin"] },
  { id: "orientacion", label: "Orientación",         perfiles: ["profesor", "jefatura"] },
];
// Cargos de ejemplo (profesorado ficticio); el resto es Profesor/a
const CUENTAS_DEMO = { "Luis García": { cargos: ["profesor", "direccion"] }, "Ana Jiménez": { cargos: ["profesor", "jefatura"] }, "Elena Vega": { cargos: ["profesor", "tic"] } };
// Una persona puede tener varios cargos a la vez (p. ej. Profesor/a + Coordinación TIC)
const cargosIds = cuenta => { const l = cuenta?.cargos?.length ? cuenta.cargos : [cuenta?.cargo || "profesor"]; return ["profesor", ...l.filter(c => c !== "profesor" && CARGOS.some(x => x.id === c))]; };
const cargoDe = (cuentas, nombre) => {
  const ids = cargosIds(cuentas?.[nombre]); const lista = ids.map(id => CARGOS.find(c => c.id === id));
  return { id: ids[ids.length - 1], ids, label: lista.map(c => c.label).join(" · "), perfiles: [...new Set(lista.flatMap(c => c.perfiles))] };
};
// Un perfil por cada cargo de la persona (Profesor/a, Jefatura, Orientación, TIC…)
const NOMBRE_PERFIL = { profesor: "Profesor/a", jefatura: "Convivencia y estadísticas", admin: "Administración" };
const perfilesPermitidos = (cuentas, nombre) => cargoDe(cuentas, nombre).ids.flatMap(cid => {
  const c = CARGOS.find(x => x.id === cid);
  const ps = cid === "profesor" ? ["profesor"] : c.perfiles.filter(x => x !== "profesor");
  return ps.map(pid => ({ id: pid, key: `${cid}-${pid}`, cargo: cid, label: ps.length > 1 ? `${c.label} · ${NOMBRE_PERFIL[pid]}` : c.label }));
});
const MIN_CLAVE = 6;
// Las claves nunca se guardan tal cual: solo su huella SHA-256 (requiere conexión segura HTTPS).
// En esta versión de demostración se guardan en el navegador; en el servidor del centro irán al servidor.
async function hashClave(nombre, clave) {
  if (!window.crypto?.subtle) throw new Error("sin-https");
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(`galvandesk|${nombre}|${clave}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Pantalla de entrada: nombre → clave → perfil ───────────────────────────
function PantallaEntrada({ profesores, cuentas, setCuentas, onEntrar, onCargarEjemplo, nombreSugerido, tutoraDemo, sinLeerPor = {} }) {
  // Demostración: globo de bienvenida con los pasos, la primera vez en esta pestaña
  const [globo, setGlobo] = useState(() => { try { return MODO_DEMO && !sessionStorage.getItem("galvandesk:globo"); } catch { return MODO_DEMO; } });
  const [ejemploListo, setEjemploListo] = useState(() => { try { return !!sessionStorage.getItem("galvandesk:ejemplo"); } catch { return false; } });
  const cerrarGlobo = () => { setGlobo(false); try { sessionStorage.setItem("galvandesk:globo", "1"); } catch { /* sin almacenamiento */ } };
  const cargarEjemplo = () => { onCargarEjemplo(); setEjemploListo(true); try { sessionStorage.setItem("galvandesk:ejemplo", "1"); } catch { /* sin almacenamiento */ } };
  const [paso, setPaso] = useState("nombre");
  const [nombre, setNombre] = useState(nombreSugerido || "");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (nombreSugerido) { setNombre(nombreSugerido); setPaso("nombre"); setError(""); } }, [nombreSugerido]);

  const tieneClave = !!cuentas[nombre]?.clave;
  const permitidos = perfilesPermitidos(cuentas, nombre);
  const cargo = cargoDe(cuentas, nombre);

  function continuar() {
    const n = nombre.trim();
    if (!profesores.includes(n)) { setError("Ese nombre no está en la lista del profesorado. Elígelo de la lista o pide a Administración que te añada."); return; }
    setNombre(n); setError(""); setClave(""); setClave2(""); setPaso("clave");
  }
  async function entrar() {
    try {
      if (!tieneClave) {
        if (clave.length < MIN_CLAVE) { setError(`La clave debe tener al menos ${MIN_CLAVE} caracteres.`); return; }
        if (clave !== clave2) { setError("Las dos claves no coinciden."); return; }
        const h = await hashClave(nombre, clave);
        setCuentas(prev => ({ ...prev, [nombre]: { ...(prev[nombre] || {}), clave: h } }));
      } else if (await hashClave(nombre, clave) !== cuentas[nombre].clave) {
        setError("Clave incorrecta."); setClave(""); return;
      }
    } catch { setError("La conexión no es segura (HTTPS): no se pueden comprobar las claves."); return; }
    setError(""); setClave(""); setClave2("");
    if (permitidos.length === 1) onEntrar(nombre, permitidos[0]); else setPaso("perfil");
  }

  // Estilos del acceso de la demostración
  const btnPrincipal = { display: "block", width: "100%", minHeight: 52, padding: "0 20px", marginTop: 6, background: R.azul, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 19, fontWeight: 700 };
  const enlace = { background: "none", border: "none", color: R.azul, cursor: "pointer", fontSize: 15, fontWeight: 600, marginTop: 14, minHeight: 32, padding: 0 };

  const pasoNum = (n, activo) => <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: activo ? R.azul : R.gris, color: activo ? "#fff" : R.petroleo, fontSize: 14, fontWeight: 800, marginRight: 8, flexShrink: 0 }}>{n}</span>;
  const tutora = tutoraDemo || { nombre: "Carmen López", curso: "1º ESO A" };
  // Demostración: elegir un perfil carga los datos de ejemplo (ficticios) y entra, sin nombre ni clave
  const entrarDemo = accion => { if (!ejemploListo) cargarEjemplo(); accion(); };
  const perfilesDemo = [
    { txt: "👨‍🏫 Profesor/a", sub: `${nombreSugerido || "María Fernández"} · poner partes, guardias y Galvángram`, accion: () => onEntrar(nombreSugerido || "María Fernández", PERFILES[0]) },
    { txt: "🏫 Tutor/a de un grupo", sub: `${tutora.nombre} · tutoría de ${tutora.curso} y familias`, accion: () => onEntrar(tutora.nombre, PERFILES[0]) },
    { txt: "📊 Jefatura y Dirección", sub: "Ana Jiménez · convivencia, guardias y ausencias", accion: () => onEntrar("Ana Jiménez", PERFILES[1]) },
    { txt: "⚙️ Administración", sub: "Elena Vega · alumnado, profesorado y centro", accion: () => onEntrar("Elena Vega", PERFILES[2]) },
  ];
  const accesoDemo = MODO_DEMO ? (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 15, color: R.noche }}><b>Elige un perfil</b> · sin clave y con datos de ejemplo</div>
      <div className="gd-perfiles" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
      {perfilesDemo.map(b => (
        <button key={b.txt} onClick={() => entrarDemo(b.accion)}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", minHeight: 48, padding: "4px 12px", background: C.white, border: `3px solid ${R.turquesa}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: R.petroleo }}><ConIcono texto={b.txt} tam={24} /></span>
            <span style={{ display: "block", fontSize: 13, color: R.noche, lineHeight: 1.3 }}>{b.sub}</span>
          </span>
        </button>
      ))}
      </div>
      {/* Entrar como cualquier profe (p. ej. quien ha recibido un aviso de Galvángram) */}
      {(ejemploListo || profesores.length > 4) && (() => {
        const conAvisos = profesores.filter(p => sinLeerPor[p]).sort((a, b) => sinLeerPor[b].urgentes - sinLeerPor[a].urgentes || a.localeCompare(b));
        const resto = profesores.filter(p => !sinLeerPor[p]).sort((a, b) => a.localeCompare(b));
        const etiqueta = p => { const n = sinLeerPor[p]; return n ? `${p} · ${n.urgentes ? "🚨" : "🔔"} ${n.total} mensaje(s) nuevo(s)` : p; };
        return (
          <select id="gd-otro-profe" aria-label="Entrar como otro profe del claustro" value="" onChange={e => { const n = e.target.value; if (n) entrarDemo(() => onEntrar(n, PERFILES[0], { otro: true })); }}
            style={{ width: "100%", minHeight: 48, padding: "8px 12px", borderRadius: 8, border: `3px dashed ${R.turquesa}`, fontSize: 15, fontFamily: "inherit", color: R.noche, background: "#fff" }}>
            <option value="">👥 Entrar como otro profe del claustro…</option>
            {conAvisos.length > 0 && <optgroup label="Con mensajes sin leer">{conAvisos.map(p => <option key={p} value={p}>{etiqueta(p)}</option>)}</optgroup>}
            <optgroup label="Todo el claustro">{resto.map(p => <option key={p} value={p}>{p}</option>)}</optgroup>
          </select>
        );
      })()}
    </div>
  ) : null;

  const globoBienvenida = MODO_DEMO && globo ? (
    <div role="dialog" aria-modal="true" aria-labelledby="gd-globo-titulo" onClick={cerrarGlobo}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, maxWidth: 460, width: "100%", padding: "28px 26px", textAlign: "left", borderTop: `8px solid ${R.mostaza}` }}>
        <Icono nombre="saludo" tam={64} style={{ margin: "0 auto" }} />
        <h2 id="gd-globo-titulo" style={{ color: R.petroleo, textAlign: "center", margin: "6px 0 4px", fontSize: 26, fontFamily: TITULO, fontWeight: 400 }}>Bienvenida/o a la demostración</h2>
        <p style={{ color: C.gray, textAlign: "center", fontSize: 14, margin: "0 0 18px" }}>Todo es ficticio. Sigue estos pasos:</p>
        {[
          ["Elige qué quieres probar", "Profesor/a, Tutor/a, Jefatura o Administración, en la tarjeta «Acceso». Solo tienes que pulsar: se cargan datos de ejemplo. No escribas nombre ni clave."],
          ["Muévete con los botones de arriba", "Los botones de colores cambian de pantalla. En cada una hay una ayuda «Cómo se usa»."],
          ["Para cambiar de perfil, pulsa «Salir»", "Vuelves a esta pantalla y eliges otro."],
          ["Todo es ficticio", "Puedes poner partes, guardias y mensajes sin miedo: nada sale de este navegador."],
        ].map(([t, d], i) => (
          <div key={t} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            {pasoNum(i + 1, true)}
            <div><div style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}>{t}</div><div style={{ fontSize: 14, color: C.gray }}>{d}</div></div>
          </div>
        ))}
        <button autoFocus onClick={() => { if (!ejemploListo) cargarEjemplo(); cerrarGlobo(); }} style={{ ...btnPrincipal, marginTop: 14 }}>▶ Empezar (cargar los datos de ejemplo)</button>
        <button onClick={cerrarGlobo} style={{ ...enlace, display: "block", margin: "12px auto 0" }}>Cerrar</button>
      </div>
    </div>
  ) : null;

  // Portada: cabecera con el logotipo y la ayuda, ilustración del camino y tarjeta de acceso.
  // Los pasos de acceso (nombre, clave, perfil) y el acceso de la demostración son los de siempre.
  const [verOlvido, setVerOlvido] = useState(false);
  const [verClave, setVerClave] = useState(false);
  // En la demostración la tarjeta muestra los perfiles; «Entrar con nombre y clave» enseña el acceso real
  const [conClave, setConClave] = useState(!MODO_DEMO);
  const campo = { width: "100%", minHeight: 50, padding: "10px 14px", borderRadius: 8, border: `3px solid ${R.turquesa}`, fontSize: 17, fontFamily: "inherit", color: R.noche, background: "#F4F9FC", boxSizing: "border-box" };
  const etiqueta = { display: "block", fontSize: 15, fontWeight: 700, color: R.petroleo, marginBottom: 6 };
  const principal = { width: "100%", minHeight: 52, background: R.turquesa, color: R.noche, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 20, fontWeight: 700 };
  const secundario = { width: "100%", minHeight: 48, background: "#fff", color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700 };
  const enlaceAcceso = { background: "none", border: "none", color: R.azul, cursor: "pointer", fontSize: 15, minHeight: 40, padding: 0, fontFamily: "inherit" };
  const fallo = error && <div role="alert" style={{ background: R.crema, color: R.noche, borderLeft: `6px solid ${R.mostaza}`, fontSize: 15, fontWeight: 600, padding: "8px 12px" }}>⚠️ {error}</div>;
  const menu = [
    { txt: "¿Qué es?", corto: "¿Qué es?", icono: "como-se-usa", accion: () => abrirPreguntas("oficial") },
    { txt: "Manual de uso", corto: "Manual", icono: "deberes", href: "/manual/" },
    { txt: "Preguntas frecuentes", corto: "Preguntas", icono: "mensajes", accion: () => abrirPreguntas() },
    { txt: "Instalar la app", corto: "Instalar", icono: "importar", accion: () => abrirPreguntas("instalar") },
  ];
  const mostrarClave = (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: R.noche, minHeight: 40, cursor: "pointer" }}>
      <input type="checkbox" checked={verClave} onChange={e => setVerClave(e.target.checked)} style={{ width: 22, height: 22, accentColor: R.azul }} />Mostrar la clave
    </label>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", color: R.petroleo, fontFamily: FUENTE, overflowX: "hidden",
      // La ilustración ocupa todo el fondo; encima, la cabecera y la tarjeta de acceso
      background: "#E3EAF0 url(/portada-ilustracion.jpg) left 30% center / cover no-repeat" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }
        .gd-portada-menu a, .gd-portada-menu button { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 6px; background: none; border: none; color: ${R.noche}; font-size: 17px; font-family: inherit; cursor: pointer; text-decoration: none; }
        .gd-portada-menu a:hover, .gd-portada-menu button:hover { color: ${R.azul}; text-decoration: underline; }
        .gd-corto { display: none; }
        @media (max-width: 860px) {
          .gd-portada-escena { padding: 0 !important; align-items: stretch !important; }
          .gd-portada-banda { grid-template-columns: 1fr !important; padding: 14px 12px !important; gap: 10px !important; }
          .gd-portada-titulo div:last-child { display: none; }
          .gd-perfiles { grid-template-columns: 1fr !important; }
          .gd-portada-cab { padding: 8px 16px !important; }
          .gd-portada-cab h1 img { height: 52px !important; }
          .gd-portada-menu { width: 100%; justify-content: space-between; gap: 0 !important; }
          .gd-portada-menu a, .gd-portada-menu button { flex-direction: column; gap: 2px; font-size: 14px; padding: 0; }
          .gd-portada-menu img { width: 30px !important; height: 30px !important; }
          .gd-largo { display: none; } .gd-corto { display: inline; }
        }`}</style>
      {globoBienvenida}
      <AvisoDemo compacto />

      {/* Tarjeta centrada sobre la ilustración: cabecera, banda de acceso y enlaces */}
      <div className="gd-portada-escena" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 28px" }}>
      <div className="gd-portada-tarjeta" style={{ width: "100%", maxWidth: 1000, background: "rgba(255, 255, 255, .97)", boxShadow: "0 24px 50px rgba(22, 51, 63, .28)" }}>
      <header className="gd-portada-cab" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px 24px", flexWrap: "wrap", padding: "14px 32px" }}>
        <h1 style={{ margin: 0 }}><Logo alto={64} /></h1>
        <nav aria-label="Ayuda" className="gd-portada-menu" style={{ display: "flex", flexWrap: "wrap", gap: "0 22px", alignItems: "center" }}>
          {menu.map(m => m.href
            ? <a key={m.txt} href={m.href} target="_blank" rel="noopener" aria-label={m.txt}><Icono nombre={m.icono} tam={34} /><span className="gd-largo">{m.txt}</span><span className="gd-corto">{m.corto}</span></a>
            : <button key={m.txt} type="button" onClick={m.accion} aria-label={m.txt}><Icono nombre={m.icono} tam={34} /><span className="gd-largo">{m.txt}</span><span className="gd-corto">{m.corto}</span></button>)}
        </nav>
      </header>

        <div className="gd-portada-banda" style={{ background: `linear-gradient(100deg, ${R.azul} 0%, ${R.petroleo} 60%, #3F7F98 100%)`, padding: "22px 32px", display: "grid", gridTemplateColumns: "minmax(170px, 230px) minmax(0, 1fr)", gap: 28, alignItems: "center" }}>
          <div className="gd-portada-titulo" style={{ color: "#fff" }}>
            <div style={{ fontFamily: TITULO, fontSize: 34, lineHeight: 1.1 }}>Acceso</div>
            <div style={{ fontSize: 15, marginTop: 6 }}>{CENTRO} · {CIUDAD}</div>
            <div style={{ fontSize: 16, marginTop: 16, borderTop: "1px solid rgba(255,255,255,.4)", paddingTop: 12 }}>Todo lo que importa en tu aula</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 8, padding: "12px 16px 4px", display: "grid", gap: 8 }}>
            {paso === "nombre" && !conClave && accesoDemo}
            {paso === "nombre" && MODO_DEMO && conClave && (
              <button type="button" onClick={() => { setConClave(false); setError(""); }} style={{ ...enlaceAcceso, justifySelf: "center", fontWeight: 700 }}>
                ← Volver a los perfiles de la demostración
              </button>
            )}

            {paso === "nombre" && conClave && <>
              <div>
                <label style={etiqueta} htmlFor="gd-nombre">¿Quién eres?</label>
                <input id="gd-nombre" type="text" placeholder="Tu nombre" list="lista-profesores" value={nombre} autoComplete="off"
                  onChange={e => { setNombre(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter") continuar(); }} style={campo} />
                <datalist id="lista-profesores">{profesores.map(p => <option key={p} value={p} />)}</datalist>
                <div style={{ fontSize: 14, marginTop: 6 }}>Escribe y elige tu nombre de la lista.</div>
              </div>
              {fallo}
              <button onClick={continuar} style={principal}>Continuar</button>
            </>}

            {paso === "clave" && <>
              <div style={{ fontSize: 17, color: R.noche }}><b>Hola, {nombre}</b><div style={{ fontSize: 15, color: R.petroleo }}>{cargo.label}</div></div>
              {tieneClave ? (
                <div>
                  <label style={etiqueta} htmlFor="gd-clave">Tu clave</label>
                  <input id="gd-clave" type={verClave ? "text" : "password"} autoComplete="current-password" autoFocus value={clave}
                    onChange={e => { setClave(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter") entrar(); }} style={campo} />
                </div>
              ) : <>
                <div style={{ fontSize: 15, background: R.azulClaro, padding: "8px 12px" }}>Es la primera vez que entras. Crea tu clave personal (mínimo {MIN_CLAVE} caracteres).</div>
                <div>
                  <label style={etiqueta} htmlFor="gd-clave">Nueva clave</label>
                  <input id="gd-clave" type={verClave ? "text" : "password"} autoComplete="new-password" autoFocus value={clave} onChange={e => { setClave(e.target.value); setError(""); }} style={campo} />
                </div>
                <div>
                  <label style={etiqueta} htmlFor="gd-clave2">Repite la clave</label>
                  <input id="gd-clave2" type={verClave ? "text" : "password"} autoComplete="new-password" value={clave2}
                    onChange={e => { setClave2(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter") entrar(); }} style={campo} />
                </div>
              </>}
              {mostrarClave}
              {fallo}
              <button onClick={entrar} style={principal}>Entrar</button>
              {MODO_DEMO && (
                <button onClick={() => { setError(""); if (permitidos.length === 1) onEntrar(nombre, permitidos[0]); else setPaso("perfil"); }} style={secundario}>
                  🧪 Entrar sin clave (solo en la demostración)
                </button>
              )}
              <button onClick={() => { setPaso("nombre"); setClave(""); setClave2(""); setError(""); }} style={{ ...enlaceAcceso, justifySelf: "start" }}>← No soy {nombre}</button>
            </>}

            {paso === "perfil" && <>
              <div style={{ fontSize: 16, color: R.noche }}><b>¿Con qué perfil entras?</b><div style={{ fontSize: 15, color: R.petroleo }}>Según tu cargo ({cargo.label}) puedes usar estos perfiles.</div></div>
              {permitidos.map(p => (
                <button key={p.key || p.id} onClick={() => onEntrar(nombre, p)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, padding: "6px 14px", background: "#fff", border: `3px solid ${R.turquesa}`, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700, color: R.petroleo, textAlign: "left" }}>
                  <Icono nombre={iconoPerfil(p)} tam={40} />{sinEmoji1(p.label)}
                </button>
              ))}
              <button onClick={() => setPaso("nombre")} style={{ ...enlaceAcceso, justifySelf: "start" }}>← Cambiar de persona</button>
            </>}

            <div style={{ borderTop: `1px solid ${R.turquesaClaro}`, paddingTop: 4, display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "0 18px" }}>
              {MODO_DEMO && !conClave && paso === "nombre" && <>
                <button type="button" onClick={() => { setConClave(true); setError(""); }} style={{ ...enlaceAcceso, fontWeight: 700 }}>Entrar con nombre y clave</button>
              </>}
              {MODO_DEMO && !conClave
                ? <button type="button" onClick={() => setGlobo(true)} style={enlaceAcceso}>Cómo probarla</button>
                : <button type="button" onClick={() => setVerOlvido(v => !v)} style={enlaceAcceso}>¿Has olvidado tu clave?</button>}
              <button type="button" onClick={() => abrirPreguntas("datos")} style={enlaceAcceso}>Protección de datos</button>
            </div>
            {verOlvido && <div style={{ fontSize: 15, color: R.noche, background: R.crema, padding: "8px 12px" }}>Pide a Administración del centro que restablezca tu clave. La próxima vez que entres crearás una nueva.</div>}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
const AvisoDemo = ({ compacto }) => MODO_DEMO ? (
  <div role="note" style={compacto
    ? { background: R.mostaza, color: R.noche, fontSize: 14, fontWeight: 700, lineHeight: 1.35, textAlign: "center", padding: "8px 16px" }
    : { background: "#FDF1D9", color: "#16333F", fontSize: 14, fontWeight: 600, borderRadius: 10, padding: "10px 12px", marginBottom: 20, border: "1px solid #F6C862", lineHeight: 1.4 }}>
    ⚠️ Versión de demostración: no introducir datos reales de alumnos ni familias.
    {!compacto && <div style={{ marginTop: 6, fontWeight: 500 }}>Sigue los pasos <b>1</b> y <b>2</b> del recuadro verde de abajo. No necesitas nombre ni clave.</div>}
  </div>
) : null;

// Guardado en el navegador (localStorage). Los datos se conservan al recargar,
// pero cada navegador/dispositivo guarda los suyos. Paso previo al servidor del centro.
const PREFIJO = "galvandesk:";
async function sGet(k) {
  try { const v = localStorage.getItem(PREFIJO + k); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
async function sSet(k, v) {
  try { localStorage.setItem(PREFIJO + k, JSON.stringify(v)); }
  catch (e) { console.error("No se pudo guardar", k, e); }
}
// Sesión: recuerda quién ha entrado y con qué perfil
function leerSesion() {
  try { const v = localStorage.getItem(PREFIJO + "sesion"); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function guardarSesion(sesion) {
  try {
    if (sesion) localStorage.setItem(PREFIJO + "sesion", JSON.stringify(sesion));
    else localStorage.removeItem(PREFIJO + "sesion");
  } catch { /* navegador sin almacenamiento: se sigue sin recordar */ }
}

// ─── Componentes base ─────────────────────────────────────────────────────────
// Botón principal: azul de Raíces con texto blanco
const Btn = ({ onClick, disabled, children, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? R.gris : R.azul, color: disabled ? R.petroleo : "#fff", opacity: disabled ? .7 : 1, border: "none", borderRadius: 6, minHeight: 48, padding: "0 20px", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 17, transition: "opacity .15s", ...style }}>
    {children}
  </button>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 20, marginBottom: 14, ...style }}>{children}</div>
);

// ─── Iconos de la app (public/iconos) ───────────────────────────────────────
// Sustituyen al emoji del principio de cada etiqueta; el resto del texto se mantiene.
const ICONO_EMOJI = {
  "📊": "dashboard", "🏫": "por-curso", "👤": "por-alumno", "📋": "partes", "👨‍🎓": "partes", "🚻": "banos",
  "🔔": "alertas", "📤": "informe", "📄": "informe", "📈": "estadisticas", "🔄": "guardias", "💬": "mensajes",
  "📢": "profe-ausente", "🗂": "documentos", "📅": "horario", "👥": "grupos", "✍": "tareas", "⚙": "cargo-administracion",
  "👨‍🏫": "profesorado", "🟡": "leve", "⚠": "grave", "🔴": "muy-grave",
  "🔍": "buscar", "⏰": "hora", "📂": "tipo-parte", "🎯": "gravedad-campo", "⚖": "tipificacion", "📝": "descripcion",
};
const ICONO_TEXTO = [[/^Profesor\/a$/, "cargo-profesor"], [/^Tutor\/a de un grupo/, "tutor"], [/^Como tutor\/a/, "tutor"], [/^Como profesor\/a/, "cargo-profesor"], [/^Profesor responsable/, "profesor"], [/^Generar Parte/, "generar"], [/^Coordinación/, "eventos"], [/^Parte del Día/, "estado-general"], [/^Ver Guardias/, "horario"], [/^Ausencias de Profesores/, "profe-ausente"]];
function iconoDe(texto) {
  const m = String(texto ?? "").match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?)\s*(.*)$/su);
  if (!m) return { icono: null, resto: texto };
  const emoji = m[1].replace(/\uFE0F/g, ""), resto = m[2];
  const porTexto = ICONO_TEXTO.find(([re]) => re.test(resto))?.[1];
  const icono = porTexto || ICONO_EMOJI[emoji];
  return icono ? { icono, resto } : { icono: null, resto: texto };
}
const Icono = ({ nombre, tam = 24, style = {} }) => (
  <img src={`/iconos/${nombre}.svg`} alt="" width={tam} height={tam} style={{ width: tam, height: tam, borderRadius: "50%", flexShrink: 0, display: "block", ...style }} />
);
function ConIcono({ texto, tam = 24, gap = 8 }) {
  const { icono, resto } = iconoDe(texto);
  if (!icono) return <>{texto}</>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap, verticalAlign: "middle" }}><Icono nombre={icono} tam={tam} /><span>{resto}</span></span>;
}


// Icono pequeño dentro de un texto, y texto que cambia sus emojis por iconos
const EMOJI_EN_TEXTO = { "⚠️": "aviso", "⚠": "aviso", "🛡️": "titular", "🛡": "titular", "👥": "apoyo", "🔁": "sustituto", "📚": "deberes", "🏫": "aula", "👤": "titular", "📍": "edificio", "📌": "material", "✍️": "firmar", "✍": "firmar", "📋": "pasar-lista", "🕐": "hora-reloj", "⏰": "hora-reloj", "📅": "fecha-hora", "📝": "ejercicios", "📞": "profe-ausente", "📢": "profe-ausente", "🚻": "banos", "🔄": "guardias", "🔔": "alertas" };
const Ic = ({ n, tam = 20 }) => <img src={`/iconos/${n}.svg`} alt="" width={tam} height={tam} style={{ width: tam, height: tam, borderRadius: "50%", display: "inline-block", verticalAlign: "middle", margin: "0 4px 2px 0" }} />;
const RE_EMOJI_TEXTO = new RegExp("(" + Object.keys(EMOJI_EN_TEXTO).sort((a, b) => b.length - a.length).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s?", "u");
function partirEmojis(texto, tam) {
  const trozos = String(texto).split(RE_EMOJI_TEXTO);
  return trozos.map((t, i) => (i % 2 === 1 ? <Ic key={i} n={EMOJI_EN_TEXTO[t]} tam={tam} /> : t));
}
function Ti({ children, tam = 20 }) {
  const arr = Array.isArray(children) ? children : [children];
  return <>{arr.map((ch, i) => (typeof ch === "string" ? <span key={i}>{partirEmojis(ch, tam)}</span> : ch))}</>;
}

// Icono de cada perfil de acceso y desplegable con iconos para cambiar de perfil
const PERFIL_ICONO_BASE = { profesor: "cargo-profesor", jefatura: "cargo-jefatura", admin: "cargo-administracion" };
const iconoPerfil = p => (p?.cargo && p.cargo !== "profesor" && ICONO_CARGO[p.cargo]) || PERFIL_ICONO_BASE[p?.id];
const sinEmoji1 = t => iconoDe(t).resto;
function SelectorPerfil({ perfiles, actual, onCambiar, cargos = "" }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const esc = e => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", cerrar); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", cerrar); document.removeEventListener("keydown", esc); };
  }, [abierto]);
  const igual = (p, q) => (p.key && q.key) ? p.key === q.key : p.id === q.id;
  const a = perfiles.find(p => igual(p, actual)) || perfiles.find(p => p.id === actual.id) || actual;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setAbierto(v => !v)} aria-haspopup="listbox" aria-expanded={abierto} title="Cambiar de perfil"
        style={{ display: "flex", alignItems: "center", gap: 8, background: R.azulClaro, border: "none", color: R.petroleo, borderRadius: 22, minHeight: 44, padding: "4px 14px 4px 6px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
        <Icono nombre={iconoPerfil(a)} tam={28} />{sinEmoji1(a.label)} <span style={{ fontSize: 13 }}>▼</span>
      </button>
      {abierto && (
        <div role="listbox" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.2)", padding: 6, zIndex: 300, minWidth: 240 }}>
          {cargos && <div style={{ padding: "6px 10px 8px", fontSize: 13, color: "#2B647E", borderBottom: "1px solid #eef2f4", marginBottom: 4, maxWidth: 280 }}>Tus cargos: <b style={{ color: "#2C4A52" }}>{cargos}</b></div>}
          {perfiles.map(p => (
            <button key={p.key || p.id} role="option" aria-selected={igual(p, a)} onClick={() => { setAbierto(false); onCambiar(p.key || p.id); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: 8, background: igual(p, a) ? "#DDF0F4" : "transparent", color: "#2C4A52", cursor: "pointer", fontSize: 14, fontWeight: igual(p, a) ? 700 : 500 }}>
              <Icono nombre={iconoPerfil(p)} tam={34} /><span style={{ flex: 1, whiteSpace: "nowrap" }}>{sinEmoji1(p.label)}</span>{igual(p, a) ? "✓" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const Badge = ({ g }) => {
  const gv = gObj(g);
  return <span style={{ background: gv.color, color: gv.texto, borderRadius: 4, padding: "4px 10px 4px 4px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}><ConIcono texto={gv.label} tam={20} gap={5} /></span>;
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 16 }}>
    <span style={{ color: R.petroleo, fontWeight: 700, minWidth: 140 }}>{label}</span>
    <span style={{ color: R.noche, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
  </div>
);

function CopyBtn({ getText, label = "📋 Copiar texto" }) {
  const [ok, setOk] = useState(false);
  function copy() {
    const t = getText();
    navigator.clipboard.writeText(t)
      .then(() => { setOk(true); setTimeout(() => setOk(false), 2500); })
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = t; ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy");
        document.body.removeChild(ta); setOk(true); setTimeout(() => setOk(false), 2500);
      });
  }
  return (
    <button onClick={copy} style={{ background: ok ? R.verde : C.white, color: ok ? R.noche : R.petroleo, border: `2px solid ${ok ? R.verde : R.azul}`, borderRadius: 6, minHeight: 48, padding: "0 18px", cursor: "pointer", fontWeight: 700, fontSize: 17, transition: "all .2s" }}>
      {ok ? "✅ ¡Copiado!" : label}
    </button>
  );
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
// Los PDF se crean como documentos de texto (no como capturas de pantalla):
// se descargan igual en el móvil, en Safari y en Chrome, pesan poco y no cortan columnas.
const OSCURO = [44, 74, 82], VERDE = [68, 161, 148], GRIS = [100, 116, 139];
const sinEmoji = t => String(t ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, "").replace(/\s+/g, " ").trim();
const nombreArchivo = t => sinEmoji(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
function cabeceraPDF(doc, titulo, subtitulo) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text(`${CENTRO.toUpperCase()} · ${CIUDAD.toUpperCase()}`, w / 2, 14, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...OSCURO);
  doc.text(titulo, w / 2, 22, { align: "center" });
  if (subtitulo) { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS); doc.text(sinEmoji(subtitulo), w / 2, 28, { align: "center", maxWidth: w - 28 }); }
  doc.setDrawColor(...VERDE); doc.setLineWidth(0.6); doc.line(14, 32, w - 14, 32);
  doc.setTextColor(0);
  return 38;
}
function guardarPDF(doc, archivo) {
  const n = doc.getNumberOfPages(), w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  const hoy = new Date().toLocaleDateString("es-ES");
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    // Logotipo del centro al pie (Administración › Datos del centro): 1 cm de alto como mucho
    if (LOGO_CENTRO) {
      const prop = LOGO_CENTRO.w / LOGO_CENTRO.h;
      let alto = 10, ancho = alto * prop;
      if (ancho > 120) { ancho = 120; alto = ancho / prop; }
      try { doc.addImage(LOGO_CENTRO.data, "PNG", (w - ancho) / 2, h - 12 - alto, ancho, alto); } catch { /* imagen no válida: el PDF sale sin ella */ }
    }
    doc.text(`${APP} · ${CENTRO} · ${hoy} · Página ${i} de ${n}`, w / 2, h - 8, { align: "center" });
  }
  // Si el visor está abierto en la página, el informe se ve primero en pantalla
  if (visor.pdf) visor.pdf({ url: URL.createObjectURL(doc.output("blob")), archivo, paginas: n });
  else doc.save(archivo);
}

// ─── Visor en pantalla de informes (PDF) y hojas de cálculo (Excel) ──────────
const visor = { pdf: null, excel: null };
const descargarURL = (url, archivo) => { const a = document.createElement("a"); a.href = url; a.download = archivo; document.body.appendChild(a); a.click(); a.remove(); };
export function VisorDocumentos() {
  const [pdf, setPdf] = useState(null);     // { url, archivo, paginas }
  const [excel, setExcel] = useState(null); // { hojas: [{ nombre, cabecera, filas }], archivo, descargar }
  const [hojaSel, setHojaSel] = useState(0);
  const [busca, setBusca] = useState("");
  const marco = useRef(null);
  useEffect(() => {
    visor.pdf = d => setPdf(prev => { if (prev) URL.revokeObjectURL(prev.url); return d; });
    visor.excel = d => { setHojaSel(0); setBusca(""); setExcel(d); };
    return () => { visor.pdf = null; visor.excel = null; };
  }, []);
  const cerrar = () => { if (pdf) URL.revokeObjectURL(pdf.url); setPdf(null); setExcel(null); };
  useEffect(() => {
    if (!pdf && !excel) return;
    const f = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); cerrar(); } };
    window.addEventListener("keydown", f, true); return () => window.removeEventListener("keydown", f, true);
  });
  if (!pdf && !excel) return null;
  const barra = { position: "sticky", top: 0, zIndex: 2, background: R.azul, color: "#fff", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" };
  const bb = { background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14 };
  const fondo = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "stretch", justifyContent: "center", padding: "2vh 2vw", fontFamily: "system-ui,sans-serif" };
  const caja = { background: C.white, borderRadius: 14, width: "100%", maxWidth: 1200, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" };

  if (pdf) return (
    <div style={fondo} onClick={cerrar}>
      <div style={caja} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Vista previa del informe">
        <div style={barra}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}><Ic n="buscar" tam={20} />Vista previa</div>
            <div style={{ fontSize: 14, opacity: .85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pdf.archivo} · {pdf.paginas} página(s)</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...bb, background: "#fff", color: C.dark }} onClick={() => descargarURL(pdf.url, pdf.archivo)}>⬇️ Descargar PDF</button>
            <button style={bb} onClick={() => { try { marco.current.contentWindow.focus(); marco.current.contentWindow.print(); } catch { window.open(pdf.url, "_blank"); } }}><Ic n="informe" tam={20} />Imprimir</button>
            <button style={bb} onClick={() => window.open(pdf.url, "_blank")}>↗ Abrir en otra pestaña</button>
            <button style={bb} onClick={cerrar} aria-label="Cerrar">✕</button>
          </div>
        </div>
        <iframe ref={marco} title="Vista previa del informe" src={pdf.url} style={{ flex: 1, width: "100%", border: "none", background: "#525659", minHeight: "70vh" }} />
        <div style={{ fontSize: 13, color: C.gray, padding: "6px 14px", background: C.light }}>Si en tu móvil o tablet solo ves la primera página, pulsa «Abrir en otra pestaña».</div>
      </div>
    </div>
  );

  const h = excel.hojas[hojaSel] || excel.hojas[0];
  const t = busca.trim().toLowerCase();
  const filas = t ? h.filas.filter(f => f.some(v => String(v ?? "").toLowerCase().includes(t))) : h.filas;
  const LIMITE = 500;
  return (
    <div style={fondo} onClick={cerrar}>
      <div style={caja} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Vista previa del Excel">
        <div style={barra}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}><Ic n="buscar" tam={20} />Vista previa del Excel</div>
            <div style={{ fontSize: 14, opacity: .85 }}>{excel.archivo} · {excel.hojas.length} hojas</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...bb, background: "#fff", color: C.dark }} onClick={excel.descargar}>⬇️ Descargar Excel</button>
            <button style={bb} onClick={cerrar} aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "10px 14px 0", flexWrap: "wrap", background: C.light, borderBottom: "1px solid #CDE9ED" }}>
          {excel.hojas.map((x, i) => (
            <button key={x.nombre} onClick={() => setHojaSel(i)}
              style={{ padding: "8px 12px", border: "1px solid #CDE9ED", borderBottom: "none", borderRadius: "8px 8px 0 0", background: i === hojaSel ? C.white : "transparent", fontWeight: i === hojaSel ? 800 : 500, color: C.dark, cursor: "pointer", fontSize: 14, marginBottom: -1 }}>
              {x.nombre} <span style={{ color: C.gray, fontWeight: 500 }}>({x.filas.length})</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔎 Buscar en esta hoja (nombre, grupo, falta…)" aria-label="Buscar en la hoja"
            style={{ flex: "1 1 260px", padding: "9px 12px", borderRadius: 8, border: "1px solid #EBF0F6", fontSize: 14 }} />
          <span style={{ fontSize: 14, color: C.gray }}>{filas.length} fila(s){filas.length > LIMITE ? ` · se ven las ${LIMITE} primeras; el Excel las tiene todas` : ""}</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "0 14px 14px" }}>
          {filas.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: C.gray }}>Sin datos.</div> : (
            <table style={{ borderCollapse: "collapse", fontSize: 14, width: "max-content", minWidth: "100%" }}>
              <thead><tr>{h.cabecera.map(c => <th key={c} style={{ position: "sticky", top: 0, background: C.dark, color: "#fff", padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 700 }}>{c}</th>)}</tr></thead>
              <tbody>{filas.slice(0, LIMITE).map((f, i) => (
                <tr key={i} style={{ background: i % 2 ? "#F8F6F0" : C.white }}>
                  {h.cabecera.map((_, j) => <td key={j} style={{ padding: "6px 10px", borderBottom: "1px solid #eef2f4", maxWidth: 420, whiteSpace: String(f[j] ?? "").length > 60 ? "normal" : "nowrap", verticalAlign: "top", color: C.dark }}>{f[j] ?? ""}</td>)}
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
const estiloTabla = { styles: { fontSize: 13, cellPadding: 2, overflow: "linebreak", valign: "top" }, headStyles: { fillColor: OSCURO, textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 246, 240] }, margin: { left: 14, right: 14, bottom: 28 } };
const textoTipificacion = p => {
  const t = TIPIFICACION[p.gravedad]?.find(t => t.id === p.tipificacion)?.label;
  return t ? `${t} (${p.gravedad === "leve" ? "Plan de Convivencia del Centro" : "Decreto 32/2019 CAM"})` : "-";
};

// Texto del parte para copiar y pegar en un correo
function textoParte(parte) {
  const g = gObj(parte.gravedad);
  const tip = TIPIFICACION[parte.gravedad]?.find(t => t.id === parte.tipificacion)?.label;
  return `PARTE DE INCIDENCIA — ${CENTRO} (${CIUDAD})
Ref.: PARTE-${parte.id}

Alumno/a: ${parte.alumno}
Curso: ${parte.curso}
Tutor/a del grupo: ${parte.tutor || "-"}${parte.tutorEmail ? ` (${parte.tutorEmail})` : ""}
Fecha y hora: ${fmt(parte.ts)} · ${parte.hora || "hora no indicada"}
Profesor/a que pone el parte: ${parte.profesor}
Gravedad: ${sinEmoji(g?.label)} (${g?.desc || ""})${tip ? `\nTipificación: ${tip}` : ""}

Descripción de los hechos:
${parte.descripcion}

Para cualquier aclaración pueden contactar con el tutor/a del grupo o con Jefatura de Estudios.`;
}

// Bloque de firmas al pie de un PDF: una columna por firmante (con sitio para el sello del centro)
function firmasPDF(doc, y, firmantes) {
  const w = doc.internal.pageSize.getWidth(), margen = 14, hueco = 8;
  if (y > doc.internal.pageSize.getHeight() - 52) { doc.addPage(); y = 30; }
  const ancho = (w - margen * 2 - hueco * (firmantes.length - 1)) / firmantes.length;
  y += 22;
  firmantes.forEach((f, i) => {
    const x = margen + i * (ancho + hueco);
    doc.setDrawColor(150); doc.setLineWidth(0.3); doc.line(x, y, x + ancho, y);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...OSCURO);
    doc.text(sinEmoji(f.cargo), x, y + 5, { maxWidth: ancho });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(sinEmoji(f.nombre ? `Fdo.: ${f.nombre}` : "Fdo.:"), x, y + 10, { maxWidth: ancho });
    if (f.sello) doc.text("(sello del centro)", x, y + 15);
  });
  doc.setTextColor(0);
  return y + 20;
}

function pdfParte(parte) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const g = gObj(parte.gravedad);
  let y = cabeceraPDF(doc, "Parte de incidencia", `Ref. PARTE-${parte.id}`);
  autoTable(doc, { ...estiloTabla, startY: y, theme: "grid", styles: { ...estiloTabla.styles, fontSize: 13 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, fillColor: [238, 245, 248] } },
    body: [
      ["Alumno/a", parte.alumno], ["Curso", parte.curso], ["Tutor/a del grupo", parte.tutor || "-"], ["Correo del tutor/a", parte.tutorEmail || "-"],
      ["Tipo de parte", parte.tipo], ["Hora de clase", parte.hora || "-"], ["Fecha y hora", fmt(parte.ts)],
      ["Profesor/a responsable", parte.profesor], ["Gravedad", `${sinEmoji(g?.label)} (${g?.desc || ""})`],
      ["Tipificación", textoTipificacion(parte)],
      ...(parte.esGrupal ? [["Parte de grupo", "Sí"]] : []),
    ].map(([k, v]) => [k, sinEmoji(v)]) });
  y = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Descripción de los hechos", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const lineas = doc.splitTextToSize(sinEmoji(parte.descripcion), doc.internal.pageSize.getWidth() - 28);
  doc.text(lineas, 14, y + 6); y += 6 + lineas.length * 5 + 6;
  if (parte.rectificaciones?.length) {
    const r = parte.rectificaciones.at(-1);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.text(sinEmoji(`Parte rectificado el ${new Date(r.ts).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })} por ${r.por}${r.perfil === "jefatura" ? " (Jefatura)" : ""}.`), 14, y - 2);
    y += 6;
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Contacto de la familia", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Correo: ${parte.email || "-"}    Teléfono: ${parte.telefono || "-"}`, 14, y + 6);
  y += 8;
  firmasPDF(doc, y, [{ cargo: "El profesor/a", nombre: parte.profesor }, { cargo: "Vº Bº Jefatura de Estudios", sello: true }, { cargo: "Recibí: la familia" }]);
  guardarPDF(doc, `parte-${nombreArchivo(parte.alumno)}-${isoLocal(parte.ts)}.pdf`);
}

// Resumen por grupo con su tutor/a (para el informe en pantalla y en PDF)
function resumenPorGrupo(partes, tutores = {}) {
  const grupos = [...new Set(partes.map(p => p.curso))].sort();
  return grupos.map(curso => {
    const pC = partes.filter(p => p.curso === curso);
    const cuenta = g => pC.filter(p => p.gravedad === g).length;
    return { curso, tutor: tutores[curso]?.tutor || pC.find(p => p.tutor)?.tutor || "", email: tutores[curso]?.email || "",
      leve: cuenta("leve"), grave: cuenta("grave"), muy_grave: cuenta("muy_grave"), total: pC.length };
  });
}
const tutorDeParte = (p, tutores = {}) => p.tutor || tutores[p.curso]?.tutor || "";


// ─── Comparativa: alumno/a ↔ grupo ↔ nivel (porcentajes) ─────────────────────
const DATOS_CENTRO = { partes: [], alumnos: [] };
const nivelDe = curso => String(curso || "").replace(/\s*[A-Z]$/, "").trim();
const pct = (a, b) => b ? `${(Math.round(a / b * 1000) / 10).toLocaleString("es-ES")} %` : "-";
const dec = n => (Math.round(n * 100) / 100).toLocaleString("es-ES");
function comparativaPDF(doc, y, { desde, hasta, cursos = [], alumno = null }) {
  const enRango = p => { const d = isoLocal(new Date(p.ts)); return (!desde || d >= desde) && (!hasta || d <= hasta); };
  const todos = DATOS_CENTRO.partes.filter(enRango);
  const al = DATOS_CENTRO.alumnos;
  const niveles = [...new Set(cursos.map(nivelDe))].filter(Boolean);
  if (!niveles.length) return y;
  const w = doc.internal.pageSize.getWidth();
  const titulo = t => {
    if (y > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 24; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text(t, 14, y); doc.setTextColor(0); y += 3;
  };
  titulo("Comparativa en porcentajes");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text(`Calculado con todos los partes del periodo${desde ? ` (${fmtD(parseISO(desde))} – ${fmtD(parseISO(hasta))})` : ""}. Datos agregados, sin nombres de otros alumnos.`, 14, y + 2, { maxWidth: w - 28 });
  doc.setTextColor(0); y += 6;
  if (alumno) {
    const grupo = todos.filter(p => p.curso === alumno.curso);
    const suyos = grupo.filter(p => p.alumno === alumno.nombre);
    const nAl = al.filter(a => a.curso === alumno.curso).length || 1;
    const conPartes = new Set(grupo.filter(p => !p.esGrupal).map(p => p.alumno)).size;
    autoTable(doc, { ...estiloTabla, startY: y, theme: "grid", columnStyles: { 0: { fontStyle: "bold", cellWidth: 95, fillColor: [238, 245, 248] }, 1: { halign: "center" } },
      body: [
        [`Partes de ${alumno.nombre}`, String(suyos.length)],
        [`Partes de todo el grupo ${alumno.curso}`, String(grupo.length)],
        ["Peso del alumno/a en los partes del grupo", pct(suyos.length, grupo.length)],
        ["Media de partes por alumno/a en el grupo", dec(grupo.length / nAl)],
        ["Alumnado del grupo con algún parte", `${conPartes} de ${nAl} (${pct(conPartes, nAl)})`],
      ].map(r => r.map(sinEmoji)) });
    y = doc.lastAutoTable.finalY + 6;
  }
  niveles.forEach(nv => {
    const grupos = [...new Set([...al.map(a => a.curso), ...todos.map(p => p.curso)].filter(c => nivelDe(c) === nv))].sort();
    const delNivel = todos.filter(p => nivelDe(p.curso) === nv);
    const alNivel = al.filter(a => nivelDe(a.curso) === nv).length;
    const filas = grupos.map(g => {
      const pg = delNivel.filter(p => p.curso === g); const n = al.filter(a => a.curso === g).length;
      return [g, n || "-", pg.length, pct(pg.length, delNivel.length), n ? dec(pg.length / n) : "-",
        pg.filter(p => p.gravedad === "grave" || p.gravedad === "muy_grave").length, pct(new Set(pg.filter(p => !p.esGrupal).map(p => p.alumno)).size, n)].map(String);
    });
    filas.push([`Total ${nv}`, alNivel || "-", delNivel.length, delNivel.length ? "100 %" : "-", alNivel ? dec(delNivel.length / alNivel) : "-",
      delNivel.filter(p => p.gravedad === "grave" || p.gravedad === "muy_grave").length, pct(new Set(delNivel.filter(p => !p.esGrupal).map(p => p.alumno)).size, alNivel)].map(String));
    titulo(`Nivel ${nv}: grupos comparados`);
    const marcar = new Set(alumno ? [alumno.curso] : cursos);
    autoTable(doc, { ...estiloTabla, startY: y + 1,
      head: [["Grupo", "Alumnos", "Partes", "% del nivel", "Partes por alumno/a", "Graves y muy graves", "% alumnado con partes"]],
      body: filas, columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" }, 6: { halign: "center" } },
      didParseCell: c => { if (c.section !== "body") return; const r = c.row.raw[0];
        if (r.startsWith("Total")) { c.cell.styles.fontStyle = "bold"; c.cell.styles.fillColor = [238, 245, 248]; }
        else if (marcar.has(r)) { c.cell.styles.fillColor = [255, 243, 205]; c.cell.styles.fontStyle = "bold"; } } });
    y = doc.lastAutoTable.finalY + 6;
  });
  return y;
}

function pdfInformePartes(partes, filtrosTexto, tutores = {}, fechaInforme, rango) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const fecha = new Date(fechaInforme || Date.now()).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  let y = cabeceraPDF(doc, "Informe de partes", `Generado el ${fecha} · Jefatura de Estudios${filtrosTexto ? ` · ${filtrosTexto}` : ""}`);
  const cuenta = gr => partes.filter(p => p.gravedad === gr).length;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${partes.length}   ·   Leves: ${cuenta("leve")}   ·   Graves: ${cuenta("grave")}   ·   Muy graves: ${cuenta("muy_grave")}`, 14, y);
  doc.setFontSize(11); doc.setTextColor(...OSCURO); doc.text("Resumen por grupo y tutoría", 14, y + 9); doc.setTextColor(0);
  autoTable(doc, { ...estiloTabla, startY: y + 12,
    head: [["Grupo", "Tutor/a del grupo", "Correo del tutor/a", "Leves", "Graves", "Muy graves", "Total"]],
    body: resumenPorGrupo(partes, tutores).map(r => [r.curso, r.tutor || "Sin registrar", r.email || "-", r.leve, r.grave, r.muy_grave, r.total].map(sinEmoji)),
    columnStyles: { 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" }, 6: { halign: "center", fontStyle: "bold" } } });
  y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...OSCURO); doc.text("Detalle de los partes", 14, y); doc.setTextColor(0);
  autoTable(doc, { ...estiloTabla, startY: y + 3,
    head: [["Fecha y hora", "Hora", "Alumno/a", "Curso", "Tutor/a", "Tipo", "Gravedad", "Tipificación", "Profesor/a", "Descripción"]],
    body: partes.map(p => [fmt(p.ts), p.hora || "-", p.alumno + (p.esGrupal ? " (grupo)" : ""), p.curso, tutorDeParte(p, tutores) || "-", p.tipo, sinEmoji(gObj(p.gravedad)?.label), textoTipificacion(p), p.profesor, p.descripcion].map(sinEmoji)),
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 14 }, 2: { cellWidth: 30 }, 3: { cellWidth: 18 }, 4: { cellWidth: 24 }, 5: { cellWidth: 27 }, 6: { cellWidth: 19 }, 7: { cellWidth: 40 }, 8: { cellWidth: 24 }, 9: { cellWidth: "auto" } } });
  const fechasP = partes.map(p => isoLocal(new Date(p.ts))).sort();
  let yf = comparativaPDF(doc, doc.lastAutoTable.finalY + 8, { desde: rango?.desde || fechasP[0], hasta: rango?.hasta || fechasP[fechasP.length - 1], cursos: [...new Set(partes.map(p => p.curso))] });
  if (yf > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); yf = 24; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(180, 83, 9);
  doc.text("Documento interno del centro: contiene datos de varios alumnos. No entregar a las familias; para ellas, use el informe individual del alumno/a.", 14, yf, { maxWidth: doc.internal.pageSize.getWidth() - 28 });
  doc.setTextColor(0);
  firmasPDF(doc, yf + 4, [{ cargo: "Jefatura de Estudios", sello: true }, { cargo: "Vº Bº Dirección" }]);
  guardarPDF(doc, `informe-partes-${isoLocal(fechaInforme || new Date())}.pdf`);
}

function pdfInformeBanos(banos, filtrosTexto) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const y = cabeceraPDF(doc, "Informe de salidas al baño", `Generado el ${fecha} · Jefatura de Estudios${filtrosTexto ? ` · ${filtrosTexto}` : ""}`);
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(`Total de salidas: ${banos.length}`, 14, y);
  const dur = b => b.regreso ? `${Math.max(1, Math.round((new Date(b.regreso) - new Date(b.salida)) / 60000))} min` : "Fuera";
  autoTable(doc, { ...estiloTabla, startY: y + 4,
    head: [["Salida", "Regreso", "Duración", "Alumno/a", "Curso", "Autorizado por"]],
    body: banos.map(b => [fmt(b.ts || b.salida), b.regreso ? horaCorta(b.regreso) : "-", dur(b), b.alumno, b.curso, b.profesor || "-"].map(sinEmoji)) });
  guardarPDF(doc, `informe-banos-${isoLocal()}.pdf`);
}

function pdfFirmasYListas(fecha, filas, listasDia) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, "Firmas de guardia y listas", parseISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  const cuerpo = [];
  filas.forEach(f => {
    if (f.personas.length === 0) cuerpo.push([`${f.hora} (${HORARIO[f.hora]})`, f.zona, "Nadie en la zona", "-"]);
    f.personas.forEach(({ p, firma }) => cuerpo.push([`${f.hora} (${HORARIO[f.hora]})`, f.zona, p, firma ? `Firmada a las ${horaCorta(firma.ts)}` : f.empezada ? "SIN FIRMAR" : "Aún no ha empezado"]));
  });
  autoTable(doc, { ...estiloTabla, startY: y, head: [["Hora", "Zona", "Profesor/a", "Firma"]], body: cuerpo.map(r => r.map(sinEmoji)),
    didParseCell: d => { if (d.section === "body" && d.column.index === 3 && d.cell.raw === "SIN FIRMAR") { d.cell.styles.textColor = [180, 83, 9]; d.cell.styles.fontStyle = "bold"; } } });
  y = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text("Listas pasadas en guardia", 14, y);
  autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Hora", "Grupo", "Profesor/a", "Faltas"]],
    body: listasDia.length ? listasDia.map(l => [l.hora, l.curso, `${l.profesor} (${horaCorta(l.ts)})`, l.ausentes.length ? l.ausentes.map(a => a.nombre).join(", ") : "Sin faltas"].map(sinEmoji)) : [["-", "-", "-", "No se pasó ninguna lista"]] });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text("Las faltas oficiales de asistencia se registran en Raíces.", 14, doc.lastAutoTable.finalY + 6);
  guardarPDF(doc, `firmas-guardia-${fecha}.pdf`);
}

// ─── Vista impresión parte ────────────────────────────────────────────────────
function PrintParte({ parte, onClose }) {
  const g = gObj(parte.gravedad);
  const texto = textoParte(parte);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1000, overflowY: "auto", fontFamily: "Georgia, serif" }}>
      <div className="no-print" style={{ background: C.dark, color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "system-ui" }}>{APP} · Vista previa del parte</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => pdfParte(parte)} style={{ background: "#275D8C", border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontFamily: "system-ui" }}>⬇️ Descargar PDF</button>
          <CopyBtn getText={() => texto} />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700 }}>✕ Cerrar</button>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 24px 60px" }}>
        <div style={{ textAlign: "center", borderBottom: `3px solid ${C.teal}`, paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: C.gray, marginBottom: 4, letterSpacing: 2 }}>{CENTRO.toUpperCase()} · {CIUDAD.toUpperCase()}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.dark, fontFamily: "system-ui" }}>{APP} — Parte de Incidencia</div>
          <div style={{ marginTop: 10 }}>
            <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 8, fontWeight: 700, fontSize: 15, background: g.color, color: g.texto, border: `2px solid ${g.color}` }}>{g.label} — {g.desc}</span>
          </div>
        </div>
        {[["Alumno/a", parte.alumno], ["Curso / Aula", parte.curso], ["Tutor/a del grupo", parte.tutor || "—"], ["Correo del tutor/a", parte.tutorEmail || "—"], ["Tipo de parte", parte.tipo], ["Hora de clase", parte.hora || "No especificada"], ["Fecha y hora", fmt(parte.ts)], ["Profesor responsable", parte.profesor]].map(([k, v]) => (
          <InfoRow key={k} label={k} value={v} />
        ))}
        {parte.tipificacion && (() => {
          const grav = parte.gravedad;
          const tipObj = TIPIFICACION[grav]?.find(t => t.id === parte.tipificacion);
          const fuente = grav === "leve" ? "Plan de Convivencia del Centro" : "Decreto 32/2019 CAM";
          return (
            <div style={{ margin: "10px 0", padding: "10px 14px", background: "#DDF0F4", borderRadius: 8, border: `1px solid ${C.blue}`, fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: C.blue }}><Ic n="tipificacion" tam={20} />Tipificación normativa </span>
              <span style={{ color: C.gray, fontSize: 13 }}>({fuente})</span>
              <div style={{ marginTop: 4, color: C.dark }}>{tipObj?.label}</div>
            </div>
          );
        })()}
        {parte.esGrupal && <div style={{ marginTop: 8, background: "#DDF0F4", borderRadius: 8, padding: "8px 14px", fontSize: 14, color: C.teal, fontWeight: 600 }}><Ic n="grupos" tam={20} />Parte generado como parte de grupo</div>}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="descripcion" tam={40} />Descripción del incidente:</div>
          <div style={{ background: C.light, padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.7, border: `1px solid #CDE9ED` }}>{parte.descripcion}</div>
        </div>
        <div style={{ background: "#DDF0F4", padding: 16, borderRadius: 8, marginTop: 20, fontSize: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: C.blue }}>📬 Contacto familia</div>
          <div><Ic n="mensaje-enviar" tam={20} />{parte.email}</div>
          <div style={{ marginTop: 4 }}><Ic n="selecciona-profesor" tam={20} />{parte.telefono}</div>
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 50 }}>
          {["Firma del Profesor", "Firma Jefatura de Estudios", "Firma del Alumno/a"].map(f => (
            <div key={f} style={{ flex: 1, borderTop: `2px solid ${C.dark}`, paddingTop: 8, textAlign: "center", fontSize: 14, color: "#555" }}>{f}</div>
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: "center", color: "#aaa", fontSize: 13, borderTop: "1px dashed #ccc", paddingTop: 12 }}>
          {APP} · {CENTRO} · Ref: PARTE-{parte.id}
        </div>
      </div>
      <style>{`@media print{.no-print{display:none!important}}`}</style>
    </div>
  );
}

// ─── Vista impresión informe ──────────────────────────────────────────────────
function PrintInforme({ type = "partes", partes, banos, filtros, tutores = {}, onDescargado, onClose }) {
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  
  if (type === "partes") {
    const res = {
      leve:      partes.filter(p => p.gravedad === "leve").length,
      grave:     partes.filter(p => p.gravedad === "grave").length,
      muy_grave: partes.filter(p => p.gravedad === "muy_grave").length,
    };
    const filtrosTexto = [
      filtros.filtCurso && `Curso: ${filtros.filtCurso}`,
      filtros.filtCurso && tutores[filtros.filtCurso]?.tutor && `Tutor/a: ${tutores[filtros.filtCurso].tutor}`,
      filtros.filtGravedad && GRAVEDAD.find(g => g.id === filtros.filtGravedad)?.label,
      filtros.filtFechaDesde && `Desde: ${fmtD(filtros.filtFechaDesde)}`,
      filtros.filtFechaHasta && `Hasta: ${fmtD(filtros.filtFechaHasta)}`,
    ].filter(Boolean).join(" · ");
    const textoPlano = `${APP.toUpperCase()} — INFORME DE PARTES\n${CENTRO} · ${CIUDAD}\nGenerado el ${fecha}\n${filtrosTexto ? `Filtros: ${filtrosTexto}\n` : ""}\nRESUMEN: Total: ${partes.length} | Leves: ${res.leve} | Graves: ${res.grave} | Muy Graves: ${res.muy_grave}\n\n${"─".repeat(90)}\n${partes.map((p, i) => `${i + 1}. ${fmt(p.ts)} | ${p.hora || "-"} | ${p.alumno} | ${p.curso} (tutor/a: ${tutorDeParte(p, tutores) || "-"}) | ${p.tipo} | ${p.gravedad.toUpperCase()} | ${p.profesor}\n   ${p.descripcion}`).join("\n")}\n${"─".repeat(90)}`;
    
    const resumen = resumenPorGrupo(partes, tutores);
    const descargarPDF = () => { pdfInformePartes(partes, filtrosTexto, tutores); onDescargado?.({ tipo: "partes", filtrosTexto, ids: partes.map(p => p.id) }); };
    
    return (
      <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1000, overflowY: "auto", fontFamily: "system-ui, sans-serif" }}>
        <div className="no-print" style={{ background: C.dark, color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{APP} — Informe de Partes</span>
          <div style={{ display: "flex", gap: 8 }}>
            <CopyBtn getText={() => textoPlano} />
            <button onClick={descargarPDF} style={{ background: "rgba(76, 175, 80, 0.8)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700 }}>⬇️ Descargar PDF</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700 }}>✕ Cerrar</button>
          </div>
        </div>
        <div data-print-informe style={{ maxWidth: 900, margin: "30px auto", padding: "0 24px 60px" }}>
          <div style={{ textAlign: "center", borderBottom: `3px solid ${C.teal}`, paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: C.gray, letterSpacing: 2, marginBottom: 4 }}>{CENTRO.toUpperCase()} · {CIUDAD.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>{APP} — Informe de Partes</div>
            <div style={{ color: C.gray, fontSize: 14, marginTop: 4 }}>Generado el {fecha} · Jefatura de Estudios</div>
            {filtrosTexto && <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>Filtros: {filtrosTexto}</div>}
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[{ label: "Total", value: partes.length, color: C.dark }, { label: "🟡 Leves", value: res.leve, color: C.teal }, { label: "⚠️ Graves", value: res.grave, color: C.amber }, { label: "🔴 Muy Graves", value: res.muy_grave, color: C.salmon }].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 24px", borderRadius: 10, background: C.light, borderTop: `3px solid ${s.color}`, minWidth: 100 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 14, color: C.gray }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 700, color: C.dark, fontSize: 15, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="tutor" tam={32} />Resumen por grupo y tutoría</div>
          <div style={{ overflowX: "auto", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr style={{ background: C.blue, color: "#fff" }}>{["Grupo", "Tutor/a del grupo", "Correo", "Leves", "Graves", "Muy graves", "Total"].map(h => <th key={h} style={{ padding: "8px", textAlign: "left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {resumen.map((r, i) => (
                  <tr key={r.curso} style={{ background: i % 2 === 0 ? "#fff" : C.light }}>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", fontWeight: 700 }}>{r.curso}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{r.tutor || <span style={{ color: C.salmon }}>Sin registrar</span>}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", color: C.gray }}>{r.email || "—"}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", textAlign: "center" }}>{r.leve}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", textAlign: "center" }}>{r.grave}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", textAlign: "center" }}>{r.muy_grave}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", textAlign: "center", fontWeight: 800 }}>{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontWeight: 700, color: C.dark, fontSize: 15, margin: "0 0 8px" }}><Ic n="partes" tam={20} />Detalle de los partes</div>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.dark, color: "#fff" }}>
                {["Fecha", "Hora", "Alumno", "Curso", "Tutor/a", "Tipo", "Gravedad", "Profesor", "Descripción"].map(h => (
                  <th key={h} style={{ padding: "9px 8px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partes.map((p, i) => {
                const g = gObj(p.gravedad);
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : C.light }}>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{fmt(p.ts)}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{p.hora || "-"}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", fontWeight: 600 }}>{p.alumno}{p.esGrupal ? <span style={{ marginLeft: 4, fontSize: 13, color: C.teal }}>◆grupal</span> : null}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{p.curso}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{tutorDeParte(p, tutores) || "—"}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{p.tipo}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}><span style={{ background: g.color, color: g.texto, padding: "4px 10px", borderRadius: 4, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4, lineHeight: 1.2 }}>{g.label}</span></td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{p.profesor}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{p.descripcion.slice(0, 60)}{p.descripcion.length > 60 ? "…" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div style={{ marginTop: 24, textAlign: "center", color: "#aaa", fontSize: 13, borderTop: "1px dashed #ccc", paddingTop: 10 }}>
            {APP} · {CENTRO} · {CIUDAD} · {fecha}
          </div>
        </div>
        <style>{`@media print{.no-print{display:none!important}}`}</style>
      </div>
    );
  } else if (type === "banos") {
    const filtrosTexto = [
      filtros.filtCurso && `Curso: ${filtros.filtCurso}`,
      filtros.filtFechaDesde && `Desde: ${fmtD(filtros.filtFechaDesde)}`,
      filtros.filtFechaHasta && `Hasta: ${fmtD(filtros.filtFechaHasta)}`,
    ].filter(Boolean).join(" · ");
    const textoPlano = `${APP.toUpperCase()} — INFORME DE SALIDAS AL BAÑO\n${CENTRO} · ${CIUDAD}\nGenerado el ${fecha}\n${filtrosTexto ? `Filtros: ${filtrosTexto}\n` : ""}\nRESUMEN: Total de salidas: ${banos.length}\n\n${"─".repeat(90)}\n${banos.map((b, i) => `${i + 1}. ${fmt(b.ts || b.salida)} | ${b.alumno} | ${b.curso} | Autorizado por: ${b.profesor || "-"}\n   Motivo: ${b.motivo || "-"}`).join("\n")}\n${"─".repeat(90)}`;
    
    const descargarPDF = () => { pdfInformeBanos(banos, filtrosTexto); onDescargado?.({ tipo: "banos", filtrosTexto, ids: banos.map(b => b.id) }); };
    
    return (
      <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1000, overflowY: "auto", fontFamily: "system-ui, sans-serif" }}>
        <div className="no-print" style={{ background: C.dark, color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{APP} — Informe de Baños</span>
          <div style={{ display: "flex", gap: 8 }}>
            <CopyBtn getText={() => textoPlano} />
            <button onClick={descargarPDF} style={{ background: "rgba(76, 175, 80, 0.8)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700 }}>⬇️ Descargar PDF</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700 }}>✕ Cerrar</button>
          </div>
        </div>
        <div data-print-informe style={{ maxWidth: 900, margin: "30px auto", padding: "0 24px 60px" }}>
          <div style={{ textAlign: "center", borderBottom: `3px solid ${C.blue}`, paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: C.gray, letterSpacing: 2, marginBottom: 4 }}>{CENTRO.toUpperCase()} · {CIUDAD.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>{APP} — Informe de Salidas al Baño</div>
            <div style={{ color: C.gray, fontSize: 14, marginTop: 4 }}>Generado el {fecha} · Jefatura de Estudios</div>
            {filtrosTexto && <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>Filtros: {filtrosTexto}</div>}
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[{ label: "Total Salidas", value: banos.length, color: C.blue }].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 24px", borderRadius: 10, background: C.light, borderTop: `3px solid ${s.color}`, minWidth: 100 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 14, color: C.gray }}>{s.label}</div>
              </div>
            ))}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.dark, color: "#fff" }}>
                {["Fecha", "Alumno", "Curso", "Profesor", "Motivo"].map(h => (
                  <th key={h} style={{ padding: "9px 8px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {banos.map((b, i) => (
                <tr key={b.id} style={{ background: i % 2 === 0 ? "#fff" : C.light }}>
                  <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{fmt(b.ts || b.salida)}</td>
                  <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee", fontWeight: 600 }}>{b.alumno}</td>
                  <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{b.curso}</td>
                  <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{b.profesor || "-"}</td>
                  <td style={{ padding: "7px 8px", borderBottom: "1px solid #eee" }}>{b.motivo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 24, textAlign: "center", color: "#aaa", fontSize: 13, borderTop: "1px dashed #ccc", paddingTop: 10 }}>
            {APP} · {CENTRO} · {CIUDAD} · {fecha}
          </div>
        </div>
        <style>{`@media print{.no-print{display:none!important}}`}</style>
      </div>
    );
  }
}

// ─── Cómo avisar a la familia y a Jefatura ─────────────────────────────────
// La app no envía correos: el profesor lo manda desde su correo del centro.
function ComoAvisar({ parte }) {
  return (
    <div style={{ marginTop: 14, textAlign: "left", border: `1px solid ${R.turquesaClaro}`, background: C.white }}>
      <div style={{ background: R.mostaza, color: R.noche, padding: "10px 14px", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="mensaje-enviar" tam={34} />Cómo avisar a la familia y a Jefatura</div>
      <div style={{ background: R.crema, padding: "12px 14px", fontSize: 16, color: R.petroleo, lineHeight: 1.5 }}>
        Elige abajo a quién se lo envías y pulsa «Abrir en mi correo». Para el contenido, elige una de estas dos formas:
        <ol style={{ margin: "6px 0 0", paddingLeft: 22 }}>
          <li><strong>Descarga el PDF</strong> y adjúntalo al correo.</li>
          <li><strong>Copia el texto</strong> del parte y pégalo en el cuerpo del correo.</li>
        </ol>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => pdfParte(parte)} style={{ background: R.azul, color: "#fff", border: "none", borderRadius: 6, minHeight: 48, padding: "0 18px", cursor: "pointer", fontWeight: 700, fontSize: 17 }}>⬇️ Descargar PDF</button>
          <CopyBtn getText={() => textoParte(parte)} label="📋 Copiar texto" />
        </div>
        <ElegirDestinatarios alumno={{ nombre: parte.alumno, email: parte.email }} tutorNombre={parte.tutor} tutorEmail={parte.tutorEmail}
          asunto={`Parte de incidencia · ${parte.alumno} (${parte.curso}) · PARTE-${parte.id}`} cuerpo={textoParte(parte)} porDefecto={["familia", "tutor", "jefatura"]} C={C} />
        <div style={{ fontSize: 14, color: R.petroleo, marginTop: 10 }}>La app no envía correos: se mandan desde tu correo del centro, que es el canal oficial.</div>
      </div>
    </div>
  );
}

// ─── Medidas correctoras ─────────────────────────────────────────────────────
// Como en el papel de siempre: en las faltas leves, quien pone el parte indica la medida (aula de convivencia,
// supresión del recreo o una hora más) y cuántas veces; Jefatura de Estudios pone el día y el aula, y con eso
// sale la lista del día. El resto de medidas las pone Jefatura. Jefatura marca después si se ha cumplido.
const TIPOS_MEDIDA = [
  { id: "aula_conv",  label: "Aula de convivencia",            leve: true, sesiones: true, horas: true },
  { id: "recreo",     label: "Supresión del recreo",           leve: true, sesiones: true, hora: "Recreo" },
  { id: "hora_mas",   label: "Una hora más al final del día",  leve: true, sesiones: true, hora: "7ª hora" },
  { id: "tarea",      label: "Tarea correctora" },
  { id: "amonestacion", label: "Amonestación por escrito" },
  { id: "comparecencia", label: "Comparecencia ante Jefatura" },
  { id: "extraescolar", label: "Sin actividades extraescolares" },
  { id: "expulsion_clase", label: "Expulsión de determinadas clases", sesiones: true, horas: true },
  { id: "expulsion_centro", label: "Expulsión temporal del centro", sesiones: true, hora: "Todo el día", sinLugar: true },
  { id: "cambio_grupo", label: "Cambio de grupo" },
  { id: "otra",       label: "Otra medida" },
];
const tipoMedida = id => TIPOS_MEDIDA.find(t => t.id === id) || TIPOS_MEDIDA[TIPOS_MEDIDA.length - 1];
// Lugares: zonas del cuadrante de guardias, para que el profesorado de guardia vea a quién tiene
const LUGARES_MEDIDA = [
  { id: "aula-conv", label: "Aula de convivencia" },
  { id: "A0-biblio", label: "Biblioteca" },
  { id: "otro",      label: "Otro lugar…" },
];
// Zona del cuadrante donde se cumple una sesión (en el recreo, la biblioteca es otra zona)
const zonaDeSesion = s => s.lugarId === "A0-biblio" && s.hora === "Recreo" ? "rec-biblio" : (s.lugarId || "");
const sesionEn = (lugarId, otro, extra) => ({ ...extra, lugarId: lugarId === "otro" ? "" : lugarId, lugar: lugarId === "otro" ? otro.trim() : ZONAS_CENTRO.find(z => z.id === lugarId)?.label || LUGARES_MEDIDA.find(l => l.id === lugarId)?.label || "" });
const ESTADO_MEDIDA = {
  sin_programar: { label: "Por programar", color: R.crema,  texto: R.noche },
  pendiente:  { label: "Pendiente",   color: R.gris,     texto: R.petroleo },
  en_curso:   { label: "En curso",    color: R.azulClaro, texto: R.petroleo },
  cumplida:   { label: "Cumplida",    color: R.verde,    texto: R.noche },
  incumplida: { label: "No cumplida", color: R.mostaza,  texto: R.noche },
};
// Una medida con días está cumplida cuando se han cumplido todos; si falta a alguno, queda sin cumplir
function estadoMedida(m) {
  const ses = (m.sesiones || []).filter(s => s.estado !== "movida");
  if (tipoMedida(m.tipo).sesiones && !ses.length) return "sin_programar";
  if (!ses.length) return m.cumplida ? "cumplida" : "pendiente";
  if ((m.sesiones || []).some(s => s.estado === "ausente")) return "incumplida";
  if (ses.every(s => s.estado === "cumplida")) return "cumplida";
  return ses.some(s => s.estado === "cumplida") ? "en_curso" : "pendiente";
}
const proximosLectivos = (n, desde = new Date()) => {
  const r = []; let d = parseISO(desde);
  while (r.length < n) { if (d.getDay() !== 0 && d.getDay() !== 6) r.push(isoLocal(d)); d = sumarDias(d, 1); }
  return r;
};
const fechaCorta = f => parseISO(f).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
const ChipMedida = ({ m }) => {
  const e = ESTADO_MEDIDA[estadoMedida(m)];
  return <span style={{ background: e.color, color: e.texto, border: e.color === R.crema ? `1px solid ${R.mostaza}` : "none", borderRadius: 4, padding: "3px 10px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{e.label}</span>;
};
// Resumen de una medida: tipo, días, lugar y quién la puso
function ResumenMedida({ m }) {
  const t = tipoMedida(m.tipo);
  const ses = (m.sesiones || []).filter(s => s.estado !== "movida");
  const hechas = ses.filter(s => s.estado === "cumplida").length;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
        <div style={{ fontWeight: 700, color: R.petroleo, fontSize: 16 }}>
          {t.label}
          {ses.length > 0 ? <span style={{ fontWeight: 400 }}> · {hechas} de {ses.length} cumplido{ses.length !== 1 ? "s" : ""}</span>
            : m.veces > 0 && <span style={{ fontWeight: 400 }}> · {m.veces} {m.veces === 1 ? "vez" : "veces"}</span>}
        </div>
        {ses.length > 0 && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 2 }}>{ses.map(s => `${fechaCorta(s.fecha)}${s.hora && s.hora !== t.hora ? ` (${s.hora})` : ""}${s.lugar ? ` · ${s.lugar}` : ""}${s.estado === "cumplida" ? " ✓" : s.estado === "ausente" ? " ✗" : ""}`).join(" | ")}</div>}
        {m.detalle && <div style={{ fontSize: 14, color: R.noche, marginTop: 2 }}>{m.detalle}</div>}
        <div style={{ fontSize: 14, color: R.petroleo, marginTop: 2 }}>Puesta por {m.puestaPor} · {fmtD(m.ts)}</div>
      </div>
      <ChipMedida m={m} />
    </div>
  );
}

const estilosMedida = {
  campo: { width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: C.white, boxSizing: "border-box" },
  etiqueta: { display: "block", fontWeight: 700, fontSize: 15, color: R.petroleo, marginBottom: 8 },
  boton: { minHeight: 44, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  principal: listo => ({ minHeight: 48, padding: "0 20px", borderRadius: 6, border: "none", background: listo ? R.azul : R.gris, color: listo ? "#fff" : R.petroleo, opacity: listo ? 1 : .7, fontSize: 17, fontWeight: 700, cursor: listo ? "pointer" : "not-allowed" }),
};

// Elegir los días de una medida: atajos y fecha concreta
function ElegirDias({ fechas, setFechas, id }) {
  const [otra, setOtra] = useState(isoLocal());
  const { campo, boton } = estilosMedida;
  const anadir = fs => setFechas(prev => [...new Set([...prev, ...fs])].sort());
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" style={boton} onClick={() => anadir([isoLocal()])}>Hoy</button>
        <button type="button" style={boton} onClick={() => anadir(proximosLectivos(1, sumarDias(new Date(), 1)))}>Próximo día lectivo</button>
        <button type="button" style={boton} onClick={() => anadir(proximosLectivos(3, sumarDias(new Date(), 1)))}>Próximos 3 días</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="date" id={id} aria-label="Otro día" value={otra} onChange={e => setOtra(e.target.value)} style={{ ...campo, flex: "1 1 0", minWidth: 0 }} />
        <button type="button" style={boton} onClick={() => otra && anadir([otra])}>Añadir</button>
      </div>
      {fechas.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {fechas.map(f => (
            <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.white, border: `2px solid ${R.turquesa}`, borderRadius: 22, padding: "2px 4px 2px 12px", fontSize: 15, fontWeight: 700, color: R.petroleo }}>
              {fechaCorta(f)}
              <button type="button" aria-label={`Quitar ${fechaCorta(f)}`} onClick={() => setFechas(prev => prev.filter(x => x !== f))}
                style={{ width: 32, height: 32, border: "none", borderRadius: "50%", background: R.azulClaro, color: R.petroleo, fontSize: 18, cursor: "pointer" }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Día, hora y lugar de una medida: lo que pone Jefatura (al programar o al poner la medida)
function CamposProgramar({ t, fechas, setFechas, hora, setHora, lugarId, setLugarId, lugarOtro, setLugarOtro, prefijo }) {
  const { campo, etiqueta } = estilosMedida;
  return (
    <>
      {t.horas && (
        <div>
          <label style={etiqueta} htmlFor={`${prefijo}-hora`}>Hora</label>
          <select id={`${prefijo}-hora`} value={hora} onChange={e => setHora(e.target.value)} style={campo}>
            {HORAS.filter(h => h !== "Recreo").map(h => <option key={h} value={h}>{conTramo(h)}</option>)}
          </select>
        </div>
      )}
      {!t.sinLugar && (
        <div>
          <label style={etiqueta} htmlFor={`${prefijo}-lugar`}>Aula o lugar</label>
          <select id={`${prefijo}-lugar`} value={lugarId} onChange={e => setLugarId(e.target.value)} style={campo}>
            {LUGARES_MEDIDA.filter(l => l.id === "otro" || !ZONAS_CENTRO.find(z => z.id === l.id)?.oculta).map(l => <option key={l.id} value={l.id}>{ZONAS_CENTRO.find(z => z.id === l.id)?.label || l.label}</option>)}
          </select>
          {lugarId === "otro" && <input aria-label="Otro lugar" value={lugarOtro} onChange={e => setLugarOtro(e.target.value)} placeholder="Por ejemplo, Jefatura de Estudios" style={{ ...campo, marginTop: 8 }} />}
          {lugarId !== "otro" && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 6 }}>Lo verá el profesorado de guardia de esa zona en el cuadrante.</div>}
        </div>
      )}
      <div>
        <div style={etiqueta}>Días{t.hora ? ` · ${t.hora === "Todo el día" ? "todo el día" : conTramo(t.hora)}` : ""}</div>
        <ElegirDias fechas={fechas} setFechas={setFechas} id={`${prefijo}-dia`} />
      </div>
    </>
  );
}

// Formulario para poner una medida a partir de un parte
function FormMedida({ parte, esJefatura, usuario, onGuardar, onCancelar }) {
  const tipos = esJefatura ? TIPOS_MEDIDA : parte.gravedad === "leve" ? TIPOS_MEDIDA.filter(t => t.leve) : [];
  const [tipo, setTipo] = useState(tipos[0]?.id || "");
  const [veces, setVeces] = useState(1);
  const [fechas, setFechas] = useState([]);
  const [hora, setHora] = useState("1ª hora");
  const [lugarId, setLugarId] = useState(LUGARES_MEDIDA[0].id);
  const [lugarOtro, setLugarOtro] = useState("");
  const [detalle, setDetalle] = useState("");
  const t = tipoMedida(tipo);
  const { campo, etiqueta, boton, principal } = estilosMedida;
  if (!tipos.length) return (
    <div style={{ background: R.crema, padding: 14, color: R.petroleo, fontSize: 15 }}>
      Las medidas de las faltas graves y muy graves las pone Jefatura de Estudios.
      <div><button type="button" onClick={onCancelar} style={{ ...boton, marginTop: 10 }}>Cerrar</button></div>
    </div>
  );
  // Jefatura puede programarla ya; si no pone días, queda «por programar» como la del profesorado
  const listo = tipo && (tipo !== "otra" || detalle.trim()) && (!esJefatura || !fechas.length || t.sinLugar || lugarId !== "otro" || lugarOtro.trim());
  const guardar = () => onGuardar({
    id: Date.now(), parteId: parte.id, alumnoId: parte.alumnoId, alumno: parte.alumno, curso: parte.curso, gravedad: parte.gravedad, tipo,
    veces: t.sesiones ? (esJefatura && fechas.length ? fechas.length : veces) : 0,
    sesiones: esJefatura && t.sesiones ? fechas.map(f => t.sinLugar ? { fecha: f, hora: t.hora || hora, lugar: "", lugarId: "", estado: "pendiente" } : sesionEn(lugarId, lugarOtro, { fecha: f, hora: t.hora || hora, estado: "pendiente" })) : [],
    detalle: detalle.trim(), puestaPor: usuario, ts: new Date().toISOString(),
  });
  return (
    <div style={{ background: R.azulClaro, padding: 14, display: "grid", gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 17, color: R.petroleo }}>Poner medida correctora</div>
      <div>
        <label style={etiqueta} htmlFor="gd-medida-tipo">Medida</label>
        <select id="gd-medida-tipo" value={tipo} onChange={e => { setTipo(e.target.value); setFechas([]); }} style={campo}>
          {tipos.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      {!esJefatura && t.sesiones && (
        <div>
          <label style={etiqueta} htmlFor="gd-medida-veces">¿Cuántas veces?</label>
          <select id="gd-medida-veces" value={veces} onChange={e => setVeces(Number(e.target.value))} style={campo}>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? "vez" : "veces"}</option>)}
          </select>
          <div style={{ fontSize: 15, color: R.petroleo, marginTop: 8 }}>Jefatura de Estudios pondrá el día y el aula. Las demás medidas las pone Jefatura.</div>
        </div>
      )}
      {esJefatura && t.sesiones && <CamposProgramar t={t} fechas={fechas} setFechas={setFechas} hora={hora} setHora={setHora} lugarId={lugarId} setLugarId={setLugarId} lugarOtro={lugarOtro} setLugarOtro={setLugarOtro} prefijo="gd-medida" />}
      <div>
        <label style={etiqueta} htmlFor="gd-medida-detalle">{tipo === "otra" ? "Describe la medida" : "Observaciones (opcional)"}</label>
        <textarea id="gd-medida-detalle" rows={2} value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Por ejemplo, la tarea que tiene que hacer" style={{ ...campo, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={guardar} disabled={!listo} style={principal(listo)}>Guardar medida</button>
        <button type="button" onClick={onCancelar} style={{ minHeight: 48, padding: "0 12px", border: "none", background: "none", color: R.azul, textDecoration: "underline", fontSize: 16, cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

// Medidas de un parte, con el botón para poner una nueva (en la ventana del parte y tras generarlo)
function MedidasDeParte({ parte, medidas, setMedidas, esJefatura, usuario, abiertaInicial = false }) {
  const [abierta, setAbierta] = useState(abiertaInicial);
  const lista = medidas.filter(m => m.parteId === parte.id);
  const puede = esJefatura || (parte.gravedad === "leve" && parte.profesor === usuario);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: R.petroleo, fontSize: 17, marginBottom: 8 }}><Icono nombre="tipificacion" tam={32} />Medidas correctoras</div>
      {lista.length === 0 && !abierta && <div style={{ fontSize: 15, color: R.petroleo, marginBottom: 8 }}>Todavía no tiene ninguna medida.</div>}
      {lista.map(m => <div key={m.id} style={{ border: `1px solid ${R.turquesaClaro}`, borderLeft: `8px solid ${estadoMedida(m) === "sin_programar" ? R.mostaza : ESTADO_MEDIDA[estadoMedida(m)].color}`, padding: 12, marginBottom: 8, background: C.white }}><ResumenMedida m={m} /></div>)}
      {abierta
        ? <FormMedida parte={parte} esJefatura={esJefatura} usuario={usuario} onCancelar={() => setAbierta(false)} onGuardar={m => { setMedidas(prev => [m, ...prev]); setAbierta(false); }} />
        : !puede && parte.gravedad !== "leve"
          ? <div style={{ fontSize: 15, color: R.petroleo, background: R.crema, padding: "10px 12px" }}>Las medidas de las faltas graves y muy graves las pone Jefatura de Estudios.</div>
          : puede && <button type="button" onClick={() => setAbierta(true)} style={estilosMedida.boton}>➕ Poner medida correctora</button>}
    </div>
  );
}

// Jefatura programa una medida: días, hora y lugar
function ProgramarMedida({ m, onProgramar }) {
  const t = tipoMedida(m.tipo);
  const [fechas, setFechas] = useState([]);
  const [hora, setHora] = useState("1ª hora");
  const [lugarId, setLugarId] = useState(LUGARES_MEDIDA[0].id);
  const [lugarOtro, setLugarOtro] = useState("");
  const listo = fechas.length > 0 && (t.sinLugar || lugarId !== "otro" || lugarOtro.trim());
  return (
    <div style={{ background: R.azulClaro, padding: 12, marginTop: 10, display: "grid", gap: 12 }}>
      <CamposProgramar t={t} fechas={fechas} setFechas={setFechas} hora={hora} setHora={setHora} lugarId={lugarId} setLugarId={setLugarId} lugarOtro={lugarOtro} setLugarOtro={setLugarOtro} prefijo={`gd-prog-${m.id}`} />
      {m.veces > 0 && fechas.length > 0 && fechas.length !== m.veces && <div style={{ fontSize: 15, color: R.petroleo }}>El parte pedía {m.veces} {m.veces === 1 ? "vez" : "veces"} y has elegido {fechas.length} {fechas.length === 1 ? "día" : "días"}.</div>}
      <div><button type="button" disabled={!listo} onClick={() => onProgramar(fechas.map(f => t.sinLugar ? { fecha: f, hora: t.hora || hora, lugar: "", lugarId: "", estado: "pendiente" } : sesionEn(lugarId, lugarOtro, { fecha: f, hora: t.hora || hora, estado: "pendiente" })))} style={estilosMedida.principal(listo)}>Programar</button></div>
    </div>
  );
}

// Una persona que tiene que cumplir hoy: la usan Jefatura y el profesorado de guardia de la zona
function FilaMedidaHoy({ m, s, i, onMarcar, extra }) {
  const boton = (fondo, letra) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: fondo === C.white ? `2px solid ${R.azul}` : "none", background: fondo, color: letra, fontSize: 15, fontWeight: 700, cursor: "pointer" });
  return (
    <div data-medida={m.id} style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: R.petroleo, marginBottom: 4 }}>{m.alumno} <span style={{ fontWeight: 400, fontSize: 15 }}>· {m.curso}</span></div>
        <div style={{ fontSize: 15, color: R.petroleo }}><b>{conTramo(s.hora)}{s.lugar ? ` · ${s.lugar}` : ""}</b> · {tipoMedida(m.tipo).label} · puesta por {m.puestaPor}</div>
        {m.detalle && <div style={{ fontSize: 14, color: R.noche, marginTop: 2 }}>{m.detalle}</div>}
        {extra}
      </div>
      {s.estado === "pendiente" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => onMarcar(m.id, i, "cumplida")} style={boton(R.verde, R.noche)}>✓ Ha venido</button>
          <button type="button" onClick={() => onMarcar(m.id, i, "ausente")} style={boton(C.white, R.petroleo)}>✗ No se ha presentado</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: R.petroleo }}>{s.estado === "cumplida" ? "✓ Ha venido" : "✗ No se ha presentado"}{s.marcadaPor ? ` · lo marcó ${s.marcadaPor}` : ""}</span>
          <button type="button" onClick={() => onMarcar(m.id, i, "pendiente")} style={{ minHeight: 44, border: "none", background: "none", color: R.azul, textDecoration: "underline", fontSize: 15, cursor: "pointer" }}>Deshacer</button>
        </div>
      )}
    </div>
  );
}

// En cada guardia: el alumnado que tiene que estar en esa zona y a esa hora por una medida correctora
function AlumnadoMedidas({ fecha, hora, zonaId, medidas, onMarcar }) {
  const filas = medidas.flatMap(m => (m.sesiones || []).map((s, i) => ({ m, s, i })))
    .filter(({ s }) => s.fecha === fecha && s.hora === hora && s.estado !== "movida" && zonaDeSesion(s) === zonaId);
  if (!filas.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: R.mostaza, color: R.noche, padding: "8px 12px", fontWeight: 700, fontSize: 16 }}>Alumnado con medida correctora ({filas.length})</div>
      <div style={{ background: R.crema, padding: 10, display: "grid", gap: 8 }}>
        {filas.map(({ m, s, i }) => <FilaMedidaHoy key={`${m.id}-${i}`} m={m} s={s} i={i} onMarcar={onMarcar} />)}
      </div>
    </div>
  );
}

// Lista del día en PDF, para imprimirla o dejarla en el aula
function pdfListaMedidas(fecha, filas) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const y = cabeceraPDF(doc, "Medidas correctoras del día", parseISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  autoTable(doc, { ...estiloTabla, startY: y,
    head: [["Hora", "Aula o lugar", "De guardia", "Alumno/a", "Curso", "Medida", "Puesta por", "¿Ha venido?"]],
    body: filas.map(({ m, s, guardia }) => [conTramo(s.hora), s.lugar || "-", guardia?.length ? guardia.join(", ") : "-", m.alumno, m.curso, tipoMedida(m.tipo).label, m.puestaPor, s.estado === "cumplida" ? "Sí" : s.estado === "ausente" ? "No" : ""].map(sinEmoji)) });
  guardarPDF(doc, `medidas-${fecha}.pdf`);
}

// Pestaña de Jefatura: qué hay que programar, quién tiene que cumplir hoy y qué queda pendiente
function PanelMedidas({ medidas, setMedidas, partes, onMarcar, guardiaDe, onParteIncumplimiento, onVerParte }) {
  const [verCumplidas, setVerCumplidas] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState({});
  const [programando, setProgramando] = useState(null);
  const hoy = isoLocal();
  const cambiar = (id, fn) => setMedidas(prev => prev.map(m => m.id === id ? fn(m) : m));
  const moverDia = (m, fecha) => cambiar(m.id, x => {
    const falta = x.sesiones.find(s => s.estado === "ausente") || {};
    return { ...x, sesiones: [...x.sesiones.map(s => s.estado === "ausente" ? { ...s, estado: "movida" } : s), { fecha, hora: falta.hora || tipoMedida(x.tipo).hora || "Recreo", lugar: falta.lugar || "", lugarId: falta.lugarId || "", estado: "pendiente" }] };
  });
  const deHoy = medidas.flatMap(m => (m.sesiones || []).map((s, i) => ({ m, s, i, guardia: zonaDeSesion(s) ? guardiaDe(s.fecha, s.hora, zonaDeSesion(s)) : null })).filter(({ s }) => s.fecha === hoy && s.estado !== "movida"))
    .sort((a, b) => HORAS.indexOf(a.s.hora) - HORAS.indexOf(b.s.hora) || (a.s.lugar || "").localeCompare(b.s.lugar || "") || a.m.alumno.localeCompare(b.m.alumno));
  const porEstado = e => medidas.filter(m => estadoMedida(m) === e);
  const tarjeta = { background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 12, marginBottom: 8 };
  const boton = (fondo, letra) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: fondo === C.white ? `2px solid ${R.azul}` : "none", background: fondo, color: letra, fontSize: 15, fontWeight: 700, cursor: "pointer" });
  const enlace = { minHeight: 44, border: "none", background: "none", color: R.azul, textDecoration: "underline", fontSize: 15, cursor: "pointer" };
  const verParte = m => { const p = partes.find(x => x.id === m.parteId); if (p) onVerParte(p); };
  const barra = (texto, fondo) => <div style={{ background: fondo, color: R.noche, padding: "10px 14px", fontSize: 17, fontWeight: 700, marginTop: 22 }}>{texto}</div>;
  const nombre = m => <div style={{ fontWeight: 700, fontSize: 17, color: R.petroleo, marginBottom: 4 }}>{m.alumno} <span style={{ fontWeight: 400, fontSize: 15 }}>· {m.curso}</span></div>;
  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Medidas correctoras" sub="Programar las medidas, la lista de hoy y su seguimiento" icono="tipificacion" /></div>

      {barra(`Por programar (${porEstado("sin_programar").length})`, R.mostaza)}
      <div style={{ background: R.crema, padding: 12 }}>
        {porEstado("sin_programar").length === 0 && <div style={{ fontSize: 15, color: R.petroleo }}>No hay medidas por programar.</div>}
        {porEstado("sin_programar").map(m => (
          <div key={m.id} data-medida={m.id} style={tarjeta}>
            {nombre(m)}
            <ResumenMedida m={m} />
            {programando === m.id
              ? <ProgramarMedida m={m} onProgramar={ses => { cambiar(m.id, x => ({ ...x, sesiones: ses })); setProgramando(null); }} />
              : <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="button" onClick={() => setProgramando(m.id)} style={boton(R.azul, "#fff")}>Poner día y aula</button>
                  <button type="button" onClick={() => verParte(m)} style={enlace}>Ver el parte</button>
                </div>}
          </div>
        ))}
      </div>

      {barra(`Hoy, ${fechaCorta(hoy)}`, R.mostaza)}
      <div style={{ background: R.crema, padding: 12 }}>
        {deHoy.length === 0 && <div style={{ fontSize: 15, color: R.petroleo }}>Hoy no hay medidas que cumplir.</div>}
        {deHoy.length > 0 && <div style={{ marginBottom: 10 }}><button type="button" onClick={() => pdfListaMedidas(hoy, deHoy)} style={boton(C.white, R.petroleo)}>📄 Descargar la lista de hoy</button></div>}
        <div style={{ display: "grid", gap: 8 }}>
          {deHoy.map(({ m, s, i, guardia }) => (
            <FilaMedidaHoy key={`${m.id}-${i}`} m={m} s={s} i={i} onMarcar={onMarcar}
              extra={guardia && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 2 }}>{guardia.length ? <>De guardia: <b>{guardia.join(", ")}</b></> : "⚠️ No hay profesorado de guardia en esta zona: asígnalo en el cuadrante"}</div>} />
          ))}
        </div>
      </div>

      {barra(`Sin cumplir (${porEstado("incumplida").length})`, R.mostaza)}
      <div style={{ background: R.crema, padding: 12 }}>
        {porEstado("incumplida").length === 0 && <div style={{ fontSize: 15, color: R.petroleo }}>No hay medidas sin cumplir.</div>}
        {porEstado("incumplida").map(m => (
          <div key={m.id} data-medida={m.id} style={tarjeta}>
            {nombre(m)}
            <ResumenMedida m={m} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
              <input type="date" aria-label={`Nuevo día para ${m.alumno}`} value={nuevaFecha[m.id] || proximosLectivos(1, sumarDias(new Date(), 1))[0]} onChange={e => setNuevaFecha(v => ({ ...v, [m.id]: e.target.value }))}
                style={{ minHeight: 44, padding: "6px 10px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche }} />
              <button type="button" onClick={() => moverDia(m, nuevaFecha[m.id] || proximosLectivos(1, sumarDias(new Date(), 1))[0])} style={boton(C.white, R.petroleo)}>Pasar a otro día</button>
              {m.parteIncumplimiento
                ? <span style={{ fontSize: 15, color: R.petroleo, fontWeight: 700 }}>✓ Parte 9L puesto</span>
                : <button type="button" onClick={() => { const id = onParteIncumplimiento(m); cambiar(m.id, x => ({ ...x, parteIncumplimiento: id })); }} style={boton(R.azul, "#fff")}>Poner parte por no cumplirla</button>}
              <button type="button" onClick={() => verParte(m)} style={enlace}>Ver el parte</button>
            </div>
          </div>
        ))}
      </div>

      {barra(`Programadas y en curso (${porEstado("pendiente").length + porEstado("en_curso").length})`, R.turquesa)}
      <div style={{ background: R.azulClaro, padding: 12 }}>
        {[...porEstado("en_curso"), ...porEstado("pendiente")].length === 0 && <div style={{ fontSize: 15, color: R.petroleo }}>No hay medidas programadas.</div>}
        {[...porEstado("en_curso"), ...porEstado("pendiente")].map(m => (
          <div key={m.id} style={tarjeta}>
            {nombre(m)}
            <ResumenMedida m={m} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {!(m.sesiones || []).length && <button type="button" onClick={() => cambiar(m.id, x => ({ ...x, cumplida: true }))} style={boton(R.verde, R.noche)}>✓ Marcar como cumplida</button>}
              <button type="button" onClick={() => verParte(m)} style={enlace}>Ver el parte</button>
            </div>
          </div>
        ))}
      </div>

      {barra(`Cumplidas (${porEstado("cumplida").length})`, R.verde)}
      <div style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 12 }}>
        <button type="button" onClick={() => setVerCumplidas(v => !v)} style={{ minHeight: 44, border: "none", background: "none", color: R.azul, fontSize: 16, fontWeight: 700, cursor: "pointer", padding: 0 }}>{verCumplidas ? "▾ Ocultar" : "▸ Ver las medidas cumplidas"}</button>
        {verCumplidas && porEstado("cumplida").map(m => (
          <div key={m.id} style={{ ...tarjeta, marginTop: 8 }}>
            {nombre(m)}
            <ResumenMedida m={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Medidas de ejemplo para la demostración, a partir de partes leves recientes (todo ficticio)
function medidasEjemplo(partes) {
  const leves = partes.filter(p => p.gravedad === "leve").slice(0, 7);
  if (leves.length < 7) return [];
  const hoy = isoLocal(), ayer = isoLocal(sumarDias(new Date(), -1)), manana = proximosLectivos(1, sumarDias(new Date(), 1))[0];
  const base = (p, extra) => ({ id: p.id + 7, parteId: p.id, alumnoId: p.alumnoId, alumno: p.alumno, curso: p.curso, gravedad: p.gravedad, detalle: "", puestaPor: p.profesor, ts: p.ts, ...extra });
  const ses = (fecha, hora, lugar, estado = "pendiente") => sesionEn(lugar === "Biblioteca" ? "A0-biblio" : "aula-conv", "", { fecha, hora, estado });
  return [
    base(leves[0], { tipo: "recreo", veces: 2, sesiones: [ses(hoy, "Recreo", "Aula de convivencia"), ses(manana, "Recreo", "Aula de convivencia")] }),
    base(leves[1], { tipo: "aula_conv", veces: 1, sesiones: [ses(hoy, "3ª hora", "Aula de convivencia")] }),
    base(leves[2], { tipo: "hora_mas", veces: 2, sesiones: [ses(ayer, "7ª hora", "Biblioteca", "cumplida"), ses(hoy, "7ª hora", "Biblioteca")] }),
    base(leves[3], { tipo: "recreo", veces: 1, sesiones: [ses(ayer, "Recreo", "Aula de convivencia", "ausente")] }),
    base(leves[4], { tipo: "aula_conv", veces: 1, sesiones: [ses(ayer, "2ª hora", "Aula de convivencia", "cumplida")] }),
    base(leves[5], { tipo: "recreo", veces: 3, sesiones: [] }),
    base(leves[6], { tipo: "hora_mas", veces: 1, sesiones: [] }),
  ];
}

// ─── Tarjeta de parte ────────────────────────────────────────────────────────
function ParteCard({ parte, onVer, onPrint, medidas = [] }) {
  const g = gObj(parte.gravedad);
  return (
    <div onClick={onVer} role="button" tabIndex={0} title="Pulsa para ver el parte en grande"
      onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) onVer(); }}
      onMouseOver={e => { e.currentTarget.style.background = R.azulClaro; }}
      onMouseOut={e => { e.currentTarget.style.background = C.white; }}
      style={{ background: C.white, padding: 16, marginBottom: 10, border: `1px solid ${R.turquesaClaro}`, borderLeft: `10px solid ${g.color}`, cursor: "pointer", transition: "background .15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: R.petroleo }}>
            {parte.alumno}
            {parte.esGrupal && <span style={{ fontSize: 14, background: R.azulClaro, color: R.petroleo, borderRadius: 4, padding: "2px 8px", marginLeft: 6 }}><Ic n="grupos" tam={20} />grupal</span>}
          </div>
          <div style={{ fontSize: 14, color: R.petroleo, marginTop: 4, lineHeight: 1.5 }}>
            <Ic n="aula" tam={20} />{parte.curso}{parte.tutor ? ` (tutor/a: ${parte.tutor})` : ""} · {parte.tipo} · <Ic n="hora-reloj" tam={18} />{parte.hora || "—"} · <Ic n="fecha-hora" tam={18} />{fmt(parte.ts)} · <Ic n="cargo-profesor" tam={18} />{parte.profesor}
          </div>
          <div style={{ fontSize: 15, marginTop: 6, color: R.noche, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {parte.descripcion}
          </div>
          {medidas.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8, fontSize: 15, color: R.petroleo }}>
              <Ic n="tipificacion" tam={22} /><b>{tipoMedida(m.tipo).label}</b><ChipMedida m={m} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
          <Badge g={parte.gravedad} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={e => { e.stopPropagation(); onVer(); }} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}><Ic n="buscar" tam={22} />Ver</button>
            <button onClick={e => { e.stopPropagation(); onPrint(); }} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}><Ic n="informe" tam={22} />PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gestión de alumnos ───────────────────────────────────────────────────────
// ─── Tutorías de grupo ───────────────────────────────────────────────────────
// Cada grupo tiene su tutor/a. Se usa en los partes nuevos y en los informes.
function TutoriasGrupos({ cursos, tutores, setTutores, setAlumnos, profesores, soloCurso, C, inpStyle }) {
  const lista = soloCurso ? [soloCurso] : [...new Set([...cursos, ...Object.keys(tutores)])].sort();
  function cambiar(curso, campo, valor) {
    setTutores(prev => ({ ...prev, [curso]: { ...(prev[curso] || {}), [campo]: valor } }));
    if (campo === "tutor") setAlumnos(prev => prev.map(a => a.curso === curso ? { ...a, tutor: valor } : a));
  }
  const inp = { ...inpStyle, padding: "8px 10px", fontSize: 14 };
  return (
    <div style={{ background: C.white, borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1px solid ${C.cream}` }}>
      <div style={{ fontWeight: 700, color: C.dark, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="tutor" tam={36} />{soloCurso ? `Tutor/a de ${soloCurso}` : "Tutorías de grupo"}</div>
      <div style={{ fontSize: 14, color: C.gray, margin: "4px 0 12px" }}>
        {soloCurso ? "Aparece en el informe. Si lo cambias aquí, queda guardado para el grupo." : "El tutor/a de cada grupo aparece en los partes y en los informes. Los cambios se guardan solos."}
      </div>
      {lista.length === 0 && <div style={{ fontSize: 14, color: C.gray }}>Aún no hay grupos. Añade alumnado primero.</div>}
      {lista.map(curso => (
        <div key={curso} style={{ display: "grid", gridTemplateColumns: soloCurso ? "repeat(auto-fit,minmax(180px,1fr))" : "72px minmax(0,1fr) minmax(0,1fr)", gap: 8, alignItems: "center", marginBottom: 8 }}>
          {!soloCurso && <div style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}>{curso}</div>}
          <select aria-label={`Tutor/a de ${curso}`} value={tutores[curso]?.tutor || ""} onChange={e => cambiar(curso, "tutor", e.target.value)} style={inp}>
            <option value="">— Sin tutor/a —</option>
            {[...new Set([...(profesores || []), tutores[curso]?.tutor].filter(Boolean))].sort().map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input aria-label={`Correo del tutor/a de ${curso}`} type="email" placeholder="Correo del centro (opcional)" value={tutores[curso]?.email || ""} onChange={e => cambiar(curso, "email", e.target.value)} style={inp} />
        </div>
      ))}
    </div>
  );
}

// ─── Informes guardados ─────────────────────────────────────────────────────
// Cada vez que se descarga un informe queda anotado: quién, cuándo, con qué filtros
// y qué partes contenía. Se puede volver a descargar igual que estaba.
function InformesGuardados({ informes, setInformes, partes, banos, tutores, C }) {
  if (!informes.length) return null;
  function descargar(inf) {
    if (inf.tipo === "banos") pdfInformeBanos(banos.filter(b => inf.ids.includes(b.id)), inf.filtrosTexto);
    else pdfInformePartes(partes.filter(p => inf.ids.includes(p.id)), inf.filtrosTexto, tutores, inf.ts);
  }
  return (
    <div style={{ background: C.white, borderRadius: 14, padding: 18, marginTop: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <div style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}><Ic n="documentos" tam={20} />Informes guardados</div>
      <div style={{ fontSize: 14, color: C.gray, margin: "4px 0 12px" }}>Cada informe descargado queda aquí anotado con sus partes, para volver a sacarlo igual.</div>
      {informes.map(inf => (
        <div key={inf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.cream}`, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}><Ti tam={20}>{inf.tipo === "banos" ? "🚻 Salidas al baño" : "📋 Partes"}</Ti> · {inf.total} registro{inf.total !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: 14, color: C.gray }}>{fmt(inf.ts)} · {inf.autor || "—"}{inf.filtrosTexto ? ` · ${inf.filtrosTexto}` : " · Sin filtros"}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => descargar(inf)} style={{ background: "#DDF0F4", color: C.teal, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>⬇️ PDF</button>
            <button aria-label="Quitar del historial" onClick={() => { if (window.confirm("¿Quitar este informe del historial? Los partes no se borran.")) setInformes(prev => prev.filter(x => x.id !== inf.id)); }} style={{ background: "#EBF0F6", color: C.gray, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}><Ic n="eliminar" tam={20} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminAlumnos({ alumnos, setAlumnos, inpStyle, C }) {
  const [avisoAlta, setAvisoAlta] = useState("");
  const [nuevoAlumno, setNuevoAlumno] = useState({ nombre: "", curso: "", tutor: "", email: "", telefono: "", nia: "" });
  const [preview, setPreview] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [subTab, setSubTab] = useState("importar");
  const [feedbackAñadir, setFeedbackAñadir] = useState(false); // Nuevo: feedback visual
  const fileRef = useRef();

  async function processFile(file) {
    setImportMsg(null); setPreview(null);
    try {
      if (file.name.match(/\.csv$/i) || file.type === "text/csv") {
        const text = await file.text();
        const rows = parseCSV(text);
        if (!rows.length) { setImportMsg({ type: "error", text: "No se encontraron alumnos en el archivo." }); return; }
        setPreview(rows);
      } else if (file.name.match(/\.xlsx?$/i)) {
        const loadXLSX = () => new Promise((res, rej) => {
          if (window.XLSX) { res(window.XLSX); return; }
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = () => res(window.XLSX); s.onerror = rej;
          document.head.appendChild(s);
        });
        const XLSX = await loadXLSX();
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
        const rows = parseCSV(raw);
        if (!rows.length) { setImportMsg({ type: "error", text: "No se encontraron alumnos en el archivo." }); return; }
        setPreview(rows);
      } else {
        setImportMsg({ type: "error", text: "Formato no soportado. Usa CSV o Excel (.xlsx)." });
      }
    } catch (e) {
      setImportMsg({ type: "error", text: "Error al leer el archivo: " + e.message });
    }
  }

  function confirmarImport() {
    // Un alumno ya está si coincide su NIA o, si no hay NIA, su nombre y curso
    const norm = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    const clave = a => a.nia ? `nia:${String(a.nia).trim()}` : `nc:${norm(a.nombre)}|${norm(a.curso)}`;
    const vistos = new Set(alumnos.map(clave));
    const nuevos = [];
    preview.forEach(a => { const k = clave(a); if (!vistos.has(k)) { vistos.add(k); nuevos.push(a); } });
    const repetidos = preview.length - nuevos.length;
    setAlumnos(prev => [...prev, ...nuevos]);
    setImportMsg({ type: "ok", text: `✅ ${nuevos.length} alumno(s) importados correctamente.${repetidos ? ` ${repetidos} ya estaban y no se han duplicado.` : ""}` });
    setPreview(null);
  }

  const stb = active => ({
    padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
    fontSize: 14, fontWeight: 600,
    color: active ? C.teal : C.gray,
    borderBottom: active ? `3px solid ${C.teal}` : "3px solid transparent",
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Gestión de Alumnos" icono="grupos" /></div>
      <div style={{ background: C.white, borderRadius: 12, marginBottom: 14, display: "flex", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderBottom: `2px solid ${C.cream}` }}>
        <button style={stb(subTab === "importar")} onClick={() => setSubTab("importar")}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="importar" tam={30} />Importar CSV/Excel</span></button>
        <button style={stb(subTab === "manual")}   onClick={() => setSubTab("manual")}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="anadir-manual" tam={30} />Añadir manual</span></button>
        <button style={stb(subTab === "lista")}    onClick={() => setSubTab("lista")}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="lista-completa" tam={30} />Lista completa</span></button>
      </div>

      {subTab === "importar" && (
        <div>
          <Card style={{ background: "#DDF0F4", border: `1px solid ${C.blue}`, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="como-exportar" tam={32} />Cómo exportar desde Raíces</div>
            <div style={{ fontSize: 14, color: "#16333F", lineHeight: 1.8 }}>
              1. Entra en <strong>Raíces → Alumnado → Listados</strong><br />
              2. Exporta en formato <strong>CSV o Excel</strong><br />
              3. Asegúrate de incluir columnas: <em>Nombre, Curso/Grupo, Tutor, Email y Teléfono</em><br />
              4. Arrastra el archivo aquí abajo o pulsa para seleccionarlo
            </div>
          </Card>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => fileRef.current.click()}
            style={{ border: `2px dashed ${dragging ? C.teal : "#CDE9ED"}`, borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#DDF0F4" : C.white, transition: "all .2s", marginBottom: 14 }}>
            <Icono nombre="arrastrar" tam={88} style={{ margin: "0 auto 8px" }} />
            <div style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}>Arrastra tu archivo aquí</div>
            <div style={{ color: C.gray, fontSize: 14, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icono nombre="formato" tam={30} />o haz clic para seleccionar · CSV o Excel (.xlsx)</div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
              onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ""; }} />
          </div>
          {importMsg && (
            <div style={{ background: importMsg.type === "ok" ? "#DDF0F4" : "#FDF1D9", border: `1px solid ${importMsg.type === "ok" ? C.teal : C.salmon}`, borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, color: importMsg.type === "ok" ? C.teal : C.salmon, marginBottom: 14 }}>
              {importMsg.text}
            </div>
          )}
          {preview && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}>Vista previa — {preview.length} alumnos encontrados</div>
                <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.gray }}>✕</button>
              </div>
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: C.dark, color: "#fff" }}>
                      {["Nombre", "Curso", "Tutor", "Email", "Teléfono", "NIA"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((a, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.light }}>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #eee", fontWeight: 600 }}>{a.nombre || <span style={{ color: "#f87171" }}>⚠ vacío</span>}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #eee" }}>{a.curso || "—"}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #eee" }}>{a.tutor || "—"}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #eee" }}>{a.email || "—"}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #eee" }}>{a.telefono || "—"}</td>
                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #eee" }}>{a.nia || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && <div style={{ textAlign: "center", color: C.gray, fontSize: 14, padding: "8px 0" }}>… y {preview.length - 10} más</div>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={confirmarImport} color={C.teal} style={{ flex: 1 }}>✅ Confirmar importación ({preview.length} alumnos)</Btn>
                <Btn onClick={() => setPreview(null)} color={C.gray}>Cancelar</Btn>
              </div>
            </Card>
          )}
        </div>
      )}

      {subTab === "manual" && (
        <Card>
          <h3 style={{ marginTop: 0, color: C.dark, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="anadir-manual" tam={40} />Añadir alumno manualmente</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["nombre", "Nombre completo *"], ["curso", "Curso / Aula *"], ["tutor", "Tutor de grupo"], ["email", "Email familia"], ["telefono", "Teléfono familia"], ["nia", "NIA / DNI"]].map(([k, ph]) => (
              <input key={k} aria-label={ph.replace(" *", "")} list={k === "curso" ? "rumbo-cursos-alta" : undefined} value={nuevoAlumno[k] || ""} onChange={e => { setAvisoAlta(""); setNuevoAlumno(p => ({ ...p, [k]: e.target.value })); }} placeholder={ph} style={inpStyle} />
            ))}
            <datalist id="rumbo-cursos-alta">{[...new Set(alumnos.map(a => a.curso))].sort().map(c => <option key={c} value={c} />)}</datalist>
          </div>
          {avisoAlta && <div role="alert" style={{ marginTop: 10, color: "#275D8C", fontWeight: 700, fontSize: 14 }}>{avisoAlta}</div>}
          <Btn onClick={() => {
            const nombre = (nuevoAlumno.nombre || "").trim(), curso = (nuevoAlumno.curso || "").trim();
            if (!nombre || !curso) { setAvisoAlta("Escribe el nombre completo y el curso: son obligatorios."); return; }
            const igual = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
            if (alumnos.some(a => (nuevoAlumno.nia && a.nia === nuevoAlumno.nia) || (igual(a.nombre) === igual(nombre) && igual(a.curso) === igual(curso)))) {
              setAvisoAlta(`${nombre} ya está dado/a de alta en ${curso}.`); return;
            }
            setAlumnos(prev => [...prev, { ...nuevoAlumno, nombre, curso, id: Date.now() }]);
            setNuevoAlumno({ nombre: "", curso: "", tutor: "", email: "", telefono: "", nia: "" });
            // Feedback visual
            setFeedbackAñadir(true);
            setTimeout(() => setFeedbackAñadir(false), 1500);
          }} color={feedbackAñadir ? "#63CBA1" : C.teal} style={{ marginTop: 12, transition: "all .3s ease" }}>
            {feedbackAñadir ? "✅ ¡Alumno agregado!" : "➕ Añadir Alumno"}
          </Btn>
        </Card>
      )}

      {subTab === "lista" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontWeight: 600, color: C.dark }}><Ic n="por-alumno" tam={20} />{alumnos.length} alumno(s) en el sistema</div>
            {alumnos.length > 0 && (
              confirmarBorrado
                ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: C.salmon, fontWeight: 600 }}>¿Borrar todos al inicio de curso?</span>
                  <Btn onClick={() => { setAlumnos([]); setConfirmarBorrado(false); }} color={C.salmon} style={{ padding: "6px 14px", fontSize: 14 }}>Sí, borrar</Btn>
                  <Btn onClick={() => setConfirmarBorrado(false)} color={C.gray} style={{ padding: "6px 14px", fontSize: 14 }}>Cancelar</Btn>
                </div>
                : <button onClick={() => setConfirmarBorrado(true)} style={{ background: "#FDF1D9", color: C.salmon, border: `1px solid ${C.salmon}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}><Ic n="eliminar" tam={20} />Limpiar lista (nuevo curso)</button>
            )}
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {alumnos.length === 0
              ? <div style={{ padding: 30, textAlign: "center", color: C.gray }}>Sin alumnos. Importa un CSV o añádelos manualmente.</div>
              : alumnos.map(a => (
                <div key={a.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.cream}`, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.dark }}>{a.nombre} <span style={{ color: C.gray, fontWeight: 400 }}>— {a.curso}</span>{a.nia && <span style={{ fontSize: 13, color: C.blue, marginLeft: 6 }}>NIA: {a.nia}</span>}</div>
                    <div style={{ color: C.gray, marginTop: 2 }}>Tutor: {a.tutor || "—"} · ✉️ {a.email || "—"} · 📱 {a.telefono || "—"}</div>
                  </div>
                  <button onClick={() => setAlumnos(prev => prev.filter(x => x.id !== a.id))} style={{ background: "#FDF1D9", color: C.salmon, border: "none", borderRadius: 8, padding: "4px 6px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex" }} title="Eliminar"><Icono nombre="eliminar" tam={26} /></button>
                </div>
              ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Planificador de Guardias ─────────────────────────────────────────────────
function PlanificadorGuardias({ profesores, cursos, inpStyle, selStyle, labelStyle }) {
  const hoy = todayStr();

  // Estado del formulario por módulos
  const [paso, setPaso] = useState(1);

  // Módulo 1 — Fecha y periodo
  const [pgFecha, setPgFecha]       = useState(hoy);
  const [pgFechaFin, setPgFechaFin] = useState(hoy);
  const [pgMultidia, setPgMultidia] = useState(false);
  const [pgNota, setPgNota]         = useState("");

  // Módulo 2 — Profesor ausente
  const [pgProfesor, setPgProfesor]     = useState("");
  const [pgMotivo, setPgMotivo]         = useState("Enfermedad");
  const [pgHoras, setPgHoras]           = useState([]); // horas afectadas
  const [pgCursoHora, setPgCursoHora]   = useState({}); // { hora: curso }
  const [pgMateriaHora, setPgMateriaHora] = useState({}); // { hora: materia }

  // Módulo 3 — Aula y tarea
  const [pgModuloEdificio, setPgModuloEdificio] = useState({}); // { hora: modulo }
  const [pgTareaHora, setPgTareaHora]           = useState({}); // { hora: tarea }
  const [pgMaterialHora, setPgMaterialHora]     = useState({}); // { hora: material_detalle }

  // Módulo 4 — Profesor de guardia
  const [pgGuardiaHora, setPgGuardiaHora]   = useState({}); // { hora: profesor }
  const [pgZonaHora, setPgZonaHora]         = useState({}); // { hora: zona }

  // Resultado
  const [planGuardia, setPlanGuardia]       = useState(null);
  const [planesGuardia, setPlanesGuardia]   = useState([]);
  const [verPlan, setVerPlan]               = useState(null);

  const [planesCargados, setPlanesCargados] = useState(false);
  useEffect(() => {
    async function load() {
      const pg = await sGet("planes_guardia");
      if (pg) setPlanesGuardia(pg);
      setPlanesCargados(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (planesCargados) sSet("planes_guardia", planesGuardia);
  }, [planesGuardia, planesCargados]);

  function toggleHora(h) {
    setPgHoras(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  }

  function setCursoHora(hora, val) { setPgCursoHora(p => ({ ...p, [hora]: val })); }
  function setMateriaHora(hora, val) { setPgMateriaHora(p => ({ ...p, [hora]: val })); }
  function setModuloHora(hora, val) { setPgModuloEdificio(p => ({ ...p, [hora]: val })); }
  function setTareaHora(hora, val) { setPgTareaHora(p => ({ ...p, [hora]: val })); }
  function setMaterialDetalleHora(hora, val) { setPgMaterialHora(p => ({ ...p, [hora]: val })); }
  function setGuardiaHora(hora, val) { setPgGuardiaHora(p => ({ ...p, [hora]: val })); }
  function setZonaHora(hora, val) { setPgZonaHora(p => ({ ...p, [hora]: val })); }

  function validarPaso(n) {
    if (n === 1) return pgFecha && pgProfesor === "" ? false : true; // siempre ok en paso 1
    if (n === 2) return pgProfesor && pgHoras.length > 0;
    if (n === 3) return pgHoras.every(h => pgCursoHora[h]);
    if (n === 4) return pgHoras.every(h => pgGuardiaHora[h]);
    return true;
  }

  function generarPlan() {
    const plan = {
      id: Date.now(),
      fecha: pgFecha,
      fechaFin: pgMultidia ? pgFechaFin : pgFecha,
      multidia: pgMultidia,
      profesorAusente: pgProfesor,
      motivo: pgMotivo,
      nota: pgNota,
      horas: pgHoras.map(h => ({
        hora: h,
        curso: pgCursoHora[h] || "",
        materia: pgMateriaHora[h] || "",
        modulo: pgModuloEdificio[h] || "",
        tarea: pgTareaHora[h] || "",
        materialDetalle: pgMaterialHora[h] || "",
        profesorGuardia: pgGuardiaHora[h] || "",
        zona: pgZonaHora[h] || "",
      })),
      ts: new Date().toISOString(),
    };
    setPlanesGuardia(prev => [plan, ...prev]);
    setPlanGuardia(plan);
    // reset
    setPaso(1); setPgFecha(hoy); setPgFechaFin(hoy); setPgMultidia(false); setPgNota("");
    setPgProfesor(""); setPgMotivo("Enfermedad"); setPgHoras([]);
    setPgCursoHora({}); setPgMateriaHora({}); setPgModuloEdificio({});
    setPgTareaHora({}); setPgMaterialHora({}); setPgGuardiaHora({}); setPgZonaHora({});
  }

  // Colores de paso
  const pasoColor = n => n < paso ? C.teal : n === paso ? C.blue : "#CDE9ED";

  // ── Vista detalle de un plan ──
  if (verPlan) return (
    <div>
      <button onClick={() => setVerPlan(null)}
        style={{ marginBottom: 16, background: C.cream, border: `1px solid #ddd`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 14, color: C.dark }}>
        ← Volver al listado
      </button>
      <div style={{ background: R.azul, borderRadius: "14px 14px 0 0", padding: "20px 24px", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: .7, letterSpacing: 1, marginBottom: 4 }}>PLAN DE GUARDIA · {CENTRO.toUpperCase()}</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}><Ic n="por-alumno" tam={20} />{verPlan.profesorAusente}</div>
        <div style={{ fontSize: 14, opacity: .85, marginTop: 4 }}>
          <Ic n="fecha-hora" tam={20} />{verPlan.multidia ? `${fmtD(verPlan.fecha)} → ${fmtD(verPlan.fechaFin)}` : fmtD(verPlan.fecha)} · {verPlan.motivo}
        </div>
        {verPlan.nota && <div style={{ fontSize: 14, opacity: .75, marginTop: 4, fontStyle: "italic" }}>{verPlan.nota}</div>}
      </div>
      <div style={{ background: C.white, borderRadius: "0 0 14px 14px", padding: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: C.dark, marginBottom: 12 }}>Resumen de {verPlan.horas.length} hora(s)</div>
        {verPlan.horas.map((h, i) => (
          <div key={i} style={{ borderRadius: 12, border: `1px solid #CDE9ED`, marginBottom: 10, overflow: "hidden" }}>
            {/* Cabecera hora */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: C.cream }}>
              <div style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}><Ic n="hora-reloj" tam={20} />{h.hora}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {h.curso && <span style={{ background: "#DDF0F4", color: C.blue, borderRadius: 6, padding: "2px 10px", fontSize: 14, fontWeight: 600 }}><Ic n="por-curso" tam={20} />{h.curso}</span>}
                {h.materia && <span style={{ background: C.amberBg, color: C.amber, borderRadius: 6, padding: "2px 10px", fontSize: 14 }}><Ic n="aula" tam={20} />{h.materia}</span>}
                {h.modulo && <span style={{ background: "#DDF0F4", color: C.teal, borderRadius: 6, padding: "2px 10px", fontSize: 14 }}>🏢 {h.modulo}</span>}
              </div>
            </div>
            {/* Cuerpo */}
            <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 14 }}>
              <div>
                <div style={{ color: C.gray, fontWeight: 600, marginBottom: 4 }}><Ic n="guardias" tam={20} />Profesor de guardia</div>
                <div style={{ color: C.dark, fontWeight: 700 }}>{h.profesorGuardia || <span style={{ color: "#f87171" }}>⚠ Sin asignar</span>}</div>
                {h.zona && <div style={{ color: C.gray, marginTop: 2 }}><Ic n="edificio" tam={20} />{h.zona}</div>}
              </div>
              <div>
                <div style={{ color: C.gray, fontWeight: 600, marginBottom: 4 }}><Ic n="partes" tam={20} />Tarea para los alumnos</div>
                <div style={{ color: C.dark }}>{h.tarea || <span style={{ color: C.gray, fontStyle: "italic" }}>Sin tarea especificada</span>}</div>
                {h.materialDetalle && <div style={{ color: C.gray, marginTop: 2, fontSize: 14 }}>📎 {h.materialDetalle}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => { setPlanesGuardia(prev => prev.filter(p => p.id !== verPlan.id)); setVerPlan(null); }}
        style={{ background: "#FDF1D9", color: C.salmon, border: `1px solid ${C.salmon}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        🗑 Eliminar este plan
      </button>
    </div>
  );

  // ── Vista principal ──
  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Planificador de Guardias" icono="horario" /></div>

      {planGuardia && (
        <Card style={{ background: "#DDF0F4", border: `2px solid ${C.teal}`, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong style={{ color: C.teal }}>✅ Plan generado correctamente</strong>
              <div style={{ fontSize: 14, color: C.dark, marginTop: 2 }}>
                {planGuardia.profesorAusente} · {fmtD(planGuardia.fecha)} · {planGuardia.horas.length} hora(s)
              </div>
            </div>
            <button onClick={() => { setVerPlan(planGuardia); setPlanGuardia(null); }}
              style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
              👁 Ver plan
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* Panel izquierdo — Wizard */}
        <div>
          {/* StepBar inline */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 0 }}>
            {[{ n:1, icon:"📅", label:"Fecha" }, { n:2, icon:"👤", label:"Ausente" }, { n:3, icon:"🏫", label:"Aula / Tarea" }, { n:4, icon:"🔄", label:"Guardia" }].map(({ n, icon, label }, i) => (
              <div key={n} style={{ display:"flex", alignItems:"center", flex:1 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, cursor: n < paso ? "pointer" : "default" }} onClick={() => n < paso && setPaso(n)}>
                  <div style={{ width:40, height:40, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background: n < paso ? C.teal : n === paso ? C.blue : "#CDE9ED", color: n <= paso ? "#fff" : C.gray, fontSize:18, fontWeight:700, boxShadow: n === paso ? `0 0 0 4px ${C.blue}22` : "none", transition:"all .3s" }}>{n < paso ? "✓" : icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: n === paso ? C.blue : n < paso ? C.teal : C.gray, marginTop:4, whiteSpace:"nowrap" }}>{label}</div>
                </div>
                {i < 3 && <div style={{ height:2, flex:1, background: n < paso ? C.teal : "#CDE9ED", transition:"background .3s", marginBottom:18 }} />}
              </div>
            ))}
          </div>

          {/* PASO 1 inline */}
          {paso === 1 && (
            <Card>
              <div style={{ fontWeight:700, color:C.dark, fontSize:16, marginBottom:16 }}><Ic n="fecha-hora" tam={20} />Fecha de la ausencia</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                <div>
                  <label style={labelStyle}>Fecha de inicio</label>
                  <input type="date" value={pgFecha} onChange={e => setPgFecha(e.target.value)} style={inpStyle} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
                  <label style={{ ...labelStyle, display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                    <input type="checkbox" checked={pgMultidia} onChange={e => setPgMultidia(e.target.checked)} style={{ width:16, height:16, accentColor:C.teal }} />
                    Ausencia de varios días
                  </label>
                </div>
              </div>
              {pgMultidia && (
                <div style={{ marginBottom:16 }}>
                  <label style={labelStyle}>Fecha de fin</label>
                  <input type="date" value={pgFechaFin} min={pgFecha} onChange={e => setPgFechaFin(e.target.value)} style={inpStyle} />
                </div>
              )}
              <div style={{ marginBottom:4 }}>
                <label style={labelStyle}><ConIcono texto="📝 Nota general (opcional)" tam={40} /></label>
                <textarea value={pgNota} onChange={e => setPgNota(e.target.value)} rows={2} placeholder="Observaciones generales sobre la ausencia…" style={{ ...inpStyle, resize:"vertical" }} />
              </div>
              <div style={{ background:"#DDF0F4", borderRadius:8, padding:"10px 14px", fontSize:14, color:C.blue, marginTop:12 }}>
                <Ic n="como-exportar" tam={20} />Si la ausencia abarca varios días, el plan se aplicará a todas las fechas del periodo seleccionado.
              </div>
            </Card>
          )}

          {/* PASO 2 inline */}
          {paso === 2 && (
            <Card>
              <div style={{ fontWeight:700, color:C.dark, fontSize:16, marginBottom:16 }}><Ic n="por-alumno" tam={20} />Profesor ausente y horas afectadas</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
                <div>
                  <label style={labelStyle}>Profesor ausente *</label>
                  <select value={pgProfesor} onChange={e => setPgProfesor(e.target.value)} style={selStyle}>
                    <option value="">— Seleccionar —</option>
                    {profesores.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Motivo de la ausencia</label>
                  <select value={pgMotivo} onChange={e => setPgMotivo(e.target.value)} style={selStyle}>
                    {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:8 }}>
                <label style={{ ...labelStyle, marginBottom:10 }}><Ic n="hora-reloj" tam={20} />Horas afectadas * <span style={{ color:C.gray, fontWeight:400, fontSize:14 }}>— Selecciona todas las que apliquen</span></label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8 }}>
                  {HORAS.map(h => {
                    const sel = pgHoras.includes(h);
                    return (
                      <button key={h} onClick={() => toggleHora(h)}
                        style={{ padding:"10px 8px", borderRadius:10, border:`2px solid ${sel ? C.blue : "#CDE9ED"}`, background: sel ? "#DDF0F4" : C.white, color: sel ? C.blue : C.gray, fontWeight: sel ? 700 : 500, fontSize:14, cursor:"pointer", transition:"all .15s", textAlign:"center" }}>
                        {sel ? "✓ " : ""}{h}
                      </button>
                    );
                  })}
                </div>
              </div>
              {pgHoras.length > 0 && (
                <div style={{ background:"#DDF0F4", borderRadius:8, padding:"8px 14px", fontSize:14, color:C.teal, fontWeight:600, marginTop:12 }}>
                  ✅ {pgHoras.length} hora(s) seleccionada(s): {pgHoras.join(", ")}
                </div>
              )}
            </Card>
          )}

          {/* PASO 3 inline */}
          {paso === 3 && (
            <div>
              <div style={{ fontWeight:700, color:C.dark, fontSize:16, marginBottom:14 }}><Ic n="por-curso" tam={20} />Aula, módulo y tarea por hora</div>
              {pgHoras.map(h => (
                <Card key={h} style={{ borderLeft:`4px solid ${C.blue}`, marginBottom:12 }}>
                  <div style={{ fontWeight:700, color:C.blue, fontSize:15, marginBottom:12 }}><Ic n="hora-reloj" tam={20} />{conTramo(h)}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <label style={labelStyle}>Grupo / Clase *</label>
                      <select value={pgCursoHora[h] || ""} onChange={e => setCursoHora(h, e.target.value)} style={selStyle}>
                        <option value="">— Seleccionar —</option>
                        {cursos.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Materia</label>
                      <input value={pgMateriaHora[h] || ""} onChange={e => setMateriaHora(h, e.target.value)} placeholder="Ej: Matemáticas" style={inpStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>🏢 Módulo del edificio</label>
                      <select value={pgModuloEdificio[h] || ""} onChange={e => setModuloHora(h, e.target.value)} style={selStyle}>
                        <option value="">— Módulo —</option>
                        {MODULOS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={labelStyle}><Ic n="partes" tam={20} />Tarea / Actividad para los alumnos</label>
                    <textarea value={pgTareaHora[h] || ""} onChange={e => setTareaHora(h, e.target.value)} rows={2} placeholder="Ej: Ejercicios pág. 45 del libro · Lectura silenciosa · Repaso tema 3…" style={{ ...inpStyle, resize:"vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>📎 Material / Recursos disponibles</label>
                    <input value={pgMaterialHora[h] || ""} onChange={e => setMaterialDetalleHora(h, e.target.value)} placeholder="Ej: Fotocopias en conserjería · Libro de texto · Presentación en Drive…" style={inpStyle} />
                  </div>
                  {pgCursoHora[h] && (
                    <div style={{ marginTop:10, background:C.cream, borderRadius:6, padding:"6px 12px", fontSize:14, color:C.gray }}>
                      📍 {pgCursoHora[h]}{pgModuloEdificio[h] ? ` · ${pgModuloEdificio[h]}` : ""}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* PASO 4 inline */}
          {paso === 4 && (
            <div>
              <div style={{ fontWeight:700, color:C.dark, fontSize:16, marginBottom:14 }}><Ic n="horario" tam={24} />Asignación de profesores de guardia</div>
              {pgHoras.map(h => (
                <Card key={h} style={{ borderLeft:`4px solid ${C.teal}`, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                    <div style={{ fontWeight:700, color:C.teal, fontSize:15 }}><Ic n="hora-reloj" tam={20} />{conTramo(h)}</div>
                    {pgCursoHora[h] && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span style={{ background:"#DDF0F4", color:C.blue, borderRadius:6, padding:"3px 10px", fontSize:14, fontWeight:600 }}><Ic n="por-curso" tam={20} />{pgCursoHora[h]}</span>
                        {pgMateriaHora[h] && <span style={{ background:C.cream, color:C.dark, borderRadius:6, padding:"3px 10px", fontSize:14 }}>{pgMateriaHora[h]}</span>}
                        {pgModuloEdificio[h] && <span style={{ background:"#DDF0F4", color:C.teal, borderRadius:6, padding:"3px 10px", fontSize:14 }}>🏢 {pgModuloEdificio[h]}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div>
                      <label style={labelStyle}><Ic n="por-alumno" tam={20} />Profesor de guardia *</label>
                      <select value={pgGuardiaHora[h] || ""} onChange={e => setGuardiaHora(h, e.target.value)} style={selStyle}>
                        <option value="">— Seleccionar —</option>
                        {profesores.filter(p => p !== pgProfesor).map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}><Ic n="edificio" tam={20} />Zona de guardia</label>
                      <select value={pgZonaHora[h] || ""} onChange={e => setZonaHora(h, e.target.value)} style={selStyle}>
                        <option value="">— Seleccionar zona —</option>
                        {ZONAS_GUARDIA.map(z => <option key={z}>{z}</option>)}
                      </select>
                    </div>
                  </div>
                  {pgGuardiaHora[h] && pgZonaHora[h] && (
                    <div style={{ marginTop:10, background:"#DDF0F4", borderRadius:6, padding:"6px 12px", fontSize:14, color:C.teal, fontWeight:600 }}>
                      ✅ {pgGuardiaHora[h]} — {pgZonaHora[h]}
                    </div>
                  )}
                  {pgTareaHora[h] && (
                    <div style={{ marginTop:8, background:"#FDF1D9", borderRadius:6, padding:"6px 12px", fontSize:14, color:"#16333F" }}>
                      <Ic n="partes" tam={20} />Tarea: {pgTareaHora[h]}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {paso > 1
              ? <button onClick={() => setPaso(p => p - 1)}
                  style={{ background: C.cream, color: C.dark, border: `1px solid #ddd`, borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  ← Anterior
                </button>
              : <div />}
            {paso < 4
              ? <Btn onClick={() => setPaso(p => p + 1)}
                  disabled={paso === 2 && (!pgProfesor || pgHoras.length === 0)}
                  color={C.blue}>
                  Siguiente →
                </Btn>
              : <Btn onClick={generarPlan}
                  disabled={!pgHoras.every(h => pgGuardiaHora[h])}
                  color={C.teal}>
                  ✅ Guardar Plan de Guardia
                </Btn>}
          </div>
        </div>

        {/* Panel derecho — Historial de planes */}
        <div>
          <div style={{ fontWeight: 700, color: C.dark, fontSize: 14, marginBottom: 10 }}>
            <Ic n="partes" tam={20} />Planes guardados ({planesGuardia.length})
          </div>
          {planesGuardia.length === 0
            ? <div style={{ background: C.white, borderRadius: 12, padding: 20, textAlign: "center", color: C.gray, fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                Aún no hay planes creados
              </div>
            : planesGuardia.map(p => (
              <div key={p.id} onClick={() => setVerPlan(p)}
                style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: `4px solid ${C.blue}`, transition: "box-shadow .15s" }}
                onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
                onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"}>
                <div style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}><Ic n="por-alumno" tam={20} />{p.profesorAusente}</div>
                <div style={{ fontSize: 14, color: C.gray, marginTop: 2 }}>
                  <Ic n="fecha-hora" tam={20} />{p.multidia ? `${fmtD(p.fecha)} → ${fmtD(p.fechaFin)}` : fmtD(p.fecha)}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ background: "#DDF0F4", color: C.blue, borderRadius: 6, padding: "2px 8px", fontSize: 13 }}>{p.horas.length} hora(s)</span>
                  <span style={{ background: C.cream, color: C.gray, borderRadius: 6, padding: "2px 8px", fontSize: 13 }}>{p.motivo}</span>
                  {p.horas.map(h => <span key={h.hora} style={{ background: "#DDF0F4", color: C.teal, borderRadius: 6, padding: "2px 8px", fontSize: 13 }}>{h.hora}</span>)}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
// ─── Zonas del centro ────────────────────────────────────────────────────────
// Zonas de guardia: Administración puede renombrarlas, cambiarlas de edificio, añadir y ocultar
// (ver «Zonas de guardia»). Cada zona conserva su id, que es con lo que se guardan guardias, firmas y medidas.
const ZONAS_POR_DEFECTO = [
  { id:"A0-pasillo",  label:"Edificio A · Planta 0 · Pasillo",    edificio:"A", tipo:"pasillo"  },
  { id:"A1-pasillo",  label:"Edificio A · Planta 1 · Pasillo",    edificio:"A", tipo:"pasillo"  },
  { id:"A2-pasillo",  label:"Edificio A · Planta 2 · Pasillo",    edificio:"A", tipo:"pasillo"  },
  { id:"A0-bano-n",   label:"Edificio A · Planta 0 · Baño Niñas", edificio:"A", tipo:"bano"     },
  { id:"A1-bano-c",   label:"Edificio A · Planta 1 · Baño Niños", edificio:"A", tipo:"bano"     },
  { id:"A0-biblio",   label:"Edificio A · Planta 0 · Biblioteca", edificio:"A", tipo:"especial" },
  { id:"A0-maquina",  label:"Edificio A · Planta 0 · Máquina",    edificio:"A", tipo:"especial" },
  { id:"B0-pasillo",  label:"Edificio B · Planta 0 · Pasillo",    edificio:"B", tipo:"pasillo"  },
  { id:"B1-pasillo",  label:"Edificio B · Planta 1 · Pasillo",    edificio:"B", tipo:"pasillo"  },
  { id:"B2-pasillo",  label:"Edificio B · Planta 2 · Pasillo",    edificio:"B", tipo:"pasillo"  },
  { id:"C0-pasillo",  label:"Edificio C · Planta 0 · Pasillo",    edificio:"C", tipo:"pasillo"  },
  { id:"C1-pasillo",  label:"Edificio C · Planta 1 · Pasillo",    edificio:"C", tipo:"pasillo"  },
  { id:"C2-pasillo",  label:"Edificio C · Planta 2 · Pasillo",    edificio:"C", tipo:"pasillo"  },
  { id:"aula",        label:"Aula — Sustitución de clase",         edificio:"-", tipo:"aula"     },
  { id:"aula-conv",   label:"Aula de convivencia",                edificio:"-", tipo:"convivencia" },
  { id:"rec-puerta",  label:"Recreo · Zona Puerta",               edificio:"-", tipo:"recreo"   },
  { id:"rec-central", label:"Recreo · Patio Central",             edificio:"-", tipo:"recreo"   },
  { id:"rec-coches",  label:"Recreo · Zona Coches",               edificio:"-", tipo:"recreo"   },
  { id:"rec-pistas",  label:"Recreo · Pistas de Fútbol",          edificio:"-", tipo:"recreo"   },
  { id:"rec-bano-n",  label:"Recreo · Baño Niñas",                edificio:"-", tipo:"recreo"   },
  { id:"rec-bano-c",  label:"Recreo · Baño Niños",                edificio:"-", tipo:"recreo"   },
  { id:"rec-biblio",  label:"Recreo · Biblioteca",                edificio:"-", tipo:"recreo"   },
  { id:"rec-maquina", label:"Recreo · Máquina de Bebidas",        edificio:"-", tipo:"recreo"   },
];
// Zonas que la app necesita: se pueden renombrar, pero no ocultar ni cambiar de edificio
const ZONAS_FIJAS = ["aula", "aula-conv"];
const ZONAS_CENTRO = ZONAS_POR_DEFECTO.map(z => ({ ...z }));
// Edificios con zonas (para agrupar y para las ausencias); se rehace al cambiar las zonas
const EDIFICIOS = [];
function fijarZonas(config) {
  const lista = Array.isArray(config) && config.length ? config : ZONAS_POR_DEFECTO;
  const ids = new Set(lista.map(z => z.id));
  // Las zonas fijas siempre existen, aunque falten en la configuración guardada
  const completas = [...lista, ...ZONAS_POR_DEFECTO.filter(z => ZONAS_FIJAS.includes(z.id) && !ids.has(z.id))];
  ZONAS_CENTRO.splice(0, ZONAS_CENTRO.length, ...completas.map(z => ({ ...z,
    label: z.label?.trim() || ZONAS_POR_DEFECTO.find(d => d.id === z.id)?.label || "Zona sin nombre",
    oculta: ZONAS_FIJAS.includes(z.id) ? false : !!z.oculta })));
  EDIFICIOS.splice(0, EDIFICIOS.length, ...[...new Set(ZONAS_CENTRO.filter(z => !z.oculta).map(z => z.edificio).filter(e => e && e !== "-"))].sort());
}
fijarZonas();
const HORAS_GUARDIA = HORAS;
const DIAS_SEMANA   = ["Lunes","Martes","Miércoles","Jueves","Viernes"];
const DIAS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

// ─── Fechas del cuadrante ────────────────────────────────────────────────────
// El cuadrante cambia cada quincena, así que se guarda por fecha concreta:
// clave "AAAA-MM-DD|hora|profesor" (y "AAAA-MM-DD|hora|zona" para los apoyos).
const pad2 = n => String(n).padStart(2, "0");
function parseISO(s) {
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const [y, m, d] = String(s).split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}
// Fecha local AAAA-MM-DD (sin el desfase de toISOString, que usa hora UTC)
const isoLocal = (d = new Date()) => { const x = parseISO(d); return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`; };
const sumarDias = (d, n) => { const x = parseISO(d); x.setDate(x.getDate() + n); return x; };
const lunesDe = (d = new Date()) => { const x = parseISO(d); const dow = x.getDay(); return sumarDias(x, dow === 0 ? 1 : 1 - dow); };
const esLectivo = d => { const w = parseISO(d).getDay(); return w !== 0 && w !== 6; };

// ─── Equipo de guardia de cada zona ─────────────────────────────────────────
// Cada zona tiene: titular (en el cuadrante), apoyo y sustituto. El sustituto entra
// si falta el titular o el apoyo. Apoyos y sustitutos: clave "fecha|hora|zona".
// Ningún profesor puede tener más de este número de guardias en un día (sumando titular, apoyo y sustituto)
const MAX_GUARDIAS_DIA = 4;
function guardiasDelDia(fecha, profesor, cuadrante, apoyos = {}, sustitutos = {}) {
  let n = Object.keys(cuadrante).filter(k => k.startsWith(`${fecha}|`) && k.endsWith(`|${profesor}`)).length;
  [apoyos, sustitutos].forEach(m => Object.entries(m).forEach(([k, v]) => { if (v === profesor && k.startsWith(`${fecha}|`)) n++; }));
  return n;
}

const ESTADOS_ZONA = {
  completa:    { label: "🟢 Completa",           color: "#275D8C", bg: "#DDF0F4" },
  sustituto:   { label: "🟠 Entra el sustituto", color: "#16333F", bg: "#FDF1D9" },
  una:         { label: "🟡 Solo 1 profesor",    color: "#a16207", bg: "#fefce8" },
  descubierta: { label: "🔴 Descubierta",        color: "#275D8C", bg: "#FDF1D9" },
};
function situacionZona({ fecha, hora, zonaId, profesores, cuadrante, apoyos = {}, sustitutos = {}, ausencias = [], coberturas = {} }) {
  const k = `${fecha}|${hora}|${zonaId}`;
  const titular = profesores.find(p => cuadrante[`${fecha}|${hora}|${p}`] === zonaId) || "";
  const apoyo = apoyos[k] || "", sustituto = sustitutos[k] || "";
  const falta = p => !!p && ausencias.some(a => isoLocal(a.fecha) === fecha && a.profesor === p && a.horas.includes(hora));
  const tA = falta(titular), aA = falta(apoyo), sA = falta(sustituto);
  const enZona = [];
  if (titular && !tA) enZona.push(titular);
  if (apoyo && !aA) enZona.push(apoyo);
  // Huecos que puede cubrir el sustituto: primero el titular, luego el apoyo
  let hueco = (!titular || tA) ? "titular" : (!apoyo || aA) ? "apoyo" : null;
  let sustituyeA = null;
  if (hueco && sustituto && !sA) {
    enZona.push(sustituto);
    sustituyeA = hueco === "titular" ? (titular || "titular sin asignar") : (apoyo || "apoyo sin asignar");
  }
  // Quien ha salido de la zona para cubrir una clase deja de contar en ella
  // (salvo en la zona de aula, cuyo trabajo es precisamente cubrir clases)
  const enClase = {};
  if (ZONAS_CENTRO.find(z => z.id === zonaId)?.tipo !== "aula") {
    Object.entries(coberturas).forEach(([k, p]) => {
      const [f, h, ausId] = k.split("|");
      if (f === fecha && h === hora && (enZona.includes(p) || p === sustituto)) {
        const a = ausencias.find(x => String(x.id) === ausId);
        enClase[p] = a ? `${a.aula || "clase"} de ${a.profesor}` : "una clase";
      }
    });
  }
  const sale = enZona.filter(p => enClase[p]).length;
  const quedan = enZona.filter(p => !enClase[p]);
  // Si el titular o la pareja sale a cubrir una clase, entra el sustituto (si está libre)
  if (!sustituyeA && sustituto && !sA && !enClase[sustituto] && !quedan.includes(sustituto)) {
    const salio = [titular, apoyo].find(p => p && enClase[p]);
    if (salio) { quedan.push(sustituto); sustituyeA = salio; hueco = salio === titular ? "titular" : "apoyo"; }
  }
  const estado = quedan.length === 0 ? "descubierta"
    : sale === 0 && titular && apoyo && !tA && !aA ? "completa"
    : quedan.length >= 2 ? "sustituto" : "una";
  return { titular, apoyo, sustituto, tA, aA, sA, hueco, sustituyeA, enZona: quedan, enClase, estado };
}
// Todas las guardias de un profesor en una fecha: como titular, apoyo o sustituto
function guardiasDeProfesor({ fecha, profesor, profesores, cuadrante, apoyos = {}, sustitutos = {}, ausencias = [] }) {
  const lista = [];
  HORAS_GUARDIA.forEach(hora => {
    const zonas = [];
    const zt = cuadrante[`${fecha}|${hora}|${profesor}`];
    if (zt) zonas.push([zt, "titular"]);
    [[apoyos, "apoyo"], [sustitutos, "sustituto"]].forEach(([mapa, rol]) =>
      Object.entries(mapa).forEach(([k, v]) => {
        const [f, h, z] = k.split("|");
        if (v === profesor && f === fecha && h === hora) zonas.push([z, rol]);
      }));
    zonas.forEach(([zonaId, rol]) => {
      const z = ZONAS_CENTRO.find(z => z.id === zonaId);
      lista.push({ hora, zonaId, zona: z ? z.label : zonaId, edificio: z?.edificio, rol,
        sit: situacionZona({ fecha, hora, zonaId, profesores, cuadrante, apoyos, sustitutos, ausencias }) });
    });
  });
  return lista;
}

// Clases sin profesor que afectan a una guardia: a esa hora, en el edificio de la zona,
// o del profesor al que sustituye el sustituto. En el recreo no hay clase.
function tareasDeGuardia(g, fecha, ausencias) {
  if (g.hora === "Recreo") return [];
  return ausencias.filter(a => isoLocal(a.fecha) === fecha && a.horas.includes(g.hora) &&
    (a.profesor === g.sit?.sustituyeA || !a.edificio || !g.edificio || g.edificio === "-" || a.edificio === g.edificio));
}
// Tarjeta con lo que ha dejado el profesor ausente
const TareaAusente = ({ a, C }) => (
  <div style={{ background: "#FDF1D9", border: "1px solid #F6C862", borderRadius: 8, padding: 10, fontSize: 14, color: "#78350F", lineHeight: 1.5 }}>
    <div style={{ fontWeight: 700, marginBottom: 4 }}><Ic n="profe-ausente" tam={22} />Deja {a.profesor}{a.asignatura ? ` · ${a.asignatura}` : ""}</div>
    {(a.aula || a.edificio) && <div><Ic n="aula" tam={20} />Aula {a.aula || "?"}{a.edificio ? ` · Edificio ${a.edificio}` : ""}</div>}
    <div><Ic n="ejercicios" tam={20} />{a.tarea ? a.tarea : <em>No ha dejado tarea</em>}</div>
    {a.ubicacion && <div><Ic n="material" tam={20} />Material: {a.ubicacion}</div>}
    {a.enlace && <div><a href={a.enlace} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontWeight: 600 }}>🔗 Ver recursos</a></div>}
  </div>
);


// ─── Cubrir clases sin profesor: candidatos por prioridad ───────────────────
// coberturas: { "fecha|hora|idAusencia": profesor } — quién cubre cada clase en cada hora
const claveCob = (fecha, hora, ausId) => `${fecha}|${hora}|${ausId}`;
const PRIORIDADES_COB = {
  1: { txt: "De guardia en aula", color: "#275D8C", bg: "#DDF0F4" },
  2: { txt: "Sustituto en reserva", color: "#1d4ed8", bg: "#DDF0F4" },
  // (dentro de cada grupo va primero quien está en el mismo edificio que la clase)
  3: { txt: "Zona con dos, mismo edificio", color: "#16333F", bg: "#FDF1D9" },
  4: { txt: "Zona con dos, otro edificio", color: "#6b7280", bg: "#EBF0F6" },
};
// Clases cubiertas por un profesor en un día
const clasesCubiertasDia = (fecha, profesor, coberturas) =>
  Object.entries(coberturas).filter(([k, p]) => p === profesor && k.startsWith(`${fecha}|`)).length;
// Clase que cubre un profesor a una hora (la ausencia) o null
function claseQueCubre(fecha, hora, profesor, coberturas, ausencias) {
  const k = Object.keys(coberturas).find(k => coberturas[k] === profesor && k.startsWith(`${fecha}|${hora}|`));
  return k ? ausencias.find(a => String(a.id) === k.split("|")[2]) || null : null;
}
// Lista ordenada de quién puede cubrir la clase de una ausencia a una hora.
// Solo profesorado de guardia a esa hora; nunca deja una zona vacía.
function candidatosClase({ fecha, hora, ausencia, profesores, cuadrante, apoyos = {}, sustitutos = {}, ausencias = [], coberturas = {} }) {
  const clave = claveCob(fecha, hora, ausencia.id);
  const otras = Object.fromEntries(Object.entries(coberturas).filter(([k]) => k !== clave));
  const ocupados = new Set(Object.entries(otras).filter(([k]) => k.startsWith(`${fecha}|${hora}|`)).map(([, p]) => p));
  const falta = p => ausencias.some(a => isoLocal(a.fecha) === fecha && a.profesor === p && a.horas.includes(hora));
  const pref = `${fecha}|${hora}|`;
  const zonasHora = new Set([
    ...profesores.map(p => cuadrante[`${pref}${p}`]).filter(Boolean),
    ...[apoyos, sustitutos].flatMap(m => Object.keys(m).filter(k => k.startsWith(pref) && m[k]).map(k => k.split("|")[2])),
  ]);
  const mejor = {};
  const proponer = (p, prioridad, zona, cerca) => {
    if (!p || p === ausencia.profesor || falta(p) || ocupados.has(p)) return;
    const peso = prioridad * 2 + (cerca ? 0 : 1);
    if (!mejor[p] || peso < mejor[p].peso) mejor[p] = { profesor: p, prioridad, zona, cerca, peso };
  };
  zonasHora.forEach(zonaId => {
    const z = ZONAS_CENTRO.find(z => z.id === zonaId);
    const sit = situacionZona({ fecha, hora, zonaId, profesores, cuadrante, apoyos, sustitutos, ausencias, coberturas: otras });
    const nombreZona = z?.label || zonaId;
    // Mismo edificio que la clase (o sin edificio conocido)
    const cerca = !ausencia.edificio || !z?.edificio || z.edificio === "-" || z.edificio === ausencia.edificio;
    if (z?.tipo === "aula") { sit.enZona.forEach(p => proponer(p, 1, nombreZona, true)); return; }
    // El sustituto que no hace falta en su zona está libre
    if (sit.sustituto && !sit.sA && !sit.sustituyeA && !sit.enClase[sit.sustituto]) proponer(sit.sustituto, 2, nombreZona, cerca);
    // Si en la zona hay dos o más, puede salir uno (la zona nunca se queda vacía)
    if (sit.enZona.length >= 2) sit.enZona.forEach(p => proponer(p, cerca ? 3 : 4, nombreZona, cerca));
  });
  return Object.values(mejor).map(c => ({
    ...c,
    cubiertas: clasesCubiertasDia(fecha, c.profesor, otras),
    guardias: guardiasDelDia(fecha, c.profesor, cuadrante, apoyos, sustitutos),
  })).sort((a, b) => a.peso - b.peso || a.cubiertas - b.cubiertas || a.guardias - b.guardias || a.profesor.localeCompare(b.profesor));
}

// Quién cubre una clase a una hora: sugerencias y botón de asignar (solo jefatura)
function CubrirClase({ fecha, hora, ausencia, equipo, coberturas = {}, setCoberturas, puedeAsignar = false, C }) {
  const [verTodos, setVerTodos] = useState(false);
  const clave = claveCob(fecha, hora, ausencia.id);
  const asignado = coberturas[clave];
  const candidatos = candidatosClase({ fecha, hora, ausencia, ...equipo, coberturas });
  const asignar = p => setCoberturas?.(prev => ({ ...prev, [clave]: p }));
  const quitar = () => setCoberturas?.(prev => { const n = { ...prev }; delete n[clave]; return n; });
  const btn = { border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const lista = verTodos ? candidatos : candidatos.slice(0, 3);
  return (
    <div style={{ background: asignado ? "#DDF0F4" : "#fff", border: `1px solid ${asignado ? C.teal : "#F6C862"}`, borderRadius: 8, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
          <Ic n="hora-reloj" tam={20} />{conTramo(hora)}
          {asignado
            ? <span style={{ color: C.teal }}> · ✅ Cubre {asignado}</span>
            : <span style={{ color: "#16333F" }}> · Sin cubrir</span>}
        </div>
        {asignado && puedeAsignar && <button onClick={quitar} style={{ ...btn, background: C.light, color: C.dark }}>Cambiar</button>}
      </div>
      {!asignado && (
        candidatos.length === 0 ? (
          <div style={{ fontSize: 14, color: C.salmon, fontWeight: 600, marginTop: 6 }}>No hay nadie de guardia libre a esta hora sin dejar una zona vacía.</div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {!puedeAsignar && <div style={{ fontSize: 13, color: C.gray }}>Jefatura confirmará quién la cubre. Sugerencias:</div>}
            {lista.map((c, i) => {
              const pr = PRIORIDADES_COB[c.prioridad];
              return (
                <div key={c.profesor} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, background: i === 0 ? "#DDF0F4" : C.light, borderRadius: 8, padding: "6px 10px" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{i === 0 ? "⭐ " : ""}{c.profesor}</div>
                    <div style={{ fontSize: 13, color: C.gray }}>
                      <span style={{ color: pr.color, background: pr.bg, borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>{pr.txt}</span>
                      {" "}{c.zona} · {c.cubiertas} clase(s) cubiertas hoy · {c.guardias} guardia(s)
                    </div>
                  </div>
                  {puedeAsignar && <button onClick={() => asignar(c.profesor)} style={{ ...btn, background: i === 0 ? C.teal : C.dark, color: "#fff" }}>Asignar</button>}
                </div>
              );
            })}
            {candidatos.length > 3 && (
              <button onClick={() => setVerTodos(v => !v)} style={{ ...btn, background: "transparent", color: C.blue, padding: 0, textAlign: "left" }}>
                {verTodos ? "Ver menos" : `Ver los ${candidatos.length} candidatos`}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ─── Firmar guardia y pasar lista ────────────────────────────────────────────
// Firma: {id, fecha, hora, zonaId, zona, profesor, rol, ts}
// Lista: {id, fecha, hora, curso, profesor, ausentes:[{id, nombre}], ts}
const minutosDe = t => { const [h, m] = t.trim().split(":").map(Number); return h * 60 + m; };
const inicioHora = hora => (HORARIO[hora] || "0:00 – 0:00").split("–")[0].trim();
// ¿Ha empezado ya esa hora en esa fecha? (una fecha pasada, siempre; una futura, nunca)
function horaEmpezada(fecha, hora, ahora = new Date()) {
  const hoy = isoLocal(ahora);
  if (fecha < hoy) return true;
  if (fecha > hoy) return false;
  return ahora.getHours() * 60 + ahora.getMinutes() >= minutosDe(inicioHora(hora));
}
const horaCorta = iso => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

function PasarLista({ curso, alumnos, existente, onGuardar, onCerrar, C }) {
  const grupo = alumnos.filter(a => a.curso === curso).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const [faltan, setFaltan] = useState(() => new Set((existente?.ausentes || []).map(a => a.id)));
  const toggle = id => setFaltan(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div role="dialog" aria-modal="true" aria-label={`Pasar lista de ${curso}`} onClick={onCerrar}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: "min(460px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ background: R.azul, color: "#fff", padding: "14px 18px", borderRadius: "16px 16px 0 0", position: "sticky", top: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}><Ic n="partes" tam={20} />Pasar lista · {curso}</div>
          <div style={{ fontSize: 14, opacity: .85 }}>Marca solo a quien falta. {grupo.length} alumnos.</div>
        </div>
        <div style={{ padding: 12 }}>
          {grupo.length === 0 && <div style={{ padding: 20, color: C.gray, textAlign: "center" }}>No hay alumnos cargados en {curso}.</div>}
          {grupo.map(a => {
            const falta = faltan.has(a.id);
            return (
              <button key={a.id} onClick={() => toggle(a.id)} aria-pressed={falta}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 14px", marginBottom: 6, borderRadius: 10, cursor: "pointer", fontSize: 14, textAlign: "left",
                  border: `2px solid ${falta ? C.salmon : "#CDE9ED"}`, background: falta ? "#FDF1D9" : "#fff", color: C.dark }}>
                <span>{a.nombre}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: falta ? "#275D8C" : C.teal }}>{falta ? "✗ Falta" : "✓ Presente"}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 12px 14px" }}>
          <button onClick={onCerrar} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #CDE9ED", background: "#f9fafb", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
          <button onClick={() => onGuardar(grupo.filter(a => faltan.has(a.id)).map(a => ({ id: a.id, nombre: a.nombre })))}
            style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: C.teal, color: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Guardar lista ({faltan.size} {faltan.size === 1 ? "falta" : "faltas"})
          </button>
        </div>
        <div style={{ padding: "0 14px 14px", fontSize: 13, color: C.gray }}>Las faltas oficiales se siguen registrando en Raíces.</div>
      </div>
    </div>
  );
}

// ─── Firmas y listas (Jefatura) ─────────────────────────────────────────────
function FirmasYListas({ profesores, cuadrante, apoyosGuardia, sustitutosGuardia, ausencias, firmas, listas, C, inpStyle }) {
  const [fecha, setFecha] = useState(isoLocal());
  const equipo = { profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias };
  // Quién tenía que estar en cada zona y quién ha firmado
  const filas = filasFirmasDia(fecha, equipo, firmas);
  const debidas = filas.filter(f => f.empezada).flatMap(f => f.personas);
  const firmadas = debidas.filter(x => x.firma).length;
  const listasDia = listas.filter(l => l.fecha === fecha).sort((a, b) => HORAS.indexOf(a.hora) - HORAS.indexOf(b.hora));
  const pend = debidas.length - firmadas;
  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Firmas de guardia y listas" icono="tareas" /></div>
      <div className="no-print" style={{ background: C.white, borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: C.dark, marginBottom: 6 }}>Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value || isoLocal())} style={inpStyle} />
        </div>
        <button onClick={() => pdfFirmasYListas(fecha, filas, listasDia)} style={{ background: C.dark, color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", cursor: "pointer", fontWeight: 700 }}>⬇️ Descargar PDF</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Firmas esperadas hasta ahora", value: debidas.length, color: C.dark },
          { label: "Guardias firmadas", value: firmadas, color: C.teal },
          { label: "Sin firmar", value: pend, color: pend ? "#16333F" : C.teal },
          { label: "Listas pasadas", value: listasDia.length, color: C.blue },
        ].map(s => (
          <div key={s.label} style={{ background: C.white, borderRadius: 10, padding: 14, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.white, borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ background: C.dark, color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: 14 }}><Ic n="firmar" tam={20} />Firmas de guardia · {parseISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
        {filas.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: C.gray }}>No hay guardias en el cuadrante para esta fecha.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
              <thead><tr style={{ background: C.light }}>
                {["Hora", "Zona", "Profesores en la zona y firma"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 14, color: C.gray }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.cream}` }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>{f.hora}<div style={{ fontSize: 13, color: C.gray, fontWeight: 500 }}>{HORARIO[f.hora]}</div></td>
                    <td style={{ padding: "8px 14px" }}>{f.zona}</td>
                    <td style={{ padding: "8px 14px" }}>
                      {f.personas.length === 0 && <span style={{ color: "#275D8C", fontWeight: 600 }}>Nadie en la zona</span>}
                      {f.personas.map(({ p, firma }) => (
                        <div key={p} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span>{p}</span>
                          {firma ? <span style={{ color: C.teal, fontWeight: 700, fontSize: 14 }}>✓ firmada a las {horaCorta(firma.ts)}</span>
                            : f.empezada ? <span style={{ color: "#16333F", fontWeight: 700, fontSize: 14 }}>Sin firmar</span>
                            : <span style={{ color: C.gray, fontSize: 14 }}>Aún no ha empezado</span>}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ background: C.white, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ background: C.blue, color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: 14 }}><Ic n="partes" tam={20} />Listas pasadas en guardia</div>
        {listasDia.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: C.gray }}>No se ha pasado ninguna lista este día.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ background: C.light }}>
              {["Hora", "Grupo", "Profesor", "Faltas"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 14, color: C.gray }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {listasDia.map(l => (
                <tr key={l.id} style={{ borderTop: `1px solid ${C.cream}` }}>
                  <td style={{ padding: "8px 14px", fontWeight: 600 }}>{l.hora}</td>
                  <td style={{ padding: "8px 14px" }}>{l.curso}</td>
                  <td style={{ padding: "8px 14px" }}>{l.profesor}<div style={{ fontSize: 13, color: C.gray }}>a las {horaCorta(l.ts)}</div></td>
                  <td style={{ padding: "8px 14px" }}>{l.ausentes.length === 0 ? <span style={{ color: C.teal }}>Sin faltas</span> : l.ausentes.map(a => a.nombre).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: "8px 14px", fontSize: 13, color: C.gray }}>Las faltas oficiales se registran en Raíces.</div>
      </div>
    </div>
  );
}

// ─── Ayuda de cada pantalla ──────────────────────────────────────────────────
// Se abre sola la primera vez que se entra en una pantalla (en ese dispositivo)
// y después queda recogida en el botón «Cómo se usa».
const AYUDAS = {
  mis_estadisticas: { titulo: "Mis estadísticas e informes", pasos: [
    "Arriba verás los avisos: alumnado con 3 o más partes este trimestre (los tuyos y, si eres tutor/a, los de tu grupo). Pulsa «Avisar a la familia» y después «Ya he avisado».",
    "Arriba eliges cómo mirar: «Como tutor/a» (todos los partes de tu grupo; solo si tienes tutoría) o «Como profesor/a: mis partes» (los que has puesto tú y el alumnado que sale al baño en tus clases).",
    "Elige el periodo: un día, una semana, una quincena, un mes o dos fechas concretas.",
    "Pulsa una columna o una barra para ver esos partes en grande y qué es lo que más se repite.",
    "En «Partes de un alumno/a», elige al alumno y usa «Contactar con la familia»: informe en PDF, texto del correo ya redactado y sus correos.",
    "Escribe a la familia desde tu correo del centro, pega el texto y adjunta el PDF."] },
  estadisticas: { titulo: "Estadísticas y documentos", pasos: [
    "Elige el periodo: un día, una semana, una quincena, un mes o dos fechas concretas.",
    "Con ◀ y ▶ pasas al periodo anterior o siguiente; «Hoy» vuelve al actual.",
    "Verás las cifras de partes, baños, ausencias del profesorado, firmas de guardia y listas, y gráficas por día, grupo, hora y alumnado.",
    "Abajo tienes los informes: al pulsar se abren en pantalla y desde ahí los descargas o imprimes. «Ver y descargar en Excel» muestra una hoja por tema, con nombres, grupos y faltas.",
    "También puedes sacar los partes de un alumno o de un grupo, o las ausencias de un profesor, solo en esas fechas."] },
  partes: { titulo: "Poner un parte", pasos: [
    "Escribe el nombre o el curso del alumno y elígelo de la lista. Verás su curso, su tutor/a y los partes que le has puesto tú; si eres su tutor/a, también el contacto de la familia y todos sus partes.",
    "Elige la hora, el tipo y la gravedad, y después la falta tipificada de la lista oficial.",
    "Describe lo ocurrido con hechos concretos.",
    "Pulsa «Generar Parte». El parte lleva el tutor/a del grupo y su correo.",
    "Para avisar a la familia y a Jefatura, escribe un correo desde tu cuenta del centro y adjunta el PDF («Descargar PDF») o pega el texto («Copiar texto»). «Copiar correos» te da las direcciones de la familia y del tutor/a."] },
  parte_grupo: { titulo: "Parte de grupo", pasos: [
    "Elige el grupo.",
    "Quita a los alumnos que no estuvieron implicados.",
    "Elige la gravedad y la falta, y escribe una sola descripción.",
    "Pulsa «Generar Parte»: se crea un parte para cada alumno."] },
  bano: { titulo: "Salidas al baño", pasos: [
    "Busca al alumno y pulsa «Registrar Salida».",
    "Cuando vuelva, pulsa «Regresó» en la lista «Fuera ahora».",
    "Si un alumno sale demasiadas veces, Jefatura recibe un aviso automático."] },
  historial: { titulo: "Mis partes", pasos: [
    "Aquí están los partes que has puesto.",
    "Pulsa «Ver» para consultarlo o «PDF» para descargarlo."] },
  mi_guardia: { titulo: "Mi guardia de hoy", pasos: [
    "Cada tarjeta es una guardia de hoy: la hora, la zona y tu papel (titular, apoyo o sustituto).",
    "Si te toca entrar por alguien, aparece en rojo, con la tarea que ha dejado y dónde está el material.",
    "Cuando empiece la guardia, pulsa «Firmar guardia».",
    "Si cubres una clase, pulsa «Pasar lista» y marca solo a quien falta.",
    "Pulsa un día del calendario para ver tus guardias de ese día."] },
  notif_ausencia: { titulo: "Avisar de una ausencia", pasos: [
    "Elige la fecha y marca las horas en que vas a faltar.",
    "Indica el edificio, el aula y la asignatura, para que sepan qué clase cubrir.",
    "Deja la tarea para los alumnos y dónde está el material.",
    "Pulsa «Notificar». Esto completa, no sustituye, el correo de EducaMadrid y la llamada al instituto."] },
  guardias_ver: { titulo: "Guardias del día", pasos: [
    "Todas las zonas de guardia de hoy, hora a hora, con quién está en cada una.",
    "En naranja, las zonas en las que entra el sustituto; en rojo, las que se han quedado sin nadie."] },
  mensajeria: { titulo: "Galvángram", pasos: [
    "Toca un mensaje rápido o escribe el tuyo; el texto se puede retocar.",
    "En «¿Dónde estás?», deja que se rellene según tu horario o escribe a mano el aula, el edificio y el grupo. En los avisos urgentes es obligatorio.",
    "En «¿A quién avisar?» aparecen los profes de guardia de esa hora por zonas, primero los de tu edificio. Toca un nombre o «Avisar a la zona»; también puedes añadir a cualquier otro profesor/a.",
    "Pulsa «Enviar Mensaje». Le saldrá un aviso en cualquier pantalla de la app; si es urgente, a pantalla completa, con sonido y los botones «Voy» o «No puedo».",
    "Tú verás si lo ha leído (✓✓) y su respuesta. Todavía no llega como notificación al móvil con la app cerrada."] },
  dashboard: { titulo: "Resumen del día", pasos: [
    "De un vistazo: partes por gravedad, alumnos fuera del aula, profesores ausentes y alertas.",
    "Debajo, el resumen por curso y los alumnos con más incidencias.",
    "Usa las pestañas de arriba para ver el detalle."] },
  por_curso: { titulo: "Partes por curso", pasos: ["Cada curso muestra sus partes y a sus alumnos, con quién acumula partes."] },
  por_alumno: { titulo: "Partes por alumno", pasos: ["Elige un curso y un alumno para ver su historial completo, con la gravedad y la tipificación de cada parte."] },
  partes_todos: { titulo: "Todos los partes", pasos: [
    "Filtra por curso, alumno, gravedad o fechas.",
    "Pulsa «Ver» para consultar un parte o «PDF» para guardarlo."] },
  bano_live: { titulo: "Baños en tiempo real", pasos: ["Arriba, los alumnos que están fuera del aula ahora mismo; debajo, el historial del día."] },
  medidas: { titulo: "Medidas correctoras", pasos: [
    "«Por programar»: las medidas que ha puesto el profesorado. Pulsa «Poner día y aula» y elige los días, la hora y el aula o lugar.",
    "«Hoy»: la lista del día, que puedes descargar en PDF. Marca «Ha venido» o «No se ha presentado».",
    "Si no se presenta, sale una alerta y la medida pasa a «Sin cumplir»: pásala a otro día o pon el parte por no cumplirla (9L).",
    "Las medidas de faltas graves y muy graves las pones tú desde cada parte, con «Poner medida correctora»."] },
  alertas: { titulo: "Alertas", pasos: [
    "Avisos automáticos: tercer parte leve, tercer parte de un alumno, parte fuera de horario, salidas al baño repetidas y medidas sin cumplir.",
    "Pulsa una alerta para marcarla como leída."] },
  informe: { titulo: "Informes", pasos: [
    "Elige si quieres un informe de partes o de salidas al baño.",
    "Filtra por curso, alumno, gravedad o fechas.",
    "Si eliges un curso, verás su tutor/a: puedes cambiarlo o añadir su correo y queda guardado para el grupo.",
    "Pulsa el botón del informe y después «Descargar PDF». El informe lleva un resumen por grupo con su tutor/a.",
    "Cada informe descargado queda en «Informes guardados», abajo, para volver a sacarlo igual."] },
  cuadrante: { titulo: "Preparar el cuadrante", pasos: [
    "Elige el profesor y el inicio de la quincena.",
    "En cada día y hora, elige la zona de la que es titular.",
    "Asigna el apoyo y el sustituto: lo que falta sale en rojo.",
    "Nadie puede tener más de 4 guardias al día; entre paréntesis, las que ya tiene cada uno.",
    "«Copiar de la quincena anterior» evita empezar de cero. Los cambios se guardan solos."] },
  coordinacion: { titulo: "Coordinación diaria", pasos: [
    "Elige una fecha.",
    "Verás las guardias por edificio y, para cada profesor ausente, quién cubre su clase y qué tarea ha dejado."] },
  parte_dia: { titulo: "Parte del día", pasos: [
    "Todas las zonas de hoy, hora a hora, con titular, apoyo, sustituto y estado.",
    "Actúa en las que aparezcan como «Descubierta» o «Solo 1 profesor»."] },
  ausencias_jef: { titulo: "Ausencias de profesores", pasos: [
    "Aquí llegan las ausencias que notifica el profesorado. Pulsa una para marcarla como leída.",
    "Si alguien llama por teléfono, pulsa «Registrar una ausencia comunicada por teléfono» y rellénala por él."] },
  firmas_jef: { titulo: "Firmas y listas", pasos: [
    "Elige una fecha.",
    "Verás quién ha firmado cada guardia y a qué hora; las que faltan salen en naranja.",
    "Debajo, las listas pasadas en guardia con las faltas. Pulsa «Descargar PDF» para el archivo."] },
  admin_panel: { titulo: "Alumnado", pasos: [
    "Exporta el listado de Raíces a CSV o Excel y arrástralo en «Importar CSV/Excel».",
    "También puedes añadir alumnos uno a uno en «Añadir manual» y revisarlos en «Lista completa».",
    "Arriba, en «Tutorías de grupo», elige el tutor/a de cada grupo (y su correo del centro si quieres). Sale en los partes y en los informes."] },
  admin_profesores: { titulo: "Profesorado", pasos: [
    "Añade a cada profesor con su nombre completo.",
    "Asígnale su cargo: decide a qué perfiles puede entrar.",
    "Si alguien olvida su clave, pulsa «Restablecer clave» y la creará de nuevo al entrar."] },
};
function AyudaPantalla({ id, C }) {
  const clave = PREFIJO + "ayuda:" + id;
  const [abierta, setAbierta] = useState(() => { try { return !localStorage.getItem(clave); } catch { return true; } });
  const ayuda = AYUDAS[id];
  if (!ayuda) return null;
  const cerrar = () => { setAbierta(false); try { localStorage.setItem(clave, "1"); } catch { /* sin almacenamiento */ } };
  if (!abierta) return (
    <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
      <button onClick={() => setAbierta(true)} style={{ background: "none", border: "none", color: R.azul, minHeight: 44, padding: "0 6px", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="como-se-usa" tam={24} />Cómo se usa <span aria-hidden="true" style={{ width: 0, height: 0, borderLeft: `10px solid ${R.mostaza}`, borderTop: "7px solid transparent", borderBottom: "7px solid transparent" }} /></button>
    </div>
  );
  return (
    <div className="no-print" role="note" style={{ background: R.azulClaro, borderLeft: `8px solid ${R.turquesa}`, padding: "12px 16px", marginBottom: 16, color: R.petroleo }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, color: R.petroleo, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="como-se-usa" tam={28} />Cómo se usa: {ayuda.titulo}</div>
        <button onClick={cerrar} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 16px", cursor: "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>Entendido</button>
      </div>
      {ayuda.pasos.length === 1
        ? <p style={{ margin: "8px 0 0", fontSize: 16, color: R.petroleo, lineHeight: 1.5 }}>{ayuda.pasos[0]}</p>
        : <ol style={{ margin: "8px 0 0", paddingLeft: 22, fontSize: 16, color: R.petroleo, lineHeight: 1.5 }}>{ayuda.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>}
    </div>
  );
}

// ─── Datos de ejemplo (solo modo demostración) ───────────────────────────────
// Rellena el cuadrante de la quincena actual y unas ausencias de hoy y mañana,
// con profesores ficticios, para ver cómo funcionan guardias y ausencias.
// ─── Datos de ejemplo de convivencia (todo ficticio) ────────────────────────
// Grupos con su tutor/a, alumnado inventado, partes de todas las gravedades y
// tipificaciones, salidas al baño, alertas e informes guardados.
const GRUPOS_DEMO = [
  { curso: "1º ESO A", tutor: "Carmen López" },  { curso: "1º ESO B", tutor: "Jorge Ruiz" },
  { curso: "2º ESO A", tutor: "Laura Torres" },  { curso: "2º ESO B", tutor: "Pedro Sánchez" },
  { curso: "3º ESO A", tutor: "Ana Jiménez" },   { curso: "3º ESO B", tutor: "Sofía Martín" },
  { curso: "4º ESO A", tutor: "Pablo Díaz" },    { curso: "4º ESO C", tutor: "Luis García" },
];
const correoDemo = nombre => nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, ".") + "@ejemplo.es";
const TUTORES_DEMO = Object.fromEntries(GRUPOS_DEMO.map(g => [g.curso, { tutor: g.tutor, email: correoDemo(g.tutor) }]));
// Tutor/a de un grupo: primero la tutoría registrada; si no, la del alumnado del grupo
const tutorDeGrupo = (tutores, alumnos, curso) => tutores?.[curso]?.tutor || alumnos.find(a => a.curso === curso && a.tutor)?.tutor || "";

const DESCRIPCIONES_DEMO = {
  "1L": "Interrumpe la explicación varias veces con comentarios en voz alta. Se le avisa dos veces y continúa.",
  "2L": "No trae libro ni cuaderno por tercera vez esta semana y no realiza las actividades propuestas.",
  "3L": "Llega 20 minutos tarde a primera hora sin justificación.",
  "4L": "Se queda en el pasillo durante el cambio de clase y entra al aula 10 minutos tarde sin permiso.",
  "5L": "Habla continuamente con los compañeros de mesa e impide que terminen la tarea.",
  "6L": "Contesta de malas formas a un compañero cuando se le pide que devuelva un material.",
  "7L": "Pinta la mesa con rotulador. Se le pide que la limpie al final de la clase.",
  "8L": "Usa el móvil en clase sin permiso. Se le pide que lo guarde y tarda en hacerlo.",
  "9L": "No acude a la recuperación en el recreo impuesta por un parte anterior.",
  "10L": "Lanza bolas de papel a los compañeros durante la explicación.",
  aG: "Acumula faltas de asistencia injustificadas a primera hora durante tres semanas. La tutoría lo comunica a Jefatura.",
  bG: "Impide el desarrollo normal del examen hablando y molestando a los compañeros pese a los avisos.",
  cG: "Insulta a una compañera delante del grupo durante el cambio de clase.",
  dG: "Se niega a cambiarse de sitio cuando se le pide y desafía las indicaciones del profesor ante el grupo.",
  eG: "Rompe intencionadamente la persiana del aula.",
  fG: "Esconde la mochila de un compañero, que la encuentra más tarde en el baño.",
  gG: "Anima a varios compañeros a salir del aula sin permiso durante la clase.",
  hG: "Participa en una pelea en el patio durante el recreo. Ambos alumnos aceptaban la pelea.",
  iG: "Activa sin motivo el pulsador de la alarma de incendios durante la 4ª hora.",
  jG: "Reiteración en el trimestre de faltas leves (tres partes leves registrados).",
  kG: "Se le sorprende copiando en el examen con el móvil.",
  lG: "Sabía que un compañero estaba siendo acosado y no lo comunicó a ningún profesor.",
  mG: "Comparte en un grupo de mensajería una foto de un compañero tomada en clase sin su permiso.",
  nG: "No cumple la medida correctora de reparar el material que había dañado.",
  aMG: "Amenaza e insulta gravemente al profesor cuando se le pide que guarde el móvil.",
  bMG: "Tras la investigación de la tutoría se confirma que lleva semanas humillando a un compañero en el recreo.",
  cMG: "Agrede a un compañero en el pasillo; el compañero necesita atención en la enfermería del centro.",
  dMG: "Dirige insultos discriminatorios a una compañera delante del grupo.",
  eMG: "Graba una pelea en el patio y la difunde en redes sociales.",
  fMG: "Arranca intencionadamente un lavabo de los baños de la planta 1.",
  gMG: "Falsifica la firma de la familia en un justificante de faltas.",
  hMG: "Se le encuentra con un vapeador y lo ofrece a compañeros dentro del centro.",
  iMG: "Entra con la contraseña de un profesor al aula virtual y modifica tareas.",
  jMG: "Provoca un incidente en la cafetería que obliga a desalojarla.",
  kMG: "Reiteración en el mismo trimestre de dos faltas graves.",
  lMG: "Incita a sus compañeros a agredir a otro alumno a la salida del centro.",
  mMG: "Se presenta en el centro durante los días de expulsión que tenía impuestos.",
};
// Botones de frases rápidas: se muestran según el tipo de parte y la tipificación elegidos
function FrasesRapidas({ tipo, tipificacion, texto, setTexto }) {
  const frases = [...(FRASES_TIPIFICACION[tipificacion] || []), ...(FRASES_TIPO[tipo] || [])];
  if (!frases.length) return null;
  const anadir = f => setTexto(prev => { const t = prev.trim(); return t ? `${t} ${f}` : f; });
  return (
    <div style={{ background: C.white, border: "1px solid #CDE9ED", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: R.petroleo, marginBottom: 10, lineHeight: 1.4 }}>
        💬 Frases rápidas <span style={{ fontWeight: 400, color: R.petroleo }}>— pulsa para añadirla; luego puedes cambiar el texto{tipificacion ? "" : ". Elige una tipificación para ver frases más concretas"}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {frases.map(f => {
          const usada = texto.includes(f);
          return (
            <button key={f} type="button" onClick={() => !usada && anadir(f)} disabled={usada}
              style={{ fontSize: 15, lineHeight: 1.3, minHeight: 44, padding: "8px 14px", borderRadius: 22, border: `2px solid ${usada ? "#CDE9ED" : R.turquesa}`, background: usada ? R.gris : C.white, color: R.noche, cursor: usada ? "default" : "pointer", textAlign: "left" }}>
              {usada ? "✓ " : "+ "}{f}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const tipoDeTipificacion = t => ["3L", "aG"].includes(t) ? "Ausencia" : ["2L", "kG"].includes(t) ? "Académico" : t === "10L" ? "Otro" : "Comportamiento";

function datosEjemploConvivencia(profesores) {
  // Generador pseudoaleatorio con semilla: el ejemplo sale igual cada vez
  let semilla = 20260929;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const elegir = arr => arr[Math.floor(azar() * arr.length)];
  const NOMBRES = ["Hugo", "Martina", "Leo", "Valeria", "Mateo", "Carla", "Iker", "Noa", "Álex", "Julia", "Daniel", "Irene", "Nicolás", "Lola", "Bruno", "Aitana", "Samuel", "Claudia", "Adam", "Vega", "Eric", "Olivia", "Gael", "Alba", "Izan", "Nerea", "Thiago", "Mía", "Rubén", "Ainhoa", "Marco", "Daniela"];
  const APELLIDOS = ["Navarro", "Molina", "Ortiz", "Delgado", "Castro", "Rubio", "Marín", "Sanz", "Iglesias", "Núñez", "Medina", "Garrido", "Cortés", "Santos", "Lozano", "Guerrero", "Cano", "Prieto", "Méndez", "Cruz", "Calvo", "Gallego", "Vidal", "León", "Herrera", "Márquez", "Peña", "Flores", "Cabrera", "Campos", "Vega", "Fuentes"];
  // Alumnado: los 8 de siempre (con su tutor actualizado) y 4 más por grupo
  const alumnos = DEMO_ALUMNOS.map(a => ({ ...a, tutor: TUTORES_DEMO[a.curso]?.tutor || a.tutor }));
  let id = 100, k = 0;
  GRUPOS_DEMO.forEach(g => {
    const yaHay = alumnos.filter(a => a.curso === g.curso).length;
    for (let i = yaHay; i < 5; i++) {
      const nombre = `${NOMBRES[k % NOMBRES.length]} ${APELLIDOS[k % APELLIDOS.length]} ${APELLIDOS[(k * 7 + 3) % APELLIDOS.length]}`;
      const ap = APELLIDOS[k % APELLIDOS.length].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      alumnos.push({ id: id++, nombre, curso: g.curso, tutor: g.tutor, email: `familia.${ap}${k}@email.com`, telefono: `6${String(10000000 + k * 7919).slice(0, 8)}`, nia: "" });
      k++;
    }
  });
  // Días lectivos de las últimas 8 semanas, del más antiguo al más reciente
  const hoy = new Date(), hoyISO = isoLocal(hoy);
  const dias = []; // sin hoy
  // Solo días de curso: sin julio ni agosto, y en septiembre desde el día 8
  const deCurso = x => { const m = x.getMonth(); return m !== 6 && m !== 7 && !(m === 8 && x.getDate() < 8); };
  for (let d = 56; d >= 1; d--) { const x = sumarDias(hoy, -d); if (esLectivo(x) && deCurso(x)) dias.push(x); }
  if (dias.length < 5) for (let d = 1; dias.length < 5; d++) { const x = sumarDias(hoy, -d); if (esLectivo(x)) dias.unshift(x); }
  const horasClase = HORAS.filter(h => h !== "Recreo" && h !== "7ª hora");
  const momento = (dia, hora) => {
    const d = parseISO(dia); const [hh, mm] = inicioHora(hora).split(":").map(Number);
    d.setHours(hh, mm + 5 + Math.floor(azar() * 40)); return d;
  };
  const partes = [];
  const nuevoParte = (al, tip, grav, dia, hora, extra = {}) => {
    let ts = momento(dia, hora);
    if (ts > hoy) ts = new Date(hoy.getTime() - 5 * 60000);
    partes.push({ id: 1000 + partes.length, alumnoId: al.id, alumno: al.nombre, curso: al.curso, tutor: al.tutor, tutorEmail: TUTORES_DEMO[al.curso]?.email || "", email: al.email, telefono: al.telefono,
      tipo: tipoDeTipificacion(tip), gravedad: grav, tipificacion: tip, descripcion: DESCRIPCIONES_DEMO[tip],
      profesor: elegir(profesores.filter(p => p !== al.tutor)), hora, ts: ts.toISOString(), ...extra });
  };
  // Un alumno "difícil" por grupo concentra más partes (así se ven las acumulaciones)
  const dificiles = GRUPOS_DEMO.map(g => alumnos.filter(a => a.curso === g.curso)[1]);
  const quien = () => azar() < 0.45 ? elegir(dificiles) : elegir(alumnos);
  // 1) Cada tipificación aparece al menos una vez
  const todas = [...TIPIFICACION.leve.map(t => [t.id, "leve"]), ...TIPIFICACION.grave.map(t => [t.id, "grave"]), ...TIPIFICACION.muy_grave.map(t => [t.id, "muy_grave"])];
  todas.forEach(([tip, grav], i) => nuevoParte(quien(), tip, grav, dias[Math.floor((i / todas.length) * (dias.length - 1))], elegir(horasClase)));
  // 2) Más partes, sobre todo leves, como en un trimestre real
  for (let i = 0; i < 48; i++) {
    const r = azar();
    const grav = r < 0.65 ? "leve" : r < 0.92 ? "grave" : "muy_grave";
    const pool = grav === "leve" ? ["1L", "1L", "2L", "3L", "5L", "5L", "6L", "8L", "8L", "4L"] : grav === "grave" ? ["cG", "dG", "dG", "bG", "hG", "jG"] : ["aMG", "cMG", "bMG"];
    nuevoParte(quien(), elegir(pool), grav, elegir(dias), elegir(horasClase));
  }
  // 3) Dos partes de grupo
  const diaGrupo1 = dias[dias.length - 6] || dias[0], diaGrupo2 = dias[dias.length - 15] || dias[0];
  alumnos.filter(a => a.curso === "3º ESO B").forEach(al => nuevoParte(al, "1L", "leve", diaGrupo1, "5ª hora", { esGrupal: true, descripcion: "Todo el grupo sale del aula antes del timbre y no vuelve cuando se le pide." }));
  alumnos.filter(a => a.curso === "2º ESO A").forEach(al => nuevoParte(al, "5L", "leve", diaGrupo2, "6ª hora", { esGrupal: true, descripcion: "El grupo impide el desarrollo de la clase con ruido constante; no se puede terminar la actividad." }));
  // 4) Partes de hoy, en horas que ya han empezado
  if (esLectivo(hoy)) {
    const empezadas = horasClase.filter(h => horaEmpezada(hoyISO, h));
    [["8L", "leve"], ["1L", "leve"], ["dG", "grave"]].slice(0, empezadas.length).forEach(([tip, grav], i) => nuevoParte(elegir(dificiles), tip, grav, hoy, empezadas[Math.min(i, empezadas.length - 1)]));
  }
  partes.sort((a, b) => b.ts.localeCompare(a.ts));

  // Salidas al baño de las dos últimas semanas (una, fuera ahora mismo)
  const banos = [];
  dias.slice(-10).forEach(dia => {
    const n = 2 + Math.floor(azar() * 3);
    for (let i = 0; i < n; i++) {
      const al = azar() < 0.3 ? dificiles[2] : elegir(alumnos);
      const salida = momento(dia, elegir(horasClase));
      if (salida > hoy) continue;
      const regreso = new Date(salida.getTime() + (3 + Math.floor(azar() * 10)) * 60000);
      banos.push({ id: 5000 + banos.length, alumnoId: al.id, alumno: al.nombre, curso: al.curso, fecha: isoLocal(salida), salida: salida.toISOString(), ts: salida.toISOString(), regreso: regreso.toISOString(), profesor: elegir(profesores) });
    }
  });
  if (esLectivo(hoy)) {
    const al = dificiles[4]; const salida = new Date(hoy.getTime() - 6 * 60000);
    banos.push({ id: 5000 + banos.length, alumnoId: al.id, alumno: al.nombre, curso: al.curso, fecha: hoyISO, salida: salida.toISOString(), ts: salida.toISOString(), regreso: null, profesor: elegir(profesores) });
  }
  banos.sort((a, b) => b.ts.localeCompare(a.ts));

  // Alertas: acumulación de leves y límite de partes (las más antiguas, ya leídas)
  const alertas = [];
  alumnos.forEach(al => {
    const pA = partes.filter(p => p.alumnoId === al.id).sort((a, b) => a.ts.localeCompare(b.ts));
    const leves = pA.filter(p => p.gravedad === "leve");
    if (leves.length >= 3) alertas.push({ id: 7000 + alertas.length, tipo: "acumulacion_leves", alumno: al.nombre, curso: al.curso, msg: "Acumulación de 3 partes leves — Considerar sanción", ts: leves[2].ts, leida: false });
    if (pA.length >= 3) alertas.push({ id: 7000 + alertas.length, tipo: "total_partes", alumno: al.nombre, curso: al.curso, msg: "Ha alcanzado 3 partes en total", ts: pA[2].ts, leida: false });
  });
  const semana = banos.filter(b => b.alumnoId === dificiles[2].id);
  if (semana.length > 3) alertas.push({ id: 7000 + alertas.length, tipo: "bano", alumno: dificiles[2].nombre, curso: dificiles[2].curso, msg: `Ha ido al baño ${semana.length} veces en las dos últimas semanas`, ts: semana[0].ts, leida: false });
  alertas.sort((a, b) => b.ts.localeCompare(a.ts));
  alertas.forEach((a, i) => { if (i >= 5) a.leida = true; });

  // Dos informes ya guardados, como si Jefatura los hubiera descargado
  const hace = n => sumarDias(hoy, -n);
  const informes = [
    { id: 9001, tipo: "partes", ts: new Date(hace(14).setHours(13, 50)).toISOString(), autor: "Ana Jiménez", filtros: { filtCurso: "2º ESO B" }, filtrosTexto: `Curso: 2º ESO B · Tutor/a: ${TUTORES_DEMO["2º ESO B"].tutor}`, ids: partes.filter(p => p.curso === "2º ESO B" && p.ts < hace(14).toISOString()).map(p => p.id) },
    { id: 9002, tipo: "partes", ts: new Date(hace(7).setHours(14, 20)).toISOString(), autor: "Luis García", filtros: { filtGravedad: "grave" }, filtrosTexto: "Graves", ids: partes.filter(p => p.gravedad === "grave" && p.ts < hace(7).toISOString()).map(p => p.id) },
  ];
  informes.forEach(i => { i.total = i.ids.length; });
  return { alumnos, partes, banos, alertas, informes, tutores: TUTORES_DEMO };
}

function datosEjemploGuardias(profesores) {
  const n = profesores.length;
  const zonasClase  = ["A0-pasillo", "A1-pasillo", "B1-pasillo"];
  const zonasRecreo = ["rec-puerta", "rec-central", "rec-pistas"];
  const cuadrante = {}, apoyos = {}, sustitutos = {};
  const lunes = lunesDe();
  const diasQuincena = Array.from({ length: 14 }, (_, i) => sumarDias(lunes, i)).filter(esLectivo);
  // Reparto en rueda: cada hora usa 9 profesores distintos (3 zonas x titular, apoyo y sustituto).
  // Con 24 profesores y 8 horas, cada uno tiene 3 guardias al día.
  diasQuincena.forEach((dia, di) => {
    const f = isoLocal(dia);
    let k = di * 5;
    HORAS_GUARDIA.forEach(hora => {
      const zonas = hora === "Recreo" ? zonasRecreo : zonasClase;
      zonas.forEach(zona => {
        cuadrante[`${f}|${hora}|${profesores[k % n]}`] = zona;
        apoyos[`${f}|${hora}|${zona}`] = profesores[(k + 1) % n];
        sustitutos[`${f}|${hora}|${zona}`] = profesores[(k + 2) % n];
        k += 3;
      });
      // Aula de convivencia: titular libre a esa hora, para las medidas correctoras
      if (["3ª hora", "Recreo", "7ª hora"].includes(hora)) {
        const ocupados = new Set(Object.keys(cuadrante).filter(c => c.startsWith(`${f}|${hora}|`)).map(c => c.split("|")[2]));
        Object.entries({ ...apoyos, ...sustitutos }).forEach(([c, p]) => { if (c.startsWith(`${f}|${hora}|`)) ocupados.add(p); });
        const libre = profesores.map((_, j) => profesores[(k + 11 + j) % n]).find(p => !ocupados.has(p));
        if (libre) cuadrante[`${f}|${hora}|${libre}`] = "aula-conv";
      }
    });
  });
  // Día de las ausencias: hoy si es lectivo; si no, el próximo lunes
  let dia = parseISO(new Date());
  while (!esLectivo(dia)) dia = sumarDias(dia, 1);
  const diaISO = isoLocal(dia);
  const manana = (() => { let d = sumarDias(dia, 1); while (!esLectivo(d)) d = sumarDias(d, 1); return isoLocal(d); })();
  const quien = (hora, zona) => Object.keys(cuadrante).find(k => k.startsWith(`${diaISO}|${hora}|`) && cuadrante[k] === zona)?.split("|")[2];
  const ausente1 = quien("2ª hora", "A1-pasillo");
  const ausente2 = quien("Recreo", "rec-central");
  const ts = new Date().toISOString();
  const ausencias = [
    { id: 1, profesor: ausente1, motivo: "Enfermedad", fecha: diaISO, horas: ["2ª hora", "3ª hora"], edificio: "A", aula: "2º ESO B", asignatura: "Matemáticas", tarea: "Ejercicios 1 a 10 de la página 54. Se recogen al final de la clase.", ubicacion: "Conserjería", enlace: "", ts, leida: false },
    { id: 2, profesor: ausente2, motivo: "Formación", fecha: diaISO, horas: ["Recreo", "5ª hora"], edificio: "B", aula: "4º ESO C", asignatura: "Inglés", tarea: "Lectura del texto de la unidad 3 y resumen en el cuaderno.", ubicacion: "Mesa del aula", enlace: "", ts, leida: false },
    { id: 3, profesor: profesores[(Math.max(0, profesores.indexOf(ausente1)) + 3) % n], motivo: "Asunto personal", fecha: manana, horas: ["1ª hora"], edificio: "B", aula: "1º ESO A", asignatura: "Música", tarea: "Repaso de figuras rítmicas con la ficha 7.", ubicacion: "Departamento de Música", enlace: "", ts, leida: false },
  ];
  // Profesor recomendado para probar: el sustituto que hoy tiene que entrar por el ausente de 2ª hora
  const sust = sustitutos[`${diaISO}|2ª hora|A1-pasillo`];
  const sugerido = [ausente1, ausente2].includes(sust) ? apoyos[`${diaISO}|2ª hora|A1-pasillo`] : sust;
  // Firmas de ejemplo: todas las horas ya empezadas hoy, menos las del profesor sugerido
  // (para que pruebe a firmar) y una que queda pendiente
  const firmas = [];
  let pendienteDejada = false;
  HORAS_GUARDIA.filter(h => horaEmpezada(diaISO, h)).forEach(hora => {
    Object.entries(cuadrante).filter(([k]) => k.startsWith(`${diaISO}|${hora}|`)).forEach(([k, zonaId]) => {
      const sit = situacionZona({ fecha: diaISO, hora, zonaId, profesores, cuadrante, apoyos, sustitutos, ausencias });
      const z = ZONAS_CENTRO.find(z => z.id === zonaId);
      sit.enZona.forEach(p => {
        if (p === sugerido) return;
        if (!pendienteDejada && hora !== "1ª hora") { pendienteDejada = true; return; }
        const d = parseISO(diaISO); const [hh, mm] = inicioHora(hora).split(":").map(Number); d.setHours(hh, mm + 2 + (p.length % 4));
        firmas.push({ id: firmas.length + 1, fecha: diaISO, hora, zonaId, zona: z?.label || zonaId, profesor: p, rol: p === sit.titular ? "titular" : p === sit.apoyo ? "apoyo" : "sustituto", ts: d.toISOString() });
      });
    });
  });
  return { cuadrante, apoyos, sustitutos, ausencias, firmas, sugerido, ausentes: [ausente1, ausente2] };
}

// ═══════════════════════════════════════════════════════════════════════════
// MI GUARDIA HOY (Profesor)
// ═══════════════════════════════════════════════════════════════════════════
function MiGuardiaHoy({ medidas = [], onMarcarMedida, coberturas = {}, firmas = [], setFirmas, listas = [], setListas, alumnos = [], profesores, cuadrante, apoyosGuardia, sustitutosGuardia = {}, ausencias, fProfesor, setFProfesor, C, selStyle, labelStyle, usuario, setShowCuadrante, diaSeleccionadoGuardias, setDiaSeleccionadoGuardias }) {
  const hoy     = new Date();
  const diasES  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const diaHoy  = diasES[hoy.getDay()];
  const esFinde = hoy.getDay() === 0 || hoy.getDay() === 6;
  const hoyISO  = isoLocal(hoy);
  const [listaAbierta, setListaAbierta] = useState(null); // {hora, curso}
  const cursosCentro = [...new Set(alumnos.map(a => a.curso))].sort();
  function firmar(g) {
    setFirmas(prev => [...prev, { id: Date.now(), fecha: hoyISO, hora: g.hora, zonaId: g.zonaId, zona: g.zona, profesor: fProfesor, rol: g.rol, ts: new Date().toISOString() }]);
  }
  const listaDe = (hora, curso) => listas.find(l => l.fecha === hoyISO && l.hora === hora && l.curso === curso && l.profesor === fProfesor);
  function guardarLista(ausentes) {
    const { hora, curso } = listaAbierta;
    setListas(prev => [...prev.filter(l => !(l.fecha === hoyISO && l.hora === hora && l.curso === curso && l.profesor === fProfesor)),
      { id: Date.now(), fecha: hoyISO, hora, curso, profesor: fProfesor, ausentes, ts: new Date().toISOString() }]);
    setListaAbierta(null);
  }

  const equipo = { profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias, coberturas };
  const ahora = horaEnCurso();
  // Guardias de hoy: como titular, apoyo o sustituto
  const guardiasDia = guardiasDeProfesor({ fecha: hoyISO, profesor: fProfesor, ...equipo }).map(g => ({
    ...g,
    // Tareas de las clases sin profesor que afectan a esta guardia
    ausencias: tareasDeGuardia(g, hoyISO, ausencias),
    // Clase que jefatura le ha asignado cubrir a esta hora
    cubre: claseQueCubre(hoyISO, g.hora, fProfesor, coberturas, ausencias),
  }));

  return (
    <div>
      {/* BIENVENIDA PERSONALIZADA CON SALUDO POR HORA */}
      {(() => {
        const hora = new Date().getHours();
        let saludo = "";
        if (hora < 14) saludo = "¡Buenos días";
        else if (hora < 21) saludo = "¡Buenas tardes";
        else saludo = "¡Buenas noches";
        
        return (
          <div style={{ color: R.petroleo, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontFamily: TITULO, fontSize: 26, lineHeight: 1.2, fontWeight: 400, marginBottom: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", textWrap: "balance" }}>{saludo}, {usuario}! <Icono nombre="saludo" tam={36} /></h1>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
                  {guardiasDia.length > 0 ? (
                    <>Hoy tienes <strong>{guardiasDia.length} guardia{guardiasDia.length !== 1 ? 's' : ''}</strong> asignada{guardiasDia.length !== 1 ? 's' : ''}</>
                  ) : esFinde ? (
                    <>¡Hoy es fin de semana! Que descanses</>
                  ) : (
                    <>No tienes guardias hoy. ¡Que disfrutes!</>
                  )}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icono nombre="fecha" tam={32} />
                <div style={{ fontSize: 15 }}>{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Mi Guardia Hoy" icono="guardias" /></div>
      <div style={{ background:C.white, borderRadius:12, padding:16, marginBottom:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
        <label style={labelStyle}>Soy el/la profesor/a</label>
        <select value={fProfesor} onChange={e => setFProfesor(e.target.value)} style={selStyle} disabled={profesores.includes(usuario)}>
          {profesores.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* AVISO DE AUSENCIAS A CUBRIR */}
      {(() => {
        // Obtener la zona del profesor hoy
        let zonaProfesor = null;
        let edificioProfesor = null;
        
        for (let hora of HORAS_GUARDIA) {
          const key = `${hoyISO}|${hora}|${fProfesor}`;
          const zona = cuadrante[key];
          if (zona) {
            zonaProfesor = zona;
            const zonaObj = ZONAS_CENTRO.find(z => z.id === zona);
            edificioProfesor = zonaObj?.edificio;
            break;
          }
        }
        
        // Buscar ausencias de hoy que el profesor debe cubrir
        const ausenciasACubrir = ausencias.filter(a => {
          const fechaAusencia = a.fecha;
          const hoysStr = hoyISO;
          return fechaAusencia === hoysStr && a.edificio === edificioProfesor;
        });
        
        if (ausenciasACubrir.length > 0 && zonaProfesor) {
          return (
            <div style={{ background: "#FDF1D9", borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: "4px solid #F6C862", boxShadow: "0 2px 10px rgba(245, 158, 11, 0.15)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ fontSize: 24 }}><Ic n="aviso" tam={22} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#16333F", marginBottom: 10, fontSize: 15 }}>
                    Tienes {ausenciasACubrir.length} {ausenciasACubrir.length === 1 ? "clase" : "clases"} sin profesor hoy
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ausenciasACubrir.map((a, idx) => (
                      <div key={idx} style={{ background: "#FDF1D9", borderRadius: 6, padding: 10, fontSize: 14, color: "#78350F" }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {a.horas.join(", ")} - {a.asignatura || "Clase"}
                        </div>
                        <div style={{ fontSize: 14 }}>
                          <Ti tam={20}><Ic n="por-alumno" tam={20} />{a.profesor} · 🏫 Aula {a.aula || "?"} {a.asignatura ? `· 📚 ${a.asignatura}` : ""}</Ti>
                        </div>
                        {a.tarea && <div style={{ fontSize: 14, marginTop: 4 }}>✏️ Tarea: {a.tarea}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* CALENDARIO PRÓXIMOS 7 DÍAS */}
      {(() => {
        const proximosDias = [];
        for (let i = 0; i < 7; i++) {
          const fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() + i);
          const dia = diasES[fecha.getDay()];
          
          // Verificar si tiene guardias ese día
          const f = isoLocal(fecha);
          const tieneGuardia = guardiasDeProfesor({ fecha: f, profesor: fProfesor, ...equipo }).length > 0;
          
          proximosDias.push({ dia, fecha, tieneGuardia });
        }
        
        return (
          <div style={{ background:C.white, borderRadius:12, padding:16, marginBottom:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:14, fontWeight:600, color:C.gray, marginBottom:12 }}><Ic n="fecha-hora" tam={22} />Próximos 7 días</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:4 }}>
              {proximosDias.map((p, idx) => (
                <div key={idx} 
                  onClick={() => p.tieneGuardia && setDiaSeleccionadoGuardias(p.fecha)}
                  style={{ 
                    textAlign:"center", 
                    padding:"10px 2px", 
                    minWidth:0,
                    borderRadius:10, 
                    background: p.tieneGuardia ? "#DDF0F4" : "#EBF0F6",
                    border: idx === 0 ? `2px solid ${C.teal}` : "2px solid transparent",
                    cursor: p.tieneGuardia ? "pointer" : "default",
                    transition: "all .2s ease",
                    transform: p.tieneGuardia ? "scale(1)" : "scale(1)"
                  }}
                  onMouseOver={e => { if (p.tieneGuardia) { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; } }}
                  onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.gray, marginBottom:4 }}>{p.dia.substring(0,3)}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:6 }}>{p.fecha.getDate()}</div>
                  <div style={{ fontSize:20 }}>{p.tieneGuardia ? "✅" : "⭕"}</div>
                  <div style={{ fontSize:13, color: p.tieneGuardia ? C.teal : C.gray, fontWeight:600, marginTop:4, overflow:"hidden", textOverflow:"ellipsis" }}>
                    {p.tieneGuardia ? "Guardia" : "Libre"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button onClick={() => setShowCuadrante(true)} style={{
                padding: "10px 20px",
                background: C.blue,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                transition: "all .3s ease"
              }}
              onMouseOver={e => { e.currentTarget.style.background = "#00a399"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.transform = "translateY(0)"; }}>
                <Ic n="fecha-hora" tam={22} />Ver Cuadrante Completo
              </button>
            </div>
          </div>
        );
      })()}
      {esFinde ? (
        <div style={{ background:"#DDF0F4", borderRadius:12, padding:30, textAlign:"center", color:C.teal, fontWeight:600, fontSize:16 }}>
          🎉 ¡Hoy es {diaHoy}! No hay guardias.
        </div>
      ) : guardiasDia.length === 0 ? (
        <div style={{ background:C.white, borderRadius:12, padding:30, textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontWeight:700, color:C.dark, fontSize:16 }}>No tienes guardias asignadas hoy ({diaHoy})</div>
          <div style={{ color:C.gray, fontSize:14, marginTop:6 }}>Consulta con Jefatura si crees que es un error</div>
        </div>
      ) : (
        <div>
          <div style={{ fontWeight:600, color:C.gray, fontSize:14, marginBottom:10 }}>
            <Ic n="fecha-hora" tam={22} />{diaHoy} — {guardiasDia.length} guardia(s) asignada(s)
          </div>
          {guardiasDia.map((g, i) => {
            const { sit } = g;
            const ROLES = {
              titular:   { txt: "🛡️ TITULAR DE LA GUARDIA", color: C.teal, bg: "#DDF0F4" },
              apoyo:     { txt: "👥 APOYO",                  color: C.blue, bg: "#DDF0F4" },
              sustituto: { txt: "🔁 SUSTITUTO",              color: "#2B647E", bg: "#DDF0F4" },
            };
            const r = ROLES[g.rol];
            const esAhora = ahora === g.hora;
            const nombre = (p, falta) => p
              ? <span style={{ textDecoration: falta ? "line-through" : "none", color: falta ? C.salmon : C.dark }}>{p}{falta ? " (ausente)" : ""}</span>
              : <span style={{ color: "#275D8C" }}>sin asignar</span>;
            // Aviso principal según el papel
            let aviso = null;
            const rojo = { background: "#FDF1D9", border: `2px solid ${C.salmon}`, color: "#275D8C" };
            const ambar = { background: "#FDF1D9", border: "1px solid #F6C862", color: "#16333F" };
            const azul = { background: "#DDF0F4", border: `1px solid ${C.blue}`, color: C.blue };
            if (g.rol === "sustituto") {
              aviso = sit.sustituyeA
                ? { estilo: rojo, txt: `⚠️ Hoy entras tú: sustituyes a ${sit.sustituyeA} (${sit.hueco})` }
                : { estilo: azul, txt: "Estás de reserva: solo entras si falta el titular o el apoyo" };
            } else if (g.rol === "apoyo") {
              if (sit.tA) aviso = sit.sustituyeA
                ? { estilo: ambar, txt: `Falta el titular ${sit.titular}: entra el sustituto ${sit.sustituto}` }
                : { estilo: rojo, txt: `⚠️ Falta el titular ${sit.titular} y no hay sustituto: cubres tú la zona` };
            } else {
              if (!sit.apoyo || sit.aA) aviso = sit.sustituyeA
                ? { estilo: ambar, txt: `${sit.aA ? `Tu apoyo ${sit.apoyo} falta` : "No tienes apoyo asignado"}: entra el sustituto ${sit.sustituto}` }
                : { estilo: rojo, txt: `⚠️ ${sit.aA ? `Tu apoyo ${sit.apoyo} falta` : "No tienes apoyo asignado"} y no hay sustituto: estás solo/a en la zona` };
            }
            return (
              <div key={i} style={{ background:C.white, borderRadius:12, padding:18, marginBottom:12, boxShadow: esAhora ? `0 0 0 3px ${r.color}` : "0 2px 10px rgba(0,0,0,0.06)", borderLeft:`5px solid ${r.color}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:18, color:C.dark }}>{g.hora} <span style={{ fontSize:14, fontWeight:600, color:C.gray }}>· {HORARIO[g.hora]}</span></div>
                    <div style={{ fontSize:15, color:r.color, fontWeight:600, marginTop:4 }}><Ic n="edificio" tam={22} />{g.zona}</div>
                  </div>
                  {esAhora && <span style={{ background:r.color, color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:14, fontWeight:700 }}>⏱ AHORA</span>}
                </div>
                <div style={{ marginTop:12, padding:"6px 12px", background:r.bg, borderRadius:8, fontSize:14, fontWeight:700, color:r.color, display:"inline-block" }}><Ti tam={22}>{r.txt}</Ti></div>
                {g.cubre && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, fontSize:14, fontWeight:800, background:"#DDF0F4", border:`2px solid ${C.blue}`, color:C.blue }}>📋 Jefatura te ha asignado: cubres la clase de {g.cubre.profesor}{g.cubre.aula ? ` en ${g.cubre.aula}` : ""}</div>}
                {aviso && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, fontSize:14, fontWeight:700, ...aviso.estilo }}><Ti tam={22}>{aviso.txt}</Ti></div>}
                <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:6, fontSize:14, color:C.gray }}>
                  <div><Ic n="titular" tam={22} />Titular: {nombre(sit.titular, sit.tA)}</div>
                  <div><Ic n="apoyo" tam={22} />Apoyo: {nombre(sit.apoyo, sit.aA)}</div>
                  <div><Ic n="sustituto" tam={22} />Sustituto: {nombre(sit.sustituto, sit.sA)}</div>
                </div>
                {g.ausencias.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#16333F", marginBottom: 6 }}><Ic n="deberes" tam={22} />Deberes y tareas de las clases sin profesor</div>
                    <div style={{ display: "grid", gap: 8 }}>{g.ausencias.map(a => <TareaAusente key={a.id} a={a} C={C} />)}</div>
                  </div>
                )}
                <AlumnadoMedidas fecha={hoyISO} hora={g.hora} zonaId={g.zonaId} medidas={medidas} onMarcar={onMarcarMedida} />
                {/* Firmar la guardia y pasar lista */}
                {(() => {
                  const firma = firmas.find(f => f.fecha === hoyISO && f.hora === g.hora && f.zonaId === g.zonaId && f.profesor === fProfesor);
                  const empezada = horaEmpezada(hoyISO, g.hora);
                  const cursosTarea = [...new Set(g.ausencias.map(a => a.aula).filter(c => cursosCentro.includes(c)))];
                  const btn = { borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, border: "none" };
                  return (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.cream}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {firma
                        ? <span style={{ ...btn, background: "#DDF0F4", color: C.teal, cursor: "default" }}>✅ Guardia firmada a las {horaCorta(firma.ts)}</span>
                        : <button onClick={() => firmar(g)} disabled={!empezada} title={empezada ? "Registra que has hecho esta guardia" : `Se puede firmar desde las ${inicioHora(g.hora)}`}
                            style={{ ...btn, background: empezada ? C.teal : "#CDE9ED", color: empezada ? "#fff" : "#6b7280", cursor: empezada ? "pointer" : "not-allowed" }}>
                            <Ic n="firmar" tam={22} />{empezada ? "Firmar guardia" : `Firmar desde las ${inicioHora(g.hora)}`}
                          </button>}
                      {g.hora !== "Recreo" && cursosTarea.map(curso => {
                        const l = listaDe(g.hora, curso);
                        return (
                          <button key={curso} onClick={() => setListaAbierta({ hora: g.hora, curso })}
                            style={{ ...btn, background: l ? "#DDF0F4" : C.blue, color: l ? C.blue : "#fff" }}>
                            <Ic n="pasar-lista" tam={22} />{l ? `Lista de ${curso}: ${l.ausentes.length} ${l.ausentes.length === 1 ? "falta" : "faltas"}` : `Pasar lista · ${curso}`}
                          </button>
                        );
                      })}
                      {g.hora !== "Recreo" && (
                        <span style={{ position: "relative", display: "inline-block" }}>
                        <img src="/iconos/lista-otro-grupo.svg" alt="" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", pointerEvents: "none" }} />
                        <select aria-label="Pasar lista de otro grupo" value="" onChange={e => e.target.value && setListaAbierta({ hora: g.hora, curso: e.target.value })}
                          style={{ padding: "9px 10px 9px 38px", borderRadius: 10, border: "1px solid #CDE9ED", fontSize: 14, color: C.gray, background: "#fff" }}>
                          <option value="">Pasar lista de otro grupo…</option>
                          {cursosCentro.map(c => <option key={c} value={c}>{c}{listaDe(g.hora, c) ? " (pasada)" : ""}</option>)}
                        </select>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          {listaAbierta && (
            <PasarLista curso={listaAbierta.curso} alumnos={alumnos} existente={listaDe(listaAbierta.hora, listaAbierta.curso)}
              onGuardar={guardarLista} onCerrar={() => setListaAbierta(null)} C={C} />
          )}
          <div style={{ background:"#FDF1D9", borderRadius:10, padding:14, marginTop:8, fontSize:14, color:C.dark, border:"1px solid #F6C862" }}>
            <Ic n="aviso" tam={22} />Si no puedes asistir, notifícalo en <strong>Notificar Ausencia</strong>.
          </div>
        </div>
      )}
      
      {/* PANEL LATERAL: Guardias del día seleccionado */}
      {diaSeleccionadoGuardias && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 50 }} onClick={() => setDiaSeleccionadoGuardias(null)}>
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(400px, 100vw)", background: C.white, boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", overflowY: "auto", animation: "slideIn 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: R.azul, color: "#fff", padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}><Ic n="fecha-hora" tam={22} />{diaSeleccionadoGuardias.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}</div>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>Guardias asignadas</div>
              </div>
              {(() => {
                const diasES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
                const diaHoy = diasES[diaSeleccionadoGuardias.getDay()];
                const fechaISO = isoLocal(diaSeleccionadoGuardias);
                const ausenciasDelDia = ausencias.filter(a => {
                  const fechaAus = a.fecha.split("T")[0];
                  return fechaAus === fechaISO;
                });
                const totalAusencias = ausenciasDelDia.length;
                
                return totalAusencias > 0 ? (
                  <div style={{ background: "rgba(239, 68, 68, 0.9)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, marginRight: 10 }}>
                    {totalAusencias}
                  </div>
                ) : null;
              })()}
              <button onClick={() => setDiaSeleccionadoGuardias(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>✕</button>
            </div>
            
            <div style={{ padding: 20 }}>
              {(() => {
                const guardiasDelDia = [];
                
                // Convertir la fecha a nombre del día y a formato ISO
                const diasES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
                const diaHoy = diasES[diaSeleccionadoGuardias.getDay()];
                const fechaISO = isoLocal(diaSeleccionadoGuardias);
                
                guardiasDeProfesor({ fecha: fechaISO, profesor: fProfesor, ...equipo }).forEach(g => {
                  // Tareas de las clases sin profesor que afectan a esta guardia
                  const ausenciasHora = tareasDeGuardia(g, fechaISO, ausencias);
                  guardiasDelDia.push({ ...g, ausencias: ausenciasHora });
                });
                
                return guardiasDelDia.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.gray, padding: 20 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                    <div>No tienes guardias asignadas este día</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {guardiasDelDia.map((g, idx) => (
                      <div key={idx} style={{ background: "#f9fafb", borderRadius: 10, padding: 14, borderLeft: `4px solid ${C.teal}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 8 }}><Ic n="hora-reloj" tam={22} />{conTramo(g.hora)}</div>
                        <div style={{ fontSize: 14, color: C.teal, fontWeight: 600, marginBottom: 10 }}><Ic n="edificio" tam={22} />{g.zona}</div>
                        
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
                          <Ti tam={22}>{g.rol === "titular" ? "🛡️ Titular" : g.rol === "apoyo" ? "👥 Apoyo" : "🔁 Sustituto"}</Ti>
                        </div>
                        <div style={{ background: "#DDF0F4", borderRadius: 6, padding: "6px 10px", fontSize: 14, color: C.dark, marginBottom: 8, lineHeight: 1.6 }}>
                          <Ic n="titular" tam={22} />Titular: {g.sit.titular || "—"}{g.sit.tA ? " (ausente)" : ""}<br/>
                          <Ic n="apoyo" tam={22} />Apoyo: {g.sit.apoyo || "sin asignar"}{g.sit.aA ? " (ausente)" : ""}<br/>
                          <Ic n="sustituto" tam={22} />Sustituto: {g.sit.sustituto || "sin asignar"}{g.sit.sA ? " (ausente)" : ""}
                          {g.sit.sustituyeA && <div style={{ color: "#16333F", fontWeight: 700 }}>Entra el sustituto por {g.sit.sustituyeA}</div>}
                        </div>
                        
                        {g.ausencias.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #CDE9ED" }}>
                            <div style={{ fontWeight: 600, color: "#d97706", fontSize: 14, marginBottom: 8 }}><Ic n="aviso" tam={22} />AUSENCIAS A CUBRIR:</div>
                            {g.ausencias.map((a, i) => (
                              <div key={i} style={{ background: "#FDF1D9", borderRadius: 6, padding: 10, marginBottom: 8, borderLeft: `3px solid #F6C862` }}>
                                <div style={{ fontWeight: 600, color: C.dark, fontSize: 14, marginBottom: 6 }}><Ic n="por-alumno" tam={20} />{a.profesor}</div>
                                {a.asignatura && <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}><strong><Ic n="deberes" tam={22} />Asignatura:</strong> {a.asignatura}</div>}
                                {a.aula && <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}><strong><Ic n="aula" tam={22} />Aula:</strong> {a.aula}</div>}
                                {a.tarea && <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}><strong>✏️ Tarea:</strong> {a.tarea}</div>}
                                {a.enlace && <div style={{ fontSize: 13, marginBottom: 3 }}><a href={a.enlace} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "underline" }}>🔗 Ver recursos</a></div>}
                                {a.ubicacion && <div style={{ fontSize: 13, color: "#555" }}><strong><Ic n="edificio" tam={22} />Ubicación:</strong> {a.ubicacion}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICAR AUSENCIA (Profesor)
// ═══════════════════════════════════════════════════════════════════════════
function NotificarAusencia({ usuario, modoJefatura = false, profesores, ausencias, setAusencias, ausProfesor, setAusProfesor, ausMotivo, setAusMotivo, ausFecha, setAusFecha, ausHoras, setAusHoras, ausTarea, setAusTarea, ausEnlace, setAusEnlace, ausUbicacion, setAusUbicacion, ausAula, setAusAula, ausAsignatura, setAusAsignatura, fProfesor, C, inpStyle, selStyle, labelStyle, fmt }) {
  const [enviado, setEnviado] = useState(false);
  const [ausEdificio, setAusEdificio] = useState("");

  function toggleHora(h) {
    setAusHoras(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  }

  function enviar() {
    if (!ausProfesor || !ausFecha || ausHoras.length === 0) return;
    const nueva = { id:Date.now(), profesor:ausProfesor, motivo:ausMotivo, fecha:ausFecha, horas:ausHoras, tarea:ausTarea, enlace:ausEnlace, ubicacion:ausUbicacion, aula:ausAula, asignatura:ausAsignatura, edificio:ausEdificio, ts:new Date().toISOString(), leida:false,
      ...(modoJefatura && ausProfesor !== usuario ? { registradaPor: usuario } : {}) };
    setAusencias(prev => [nueva, ...prev]);
    setEnviado(true);
    setAusFecha(""); setAusHoras([]); setAusTarea(""); setAusEnlace(""); setAusUbicacion(""); setAusAula(""); setAusAsignatura(""); setAusEdificio("");
    setTimeout(() => setEnviado(false), 4000);
  }

  const misAusencias = modoJefatura ? [] : ausencias.filter(a => a.profesor === fProfesor);

  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo={modoJefatura ? "Registrar una ausencia comunicada por teléfono" : "Notificar Ausencia"} icono="profe-ausente" /></div>
      {modoJefatura && <p style={{ marginTop: -6, color: C.gray, fontSize: 14 }}>Para cuando un profesor llama al instituto y no puede avisar desde la app. Su guardia y la tarea llegan igual a quien le cubre.</p>}
      {enviado && (
        <div style={{ background:"#DDF0F4", border:`2px solid ${C.teal}`, borderRadius:12, padding:16, marginBottom:16, fontWeight:700, color:C.teal, fontSize:15 }}>
          ✅ Ausencia notificada. Jefatura ha sido informada.
        </div>
      )}
      <div style={{ background:C.white, borderRadius:12, padding:20, boxShadow:"0 2px 10px rgba(0,0,0,0.06)", marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
          <div>
            <label style={labelStyle}>Soy el/la profesor/a *</label>
            <select value={ausProfesor} onChange={e => setAusProfesor(e.target.value)} style={selStyle} disabled={!modoJefatura && profesores.includes(usuario)}>
              <option value="">— Seleccionar —</option>
              {profesores.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fecha de ausencia *</label>
            <input type="date" value={ausFecha} onChange={e => setAusFecha(e.target.value)} style={inpStyle} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={labelStyle}>Motivo</label>
            <select value={ausMotivo} onChange={e => setAusMotivo(e.target.value)} style={selStyle}>
              {MOTIVOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Horas afectadas * (selecciona todas las que correspondan)</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
            {HORAS_GUARDIA.map(h => {
              const sel = ausHoras.includes(h);
              return (
                <button key={h} onClick={() => toggleHora(h)}
                  style={{ padding:"8px 14px", borderRadius:8, border:`2px solid ${sel?C.teal:"#CDE9ED"}`, background:sel?C.teal:C.white, color:sel?"#fff":C.dark, cursor:"pointer", fontWeight:600, fontSize:14, transition:"all .15s", lineHeight:1.2 }}>
                  {h}<br/><span style={{ fontSize:13, fontWeight:500, opacity:.8 }}>{HORARIO[h]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>Tarea para el profesor sustituto (opcional)</label>
          <textarea value={ausTarea} onChange={e => setAusTarea(e.target.value)} rows={3}
            placeholder="Describe qué deben hacer los alumnos, qué material hay preparado..."
            style={{ ...inpStyle, resize:"vertical" }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:20 }}>
          <div>
            <label style={labelStyle}>Edificio del aula</label>
            <select value={ausEdificio} onChange={e => setAusEdificio(e.target.value)} style={selStyle}>
              <option value="">— Seleccionar —</option>
              {["A","B","C"].map(e => <option key={e} value={e}>Edificio {e}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Aula donde imparto clase (importante para el profesor de guardia)</label>
            <input type="text" value={ausAula} onChange={e => setAusAula(e.target.value)}
              placeholder="3ºB, Sala 5, Taller 2..."
              style={inpStyle} />
          </div>
          <div>
            <label style={labelStyle}>Asignatura o función</label>
            <input type="text" value={ausAsignatura} onChange={e => setAusAsignatura(e.target.value)}
              placeholder="Matemáticas, Inglés, Tutoría..."
              style={inpStyle} />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
          <div>
            <label style={labelStyle}>Enlace a recursos (opcional)</label>
            <input type="url" value={ausEnlace} onChange={e => setAusEnlace(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={inpStyle} />
          </div>
          <div>
            <label style={labelStyle}>Ubicación del material (opcional)</label>
            <input type="text" value={ausUbicacion} onChange={e => setAusUbicacion(e.target.value)}
              placeholder="Conserjería, Mi despacho, Fotocopias..."
              style={inpStyle} />
          </div>
        </div>
        <button onClick={enviar} disabled={!ausProfesor || !ausFecha || ausHoras.length === 0}
          style={{ width:"100%", padding:14, borderRadius:10, border:"none", background:(!ausProfesor||!ausFecha||ausHoras.length===0)?"#EBF0F6":C.salmon, color:"#fff", fontWeight:700, fontSize:15, cursor:(!ausProfesor||!ausFecha||ausHoras.length===0)?"not-allowed":"pointer" }}>
          <Ti tam={22}>{modoJefatura ? "📞 Registrar la ausencia" : "📢 Notificar Ausencia a Jefatura"}</Ti>
        </button>
      </div>
      {misAusencias.length > 0 && (
        <div>
          <h3 style={{ color:C.dark }}>Mis ausencias notificadas</h3>
          {misAusencias.map(a => (
            <div key={a.id} style={{ background:C.white, borderRadius:10, padding:14, marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderLeft:`4px solid ${C.salmon}` }}>
              <div style={{ fontWeight:700, color:C.dark }}><Ic n="fecha-hora" tam={20} />{new Date(a.fecha).toLocaleDateString("es-ES")} · {a.motivo}</div>
              <div style={{ fontSize:14, color:C.gray, marginTop:4 }}>Horas: {a.horas.join(", ")}</div>
              {a.aula && <div style={{ fontSize:14, color:C.dark, marginTop:4, background:C.light, borderRadius:6, padding:"6px 10px" }}><Ic n="por-curso" tam={20} />Aula: {a.aula}</div>}
              {a.asignatura && <div style={{ fontSize:14, color:C.dark, marginTop:4, background:C.light, borderRadius:6, padding:"6px 10px" }}><Ic n="aula" tam={20} />Asignatura: {a.asignatura}</div>}
              {a.tarea && <div style={{ fontSize:14, color:C.dark, marginTop:4, background:C.light, borderRadius:6, padding:"6px 10px" }}><Ic n="ejercicios" tam={20} />Tarea: {a.tarea}</div>}
              {a.enlace && <div style={{ fontSize:14, color:C.blue, marginTop:4, background:"#DDF0F4", borderRadius:6, padding:"6px 10px" }}>🔗 <a href={a.enlace} target="_blank" rel="noopener noreferrer" style={{ color:C.blue, textDecoration:"underline" }}>Ver recursos</a></div>}
              {a.ubicacion && <div style={{ fontSize:14, color:C.dark, marginTop:4, background:C.light, borderRadius:6, padding:"6px 10px" }}><Ic n="edificio" tam={20} />Ubicación: {a.ubicacion}</div>}
              <div style={{ fontSize:13, color:C.gray, marginTop:4 }}>Notificado el {fmt(a.ts)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUADRANTE DE GUARDIAS (Jefatura)
// ═══════════════════════════════════════════════════════════════════════════
function CuadranteGuardias({ profesores, cuadrante, setCuadrante, apoyosGuardia, setApoyosGuardia, sustitutosGuardia = {}, setSustitutosGuardia, profesoresGuardia, setProfesoresGuardia, ausencias, quinceInicio, setQInicio, quinceProfesor, setQProf, C, inpStyle, selStyle, labelStyle }) {
  function setZona(dia, hora, profesorSel, zonaId) {
    const key = `${dia}|${hora}|${profesorSel}`;
    const anterior = cuadrante[key];
    setCuadrante(prev => { const next={...prev}; if(zonaId==="") delete next[key]; else next[key]=zonaId; return next; });
    // El apoyo y el sustituto acompañan al titular si se le cambia de zona
    if (anterior && anterior !== zonaId) {
      const mover = prev => {
        const next = { ...prev }, kOld = `${dia}|${hora}|${anterior}`;
        if (next[kOld] !== undefined) { if (zonaId) next[`${dia}|${hora}|${zonaId}`] = next[kOld]; delete next[kOld]; }
        return next;
      };
      setApoyosGuardia(mover); setSustitutosGuardia?.(mover);
    }
  }
  
  function setApoyo(dia, hora, zonaId, profesorApoyo) {
    const key = `${dia}|${hora}|${zonaId}`;
    setApoyosGuardia(prev => { const next={...prev}; if(profesorApoyo==="") delete next[key]; else next[key]=profesorApoyo; return next; });
  }

  function setSustituto(dia, hora, zonaId, profesor) {
    const key = `${dia}|${hora}|${zonaId}`;
    setSustitutosGuardia?.(prev => { const next={...prev}; if(profesor==="") delete next[key]; else next[key]=profesor; return next; });
  }
  
  const profesorSel = quinceProfesor || "";
  const inicio = quinceInicio || isoLocal(lunesDe());

  // Quincena = dos semanas (14 días) desde el inicio; se muestran solo los días lectivos (L-V)
  const dias = [];
  for (let i = 0; i < 14; i++) {
    const d = sumarDias(inicio, i);
    if (!esLectivo(d)) continue;
    dias.push({ dia: `${DIAS_ES[d.getDay()].substring(0,3)} ${d.getDate()}/${d.getMonth()+1}`, fecha: d, key: isoLocal(d) });
  }

  // Copia a esta quincena las guardias y apoyos de la quincena anterior (14 días antes), de todos los profesores
  function copiarQuincenaAnterior() {
    if (!window.confirm("¿Copiar a esta quincena las guardias de la quincena anterior?\nSe sustituirán las guardias ya asignadas en estas fechas, de todos los profesores.")) return;
    const destino = new Set(dias.map(d => d.key));
    const origenADestino = Object.fromEntries(dias.map(d => [isoLocal(sumarDias(d.fecha, -14)), d.key]));
    const copiar = prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => { if (!destino.has(k.split("|")[0])) next[k] = v; });
      Object.entries(prev).forEach(([k, v]) => {
        const [f, ...resto] = k.split("|");
        if (origenADestino[f]) next[[origenADestino[f], ...resto].join("|")] = v;
      });
      return next;
    };
    setCuadrante(copiar); setApoyosGuardia(copiar); setSustitutosGuardia?.(copiar);
  }
  
  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Cuadrante de Guardias" icono="horario" /></div>
      
      {/* SELECTOR DE PROFESOR */}
      <div style={{ background:C.white, borderRadius:12, padding:20, marginBottom:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
        <label style={{ ...labelStyle, fontSize: 16, fontWeight: 700, marginBottom: 10, display: "block" }}><Ic n="por-alumno" tam={20} />Seleccionar Profesor para Configurar su Cuadrante</label>
        <select value={profesorSel} onChange={e => setQProf(e.target.value)} style={{ ...selStyle, fontSize: 14, padding: "10px 12px" }}>
          <option value="">— Elige un profesor —</option>
          {profesores.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      
      {/* SI NO HAY PROFESOR: MENSAJE */}
      {!profesorSel && (
        <div style={{ background:C.white, borderRadius:12, padding:40, textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><Ic n="por-alumno" tam={20} /></div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Por favor, selecciona un profesor</div>
          <div style={{ fontSize: 14, color: C.gray }}>Para configurar su cuadrante de guardias de 15 días</div>
        </div>
      )}
      
      {/* SI HAY PROFESOR: CUADRANTE DE 15 DÍAS */}
      {profesorSel && (
        <div style={{ background:C.white, borderRadius:12, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)", overflowX:"auto" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Inicio de quincena</label>
            <input type="date" value={inicio} onChange={e => setQInicio(e.target.value)} style={inpStyle} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button onClick={() => setQInicio(isoLocal(sumarDias(inicio, -14)))} style={{ background: C.cream, border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.dark }}>← Quincena anterior</button>
              <button onClick={() => setQInicio(isoLocal(sumarDias(inicio, 14)))} style={{ background: C.cream, border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.dark }}>Quincena siguiente →</button>
              <button onClick={copiarQuincenaAnterior} style={{ background: "#DDF0F4", border: `1px solid ${C.blue}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.blue }}><Ic n="partes" tam={20} />Copiar de la quincena anterior</button>
            </div>
            {dias.length > 0 && <div style={{ fontSize: 14, color: C.gray, marginTop: 6 }}>Del {dias[0].fecha.toLocaleDateString("es-ES")} al {dias[dias.length - 1].fecha.toLocaleDateString("es-ES")}</div>}
          </div>
          
          <div style={{ fontWeight:700, color:C.dark, marginBottom:4, fontSize:14 }}><Ic n="fecha-hora" tam={20} />Cuadrante: <strong>{profesorSel}</strong></div>
          <div style={{ fontSize:14, color:C.gray, marginBottom:8 }}>En cada guardia: <strong><Ic n="edificio" tam={20} />zona</strong> del titular, <strong><Ic n="grupos" tam={20} />apoyo</strong> y <strong><Ic n="sustituto" tam={20} />sustituto</strong> (entra si falta el titular o el apoyo). Máximo {MAX_GUARDIAS_DIA} guardias por profesor y día; entre paréntesis, las que ya tiene ese día.</div>
          {(() => {
            const incompletas = dias.reduce((n, d) => n + HORAS_GUARDIA.filter(h => { const z = cuadrante[`${d.key}|${h}|${profesorSel}`]; const k = `${d.key}|${h}|${z}`; return z && (!apoyosGuardia[k] || !sustitutosGuardia[k]); }).length, 0);
            return incompletas > 0
              ? <div style={{ marginBottom: 14, padding: "8px 12px", background: "#FDF1D9", border: `1px solid ${C.salmon}`, borderRadius: 8, fontSize: 14, color: "#275D8C", fontWeight: 600, display: "inline-block" }}>⚠️ {incompletas} guardia(s) de esta quincena sin apoyo o sin sustituto</div>
              : <div style={{ marginBottom: 14 }} />;
          })()}
          
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth: 90 + 150 * dias.length }}>
            <thead>
              <tr style={{ background:C.dark }}>
                <th style={{ padding:"8px 8px", color:"#fff", textAlign:"left", width:80 }}>Hora</th>
                {dias.map((d, idx) => {
                  const nd = guardiasDelDia(d.key, profesorSel, cuadrante, apoyosGuardia, sustitutosGuardia);
                  return (
                    <th key={idx} style={{ padding:"8px 8px", color:"#fff", textAlign:"center", whiteSpace:"nowrap" }}>
                      {d.dia}
                      <div title="Guardias de este profesor ese día (titular, apoyo y sustituto)" style={{ fontSize:13, fontWeight:600, marginTop:2, color: nd >= MAX_GUARDIAS_DIA ? "#fecaca" : "rgba(255,255,255,0.75)" }}>{nd}/{MAX_GUARDIAS_DIA} guardias</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HORAS_GUARDIA.map((hora, i) => (
                <tr key={hora} style={{ background:i%2===0?"#fff":C.light }}>
                  <td style={{ padding:"6px 8px", fontWeight:700, color:C.dark, fontSize:14, whiteSpace:"nowrap" }}>{hora}<div style={{ fontSize:13, fontWeight:500, color:C.gray }}>{HORARIO[hora]}</div></td>
                  {dias.map((d, idx) => {
                    const zona = cuadrante[`${d.key}|${hora}|${profesorSel}`] || "";
                    const zonaObj = ZONAS_CENTRO.find(z => z.id === zona);
                    const apoyo = zona ? apoyosGuardia[`${d.key}|${hora}|${zona}`] || "" : "";
                    const sustituto = zona ? sustitutosGuardia[`${d.key}|${hora}|${zona}`] || "" : "";
                    // Quien ya tiene una guardia a esa hora (titular, apoyo o sustituto) no puede estar en otra
                    const pref = `${d.key}|${hora}|`;
                    const nDia = p => guardiasDelDia(d.key, p, cuadrante, apoyosGuardia, sustitutosGuardia);
                    const lleno = p => nDia(p) >= MAX_GUARDIAS_DIA;
                    const selBloqueado = !zona && lleno(profesorSel);
                    const ocupados = new Set([
                      ...profesores.filter(p => cuadrante[`${pref}${p}`]),
                      ...Object.entries(apoyosGuardia).filter(([k]) => k.startsWith(pref)).map(([, v]) => v),
                      ...Object.entries(sustitutosGuardia).filter(([k]) => k.startsWith(pref)).map(([, v]) => v),
                    ]);
                    
                    return (
                      <td key={idx} style={{ padding:"4px 6px", minWidth: 140 }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                          <select value={zona} onChange={e => setZona(d.key, hora, profesorSel, e.target.value)} disabled={selBloqueado}
                            title={selBloqueado ? `Ya tiene ${MAX_GUARDIAS_DIA} guardias este día` : "Zona de la que es titular"}
                            style={{ width:"100%", padding:"4px 4px", borderRadius:4, border:`1px solid ${zona?"#00B7B5":"#CDE9ED"}`, fontSize:13, background: selBloqueado ? "#EBF0F6" : zona?"#DDF0F4":"#fff", color: selBloqueado ? "#9ca3af" : C.dark, cursor: selBloqueado ? "not-allowed" : "pointer", fontWeight: zona ? 600 : 400 }}>
                            <option value="">{selBloqueado ? `Máx. ${MAX_GUARDIAS_DIA} al día` : "📍 Zona"}</option>
                            {[...EDIFICIOS, "-"].map(ed => {
                              // Las zonas ocultas no se ofrecen, salvo la que ya tiene asignada
                              const zs = ZONAS_CENTRO.filter(z => (z.edificio || "-") === ed && (!z.oculta || z.id === zona));
                              return zs.length > 0 && <optgroup key={ed} label={ed === "-" ? "── Aula / Recreo / Otras" : `── Edificio ${ed}`}>{zs.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}</optgroup>;
                            })}
                          </select>
                          {zona && (
                            <select value={apoyo} onChange={e => setApoyo(d.key, hora, zona, e.target.value)} title={apoyo ? "Profesor de apoyo" : "Falta asignar el profesor de apoyo"}
                              style={{ width:"100%", padding:"4px 4px", borderRadius:4, border:`1px solid ${apoyo ? "#00B7B5" : C.salmon}`, fontSize:13, background: apoyo ? "#e0f7f6" : "#FDF1D9", color: apoyo ? C.dark : "#275D8C", cursor:"pointer", fontWeight: 600 }}>
                              <option value="">⚠️ Falta apoyo</option>
                              {profesores.filter(p => p !== profesorSel && ((!ocupados.has(p) && !lleno(p)) || p === apoyo)).map(p => <option key={p} value={p}>👥 {p} ({nDia(p)})</option>)}
                            </select>
                          )}
                          {zona && (
                            <select value={sustituto} onChange={e => setSustituto(d.key, hora, zona, e.target.value)} title={sustituto ? "Sustituto: entra si falta el titular o el apoyo" : "Falta asignar el sustituto"}
                              style={{ width:"100%", padding:"4px 4px", borderRadius:4, border:`1px solid ${sustituto ? "#2B647E" : C.salmon}`, fontSize:13, background: sustituto ? "#DDF0F4" : "#FDF1D9", color: sustituto ? C.dark : "#275D8C", cursor:"pointer", fontWeight: 600 }}>
                              <option value="">⚠️ Falta sustituto</option>
                              {profesores.filter(p => p !== profesorSel && ((!ocupados.has(p) && !lleno(p)) || p === sustituto)).map(p => <option key={p} value={p}>🔁 {p} ({nDia(p)})</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ marginTop:14, fontSize:14, color:C.gray }}>💾 Los cambios se guardan automáticamente.</div>
          <div style={{ marginTop:8, padding: "10px 12px", background: "#DDF0F4", borderRadius: 8, fontSize: 14, color: C.teal, fontWeight: 600, display: "inline-block" }}>✅ Cambios guardados correctamente</div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// PARTE DEL DÍA (Jefatura)
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// COORDINACIÓN DIARIA DE AUSENCIAS
// ═══════════════════════════════════════════════════════════════════════════
function CoordinacionAusencias({ profesores, ausencias, cuadrante, apoyosGuardia, sustitutosGuardia = {}, coberturas = {}, setCoberturas, HORAS_GUARDIA, ZONAS_CENTRO, C, inpStyle, labelStyle, fechaCoordinacion, setFechaCoordinacion }) {
  
  const diasES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  
  // Obtener ausencias del día seleccionado
  const ausenciasDelDia = ausencias.filter(a => {
    if (!fechaCoordinacion) return false;
    const fechaAus = isoLocal(a.fecha);
    const fechaSel = isoLocal(fechaCoordinacion);
    return fechaAus === fechaSel;
  });
  
  // Obtener guardias del día seleccionado
  const guardiasDia = [];
  if (fechaCoordinacion) {
    const fechaSel = isoLocal(fechaCoordinacion);
    
    HORAS_GUARDIA.forEach(hora => {
      profesores.forEach(profesorGuardia => {
        // Zona asignada a este profesor en esa fecha y hora
        const zona = ZONAS_CENTRO.find(z => z.id === cuadrante[`${fechaSel}|${hora}|${profesorGuardia}`]);
        
        if (zona) {
          const apoyo = apoyosGuardia[`${fechaSel}|${hora}|${zona.id}`] || "";
          const sit = situacionZona({ fecha: fechaSel, hora, zonaId: zona.id, profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias, coberturas });
          guardiasDia.push({
            sit,
            hora,
            zona: zona.label,
            zonaId: zona.id,
            edificio: zona.edificio,
            profesor: profesorGuardia,
            apoyo: apoyo
          });
        }
      });
    });
  }
  
  const equipoCob = { profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias };
  // Agrupar guardias por edificio
  const guardiasEdificios = {};
  guardiasDia.forEach(g => {
    if (!guardiasEdificios[g.edificio]) {
      guardiasEdificios[g.edificio] = [];
    }
    guardiasEdificios[g.edificio].push(g);
  });
  
  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Coordinación Diaria de Ausencias" icono="eventos" /></div>
      
      {/* SELECTOR DE FECHA */}
      <div style={{ background: C.white, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <label style={{ ...labelStyle, fontSize: 14 }}>Selecciona una fecha</label>
        <input type="date" value={fechaCoordinacion} onChange={e => setFechaCoordinacion(e.target.value)} style={inpStyle} />
        {fechaCoordinacion && (
          <div style={{ marginTop: 10, fontSize: 14, color: C.gray }}>
            <Ic n="fecha-hora" tam={20} />{parseISO(fechaCoordinacion).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>
      
      {!fechaCoordinacion ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 40, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><Ic n="fecha-hora" tam={20} /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.dark }}>Selecciona una fecha</div>
          <div style={{ fontSize: 14, color: C.gray, marginTop: 8 }}>Para ver el cuadrante de guardias y ausencias de ese día</div>
        </div>
      ) : (
        <>
          {/* CUADRANTE DE GUARDIAS */}
          <div style={{ background: C.white, borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, color: C.dark, marginBottom: 14, fontSize: 14 }}><Ic n="titular" tam={20} />Cuadrante de Guardias - {parseISO(fechaCoordinacion).toLocaleDateString("es-ES")}</div>
            
            {Object.keys(guardiasEdificios).length === 0 ? (
              <div style={{ color: C.gray, fontSize: 14, padding: 20, textAlign: "center" }}>
                No hay guardias configuradas para este día
              </div>
            ) : (
              Object.entries(guardiasEdificios).map(([edificio, guardias]) => (
                <div key={edificio} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #CDE9ED" }}>
                  <div style={{ fontWeight: 600, color: C.teal, marginBottom: 10, fontSize: 14 }}>
                    🏢 Edificio {edificio} {edificio === "-" ? "- Otros" : ""}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#EBF0F6" }}>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #CDE9ED" }}>Hora</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #CDE9ED" }}>Zona</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #CDE9ED" }}>Titular</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #CDE9ED" }}>Apoyo</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #CDE9ED" }}>Sustituto</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #CDE9ED" }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guardias.map((g, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #CDE9ED" }}>
                          <td style={{ padding: "8px", fontWeight: 600, color: C.dark, whiteSpace: "nowrap" }}>{g.hora}<div style={{ fontSize: 13, fontWeight: 500, color: C.gray }}>{HORARIO[g.hora]}</div></td>
                          <td style={{ padding: "8px", color: "#555" }}>{g.zona}</td>
                          {[[g.sit.titular, g.sit.tA, "titular"], [g.sit.apoyo, g.sit.aA, "apoyo"], [g.sit.sustituto, g.sit.sA, "sustituto"]].map(([p, falta, rol]) => {
                            const entra = rol === "sustituto" && g.sit.sustituyeA;
                            return (
                              <td key={rol} style={{ padding: "8px", color: !p ? "#275D8C" : falta ? C.salmon : (rol === "titular" ? C.teal : "#555"), fontWeight: (rol === "titular" || entra || !p) ? 600 : 400 }}>
                                {p || "⚠️ Sin asignar"}
                                {falta && <span style={{ marginLeft: 6, fontSize: 13, background: "#FDF1D9", color: C.salmon, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>🔴 Ausente</span>}
                                {entra && <div style={{ fontSize: 13, color: "#16333F" }}>🟠 entra por {g.sit.sustituyeA}</div>}
                              </td>
                            );
                          })}
                          <td style={{ padding: "8px" }}>
                            <span style={{ color: ESTADOS_ZONA[g.sit.estado].color, background: ESTADOS_ZONA[g.sit.estado].bg, borderRadius: 8, padding: "2px 8px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{ESTADOS_ZONA[g.sit.estado].label}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
          
          {/* AUSENCIAS Y ASIGNACIONES */}
          <div style={{ background: C.white, borderRadius: 12, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, color: C.dark, marginBottom: 14, fontSize: 14 }}>⚠️ Profesores Ausentes y Sustituciones</div>
            
            {ausenciasDelDia.length === 0 ? (
              <div style={{ color: C.gray, fontSize: 14, padding: 20, textAlign: "center" }}>
                ✅ Sin ausencias registradas para este día
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ausenciasDelDia.map((a, idx) => {
                  
                  return (
                    <div key={idx} style={{ background: "#FDF1D9", borderRadius: 8, padding: 12, borderLeft: "4px solid #F6C862" }}>
                      <div style={{ fontWeight: 600, color: "#d97706", marginBottom: 8 }}><Ic n="por-alumno" tam={20} />{a.profesor} <span style={{ fontSize: 13, color: "#666" }}>({a.motivo})</span></div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, fontSize: 14 }}>
                        <div>
                          <div style={{ color: "#555", marginBottom: 4 }}><Ic n="hora-reloj" tam={20} /><strong>Horas:</strong> {a.horas.join(", ")}</div>
                          {a.aula && <div style={{ color: "#555", marginBottom: 4 }}><Ic n="por-curso" tam={20} /><strong>Aula:</strong> {a.aula}</div>}
                          {a.asignatura && <div style={{ color: "#555", marginBottom: 4 }}><Ic n="aula" tam={20} /><strong>Asignatura:</strong> {a.asignatura}</div>}
                        </div>
                        <div>
                          {a.edificio && <div style={{ color: "#555", marginBottom: 4 }}>🏢 <strong>Edificio:</strong> {a.edificio}</div>}
                          {a.tarea && <div style={{ color: "#555", marginBottom: 4 }}>✏️ <strong>Tarea:</strong> {a.tarea}</div>}
                          {a.ubicacion && <div style={{ color: "#555", marginBottom: 4 }}><Ic n="edificio" tam={20} /><strong>Material:</strong> {a.ubicacion}</div>}
                        </div>
                      </div>
                      
                      {/* QUIÉN CUBRE CADA HORA: sugerencias por prioridad y asignación con un clic */}
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {a.horas.filter(h => h !== "Recreo").sort((x, y) => HORAS.indexOf(x) - HORAS.indexOf(y)).map(h => (
                          <CubrirClase key={h} fecha={isoLocal(fechaCoordinacion)} hora={h} ausencia={a} equipo={equipoCob} coberturas={coberturas} setCoberturas={setCoberturas} puedeAsignar C={C} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


// ─── Horario de clases y «dónde estoy» ───────────────────────────────────────
// horarios: { "Lunes|3ª hora|Profesor": { grupo, aula, edificio, materia } } — se repite cada semana

const MATERIAS_DEMO = ["Matemáticas", "Lengua", "Inglés", "Música", "Geografía e Historia", "Biología", "Física y Química", "Tecnología", "Educación Física", "Plástica", "Francés", "Informática"];
// Horario de ejemplo para la demo: cada profe da su materia en varios grupos (≈3 de cada 5 horas)
function horarioEjemplo(profesores, cursos) {
  const horarios = {};
  if (!cursos.length) return horarios;
  const aulaDe = g => { const gi = cursos.indexOf(g); const ed = EDIFICIOS[gi % EDIFICIOS.length] || "A"; return { aula: `Aula ${ed}${(gi % 2) + 1}.${String(gi + 1).padStart(2, "0")}`, edificio: ed }; };
  const horasClase = HORAS.filter(h => h !== "Recreo" && h !== "7ª hora");
  profesores.forEach((p, i) => {
    DIAS_SEMANA.forEach((dia, d) => {
      horasClase.forEach((hora, hi) => {
        if ((i * 7 + d * 3 + hi) % 5 >= 3) return; // hora libre
        const grupo = cursos[(i * 5 + d * 2 + hi) % cursos.length];
        horarios[`${dia}|${hora}|${p}`] = { grupo, ...aulaDe(grupo), materia: MATERIAS_DEMO[i % MATERIAS_DEMO.length] };
      });
    });
  });
  return horarios;
}
const textoLugar = l => l ? [l.grupo, l.aula, l.edificio && `Edificio ${l.edificio}`].filter(Boolean).join(" · ") : "";
// Dónde está un profe a una hora: primero la clase que cubre, luego su guardia y por último su horario
function dondeEsta({ fecha, hora, profesor, horarios = {}, coberturas = {}, equipo }) {
  if (!hora || !profesor) return null;
  const a = claseQueCubre(fecha, hora, profesor, coberturas, equipo.ausencias || []);
  if (a) return { origen: "cobertura", detalle: `Cubres la clase de ${a.profesor}`, grupo: a.aula || "", aula: "", edificio: a.edificio || "" };
  const g = guardiasDeProfesor({ fecha, profesor, ...equipo, coberturas }).find(x => x.hora === hora);
  if (g) return { origen: "guardia", detalle: `De guardia (${g.rol})`, grupo: "", aula: g.zona, edificio: g.edificio && g.edificio !== "-" ? g.edificio : "" };
  const h = horarios[`${DIAS_ES[parseISO(fecha).getDay()]}|${hora}|${profesor}`];
  if (h) return { origen: "horario", detalle: h.materia ? `Clase de ${h.materia}` : "Según tu horario", grupo: h.grupo, aula: h.aula, edificio: h.edificio };
  return null;
}
const URGENTES = ["Alumno enfermo", "Emergencia", "Urgencia en aula"];

// ─── Avisos de mensajes en cualquier pantalla ────────────────────────────────
// Sonido de alarma sin ficheros: tres pitidos con Web Audio (si el navegador lo permite)
function sonarAlarma() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.28);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* sin sonido */ }
  try { navigator.vibrate?.([300, 150, 300, 150, 600]); } catch { /* sin vibración */ }
}
const RESPUESTAS = { voy: { txt: "va de camino", icono: "🏃", color: "#275D8C", bg: "#DDF0F4" }, no: { txt: "no puede ir", icono: "✋", color: "#16333F", bg: "#FDF1D9" } };
// Los demás destinatarios del mismo aviso (se envió a la vez a varios)
const hermanosDe = (m, mensajes) => mensajes.filter(x => x.id !== m.id && x.remitente === m.remitente && (m.aviso ? x.aviso === m.aviso : x.ts === m.ts));

function AvisosMensajes({ mensajes, usuario, onActualizar, onAbrir, C }) {
  const [ocultos, setOcultos] = useState([]); // avisos normales cerrados (siguen sin leer en el historial)
  const urgentes = mensajes.filter(m => m.destinatario === usuario && m.urgente && !m.leido);
  const nuevos = mensajes.filter(m => m.destinatario === usuario && !m.urgente && !m.leido && !ocultos.includes(m.id));
  const respuestas = mensajes.filter(m => m.remitente === usuario && m.respuesta && !m.respuestaVista);
  // Sonido y vibración cuando llega un aviso urgente nuevo
  const vistos = useRef(new Set(urgentes.map(m => m.id)));
  useEffect(() => {
    const hayNuevo = urgentes.some(m => !vistos.current.has(m.id));
    urgentes.forEach(m => vistos.current.add(m.id));
    if (hayNuevo) sonarAlarma();
  }, [urgentes]);
  const ahora = () => new Date().toISOString();
  const hora = ts => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const u = urgentes[0];
  const toast = { position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 2100, width: "min(560px, calc(100% - 24px))", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.25)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
  const btn = { border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 800, cursor: "pointer", fontSize: 14 };
  return (<>
    {/* Respuestas a mis avisos */}
    {respuestas.length > 0 && (() => {
      const r = respuestas[0], R = RESPUESTAS[r.respuesta.tipo];
      return (
        <div role="status" style={{ ...toast, top: 12, background: R.bg, border: `2px solid ${R.color}` }}>
          <div style={{ flex: "1 1 260px", color: R.color, fontWeight: 800, fontSize: 15 }}>
            {R.icono} {r.destinatario} {R.txt}
            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Respuesta a tu aviso de las {hora(r.ts)} · {hora(r.respuesta.ts)}{respuestas.length > 1 ? ` · y ${respuestas.length - 1} respuesta(s) más` : ""}</div>
          </div>
          <button onClick={() => onActualizar(r.id, { respuestaVista: true })} style={{ ...btn, background: R.color, color: "#fff" }}>Entendido</button>
        </div>
      );
    })()}

    {/* Mensajes normales nuevos */}
    {!u && nuevos.length > 0 && respuestas.length === 0 && (() => {
      const m = nuevos[0];
      return (
        <div role="status" style={{ ...toast, top: 12, background: "#fff", border: `2px solid ${C.blue}` }}>
          <Icono nombre="mensaje-recibido" tam={32} />
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: C.dark, fontSize: 14 }}>💬 {nuevos.length > 1 ? `${nuevos.length} mensajes nuevos` : "Mensaje nuevo"} de {m.remitente}</div>
            <div style={{ fontSize: 14, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.lugar ? `📍 ${textoLugar(m.lugar)} · ` : ""}{m.texto}</div>
          </div>
          <button onClick={() => onAbrir()} style={{ ...btn, background: C.blue, color: "#fff" }}>Ver</button>
          <button onClick={() => setOcultos(o => [...o, ...nuevos.map(x => x.id)])} aria-label="Cerrar aviso" style={{ ...btn, background: "transparent", color: C.gray }}>✕</button>
        </div>
      );
    })()}

    {/* Aviso urgente a pantalla completa */}
    {u && (() => {
      const otros = hermanosDe(u, mensajes);
      const yaVan = otros.filter(x => x.respuesta?.tipo === "voy");
      const responder = tipo => onActualizar(u.id, { leido: true, leidoTs: ahora(), ...(tipo ? { respuesta: { tipo, ts: ahora() } } : {}) });
      return (
        <div role="alertdialog" aria-modal="true" aria-labelledby="aviso-urgente-titulo" style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(127,29,29,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(520px, 100%)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
            <div style={{ background: "#275D8C", color: "#fff", padding: "16px 20px" }}>
              <div id="aviso-urgente-titulo" style={{ fontSize: 22, fontWeight: 900 }}>🚨 AVISO URGENTE</div>
              <div style={{ fontSize: 14, opacity: .9 }}>De {u.remitente} · {hora(u.ts)}{urgentes.length > 1 ? ` · ${urgentes.length - 1} aviso(s) más esperando` : ""}</div>
            </div>
            <div style={{ padding: 20 }}>
              {u.lugar && <div style={{ fontSize: 22, fontWeight: 900, color: "#275D8C", marginBottom: 10 }}>📍 {textoLugar(u.lugar)}</div>}
              <div style={{ fontSize: 17, color: C.dark, marginBottom: 12 }}>{u.texto}</div>
              {otros.length > 0 && (
                <div style={{ fontSize: 14, color: C.gray, marginBottom: 12 }}>
                  También avisado/a: {otros.map(x => x.destinatario).join(", ")}
                  {yaVan.length > 0 && <div style={{ color: "#275D8C", fontWeight: 800, marginTop: 4 }}>🏃 {yaVan.map(x => x.destinatario).join(", ")} ya va de camino</div>}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <button onClick={() => responder("voy")} style={{ ...btn, background: "#275D8C", color: "#fff", fontSize: 18, padding: "16px" }}>🏃 Voy</button>
                <button onClick={() => responder("no")} style={{ ...btn, background: "#FDF1D9", color: "#16333F", fontSize: 15, padding: "16px" }}>✋ No puedo</button>
              </div>
              <button onClick={() => responder(null)} style={{ ...btn, background: "transparent", color: C.gray, width: "100%", marginTop: 8, fontWeight: 600 }}>Cerrar sin responder</button>
            </div>
          </div>
        </div>
      );
    })()}
  </>);
}

// ═══════════════════════════════════════════════════════════════════════════
// GALVÁNGRAM - MENSAJERÍA RÁPIDA
// ═══════════════════════════════════════════════════════════════════════════
const ICONO_CARGO = { profesor: "cargo-profesor", jefatura: "cargo-jefatura", direccion: "cargo-direccion", secretaria: "cargo-secretaria", tic: "cargo-tic", orientacion: "tutor" };
const ICONO_MENSAJE = { "Alumno enfermo": "alumno-enfermo", "Emergencia": "emergencia", "Urgencia en aula": "emergencia", "Falta material": "falta-material",
  "Alumno derivado": "alumno-derivado", "Cambio de guardia": "sustituto", "Falta un profesor": "profe-ausente", "Reunión importante": "eventos" };
function Galvangramm({ vistaInicial = "enviar", mensajes, setMensajes, usuario, esJefatura, profesores, horarios = {}, cursos = [], cuadrante = {}, apoyosGuardia = {}, sustitutosGuardia = {}, ausencias = [], coberturas = {}, C, inpStyle, selStyle, labelStyle }) {
  // ¿Dónde estás? «auto» (según tu horario, guardia o clase que cubres) o «mano»
  const hoyISO = isoLocal();
  const [modoLugar, setModoLugar] = useState("auto");
  const [horaLugar, setHoraLugar] = useState(() => horaEnCurso() || "1ª hora");
  const [lugarMano, setLugarMano] = useState({ grupo: "", aula: "", edificio: "" });
  const equipoLugar = { profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias };
  const lugarAuto = esLectivo(new Date()) ? dondeEsta({ fecha: hoyISO, hora: horaLugar, profesor: usuario, horarios, coberturas, equipo: equipoLugar }) : null;
  const hayHorarios = Object.keys(horarios).length > 0;
  const aulasConocidas = [...new Set(Object.values(horarios).map(h => h.aula).filter(Boolean))].sort();
  const lugar = modoLugar === "auto" ? lugarAuto : (lugarMano.grupo || lugarMano.aula || lugarMano.edificio ? { origen: "mano", ...lugarMano } : null);
  const [destinatarios, setDestinatarios] = useState([]); // se puede avisar a varios (p. ej. a la pareja de guardia de una zona)
  const alternarDest = p => setDestinatarios(d => d.includes(p) ? d.filter(x => x !== p) : [...d, p]);
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [tab, setTab] = useState(vistaInicial); // "enviar" o "historial"
  // Al abrir el historial, los mensajes recibidos quedan leídos (los urgentes se leen al responder)
  useEffect(() => {
    if (tab !== "historial") return;
    if (!mensajes.some(m => m.destinatario === usuario && !m.leido && !m.urgente)) return;
    const ts = new Date().toISOString();
    setMensajes(prev => prev.map(m => m.destinatario === usuario && !m.leido && !m.urgente ? { ...m, leido: true, leidoTs: ts } : m));
  }, [tab, mensajes, usuario, setMensajes]);
  const responderEn = (id, tipo) => { const ts = new Date().toISOString(); setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true, leidoTs: m.leidoTs || ts, respuesta: { tipo, ts } } : m)); };
  const horaC = ts => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  
  const mensajesPredefinidos = esJefatura ? [
    { id: 1, label: "Cambio de guardia", texto: "Necesito que cambies tu turno de guardia" },
    { id: 2, label: "Falta un profesor", texto: "Falta un profesor, necesito cobertura" },
    { id: 3, label: "Urgencia en aula", texto: "Hay una urgencia en el aula, ven rápido" },
    { id: 4, label: "Reunión importante", texto: "Necesito verte en despacho urgentemente" },
  ] : [
    { id: 1, label: "Alumno enfermo", texto: "Tengo un alumno enfermo en clase" },
    { id: 2, label: "Emergencia", texto: "Hay una emergencia en el aula" },
    { id: 3, label: "Falta material", texto: "Necesito material urgente" },
    { id: 4, label: "Alumno derivado", texto: "Envío alumno a jefatura" },
  ];
  
  const handleEnviar = () => {
    const tipoLabel = mensajesPredefinidos.find(m => m.id === tipoMensaje)?.label || "";
    const urgente = URGENTES.includes(tipoLabel);
    if (urgente && !lugar) {
      alert("📍 En un aviso urgente hay que indicar dónde estás (aula, edificio o grupo).");
      return;
    }
    if (!destinatarios.length) {
      alert("Elige a quién va el mensaje");
      return;
    }
    
    // El texto escrito (o el del mensaje rápido elegido, que se copia al cuadro de texto)
    const textoFinal = mensajePersonalizado.trim() || (mensajesPredefinidos.find(m => m.id === tipoMensaje)?.texto || "");
    
    if (!textoFinal.trim()) {
      alert("Escribe un mensaje");
      return;
    }
    
    const base = Date.now(), tsEnvio = new Date(base).toISOString();
    const nuevos = destinatarios.map((dest, i) => ({
      id: base + i,
      aviso: base, // mismo aviso enviado a varios
      remitente: usuario,
      destinatario: dest,
      conCopia: destinatarios.filter(d => d !== dest),
      texto: textoFinal,
      ts: tsEnvio,
      leido: false,
      urgente,
      lugar: lugar ? { grupo: lugar.grupo || "", aula: lugar.aula || "", edificio: lugar.edificio || "", origen: lugar.origen, hora: modoLugar === "auto" ? horaLugar : "" } : null,
    }));
    
    setMensajes(prev => [...nuevos, ...prev]);
    setDestinatarios([]);
    setTipoMensaje("");
    setMensajePersonalizado("");
    setLugarMano({ grupo: "", aula: "", edificio: "" });
    const para = destinatarios.join(", ");
    alert(MODO_DEMO
      ? `✅ Mensaje enviado a ${para}.\n\nEn la demo, para ver cómo le llega: pulsa «Salir» y, en «Entrar como otro profe del claustro», elige a ${destinatarios.length > 1 ? "uno de ellos" : para}.`
      : `✅ Mensaje enviado a ${para}.`);
  };
  
  const mensajesNoLeidos = mensajes.filter(m => !m.leido && m.destinatario === usuario).length;
  // Cada uno ve solo lo que envía y lo que recibe
  const misMensajes = mensajes.filter(m => m.remitente === usuario || m.destinatario === usuario);
  
  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Galvángram" icono="mensajes" /></div>
      
      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: `2px solid ${C.light}` }}>
        <button 
          onClick={() => setTab("enviar")}
          style={{ 
            padding: "10px 16px", 
            background: "none", 
            border: "none", 
            borderBottom: tab === "enviar" ? `3px solid ${C.blue}` : "none",
            color: tab === "enviar" ? C.blue : C.gray,
            fontWeight: tab === "enviar" ? 700 : 500,
            cursor: "pointer",
            fontSize: 14
          }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="mensaje-enviar" tam={28} />Enviar Mensaje</span>
        </button>
        <button 
          onClick={() => setTab("historial")}
          style={{ 
            padding: "10px 16px", 
            background: "none", 
            border: "none", 
            borderBottom: tab === "historial" ? `3px solid ${C.blue}` : "none",
            color: tab === "historial" ? C.blue : C.gray,
            fontWeight: tab === "historial" ? 700 : 500,
            cursor: "pointer",
            fontSize: 14,
            position: "relative"
          }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="historial" tam={28} />Historial</span>
          {mensajesNoLeidos > 0 && (
            <div style={{ position: "absolute", top: 0, right: 0, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
              {mensajesNoLeidos}
            </div>
          )}
        </button>
      </div>
      
      {/* ENVIAR MENSAJE */}
      {tab === "enviar" && (
        <div style={{ background: C.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="mensajes" tam={30} />Tipo de Mensaje</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {mensajesPredefinidos.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setTipoMensaje(m.id); setMensajePersonalizado(m.texto); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `2px solid ${tipoMensaje === m.id ? C.blue : C.light}`,
                    background: tipoMensaje === m.id ? "#DDF0F4" : "#fff",
                    color: C.dark,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: tipoMensaje === m.id ? 600 : 400,
                    textAlign: "left", display: "flex", alignItems: "center", gap: 10
                  }}>
                  <Icono nombre={ICONO_MENSAJE[m.label] || "mensajes"} tam={34} />{m.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="mensaje-personalizado" tam={30} />Mensaje Personalizado</label>
            <textarea 
              value={mensajePersonalizado}
              onChange={e => setMensajePersonalizado(e.target.value)}
              placeholder="O escribe tu propio mensaje..."
              style={{ ...inpStyle, minHeight: 80, fontFamily: "inherit" }}
            />
          </div>
          
          {/* ¿DÓNDE ESTÁS? — según el horario o a mano */}
          {(() => {
            const tipoLabel = mensajesPredefinidos.find(m => m.id === tipoMensaje)?.label || "";
            const urgente = URGENTES.includes(tipoLabel);
            const pill = activo => ({ flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700,
              border: `2px solid ${activo ? C.blue : C.light}`, background: activo ? "#DDF0F4" : "#fff", color: activo ? C.blue : C.gray });
            const ORIGEN = { cobertura: "📋 Clase que cubres (asignada por jefatura)", guardia: "🔄 Tu guardia de esta hora", horario: "📅 Tu horario de clases" };
            return (
              <div style={{ marginBottom: 16, background: urgente && !lugar ? "#FDF1D9" : C.light, border: `2px solid ${urgente ? (lugar ? C.teal : C.salmon) : "transparent"}`, borderRadius: 10, padding: 14 }}>
                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Icono nombre="aula" tam={30} />📍 ¿Dónde estás?{urgente && <span style={{ color: C.salmon, fontSize: 14 }}> · obligatorio en avisos urgentes</span>}
                </label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <button type="button" onClick={() => setModoLugar("auto")} style={pill(modoLugar === "auto")}>📅 Según mi horario</button>
                  <button type="button" onClick={() => setModoLugar("mano")} style={pill(modoLugar === "mano")}>✏️ A mano</button>
                </div>
                {modoLugar === "auto" ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 14, color: C.gray }}>
                      Hora:
                      <select value={horaLugar} onChange={e => setHoraLugar(e.target.value)} style={{ ...selStyle, width: "auto", padding: "6px 10px", fontSize: 14 }}>
                        {HORAS.map(h => <option key={h} value={h}>{conTramo(h)}{h === horaEnCurso() ? " · ahora" : ""}</option>)}
                      </select>
                    </div>
                    {lugarAuto ? (
                      <div style={{ background: "#fff", border: `1px solid ${C.teal}`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, color: C.gray, fontWeight: 700 }}>{ORIGEN[lugarAuto.origen]} · {lugarAuto.detalle}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginTop: 2 }}>📍 {textoLugar(lugarAuto)}</div>
                      </div>
                    ) : (
                      <div style={{ background: "#fff", border: `1px dashed ${C.salmon}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.dark }}>
                        {!esLectivo(new Date()) ? "Hoy no es día lectivo." : !hayHorarios ? "Todavía no hay horarios de clase cargados." : "A esa hora no tienes clase ni guardia en tu horario."}
                        {" "}<button type="button" onClick={() => setModoLugar("mano")} style={{ border: "none", background: "none", color: C.blue, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 14 }}>Escríbelo a mano →</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.gray, fontWeight: 700, marginBottom: 4 }}>AULA</div>
                      <input list="rumbo-aulas" value={lugarMano.aula} onChange={e => setLugarMano(l => ({ ...l, aula: e.target.value }))} placeholder="Ej.: Aula A1.03, Laboratorio…" style={inpStyle} />
                      <datalist id="rumbo-aulas">{aulasConocidas.map(a => <option key={a} value={a} />)}</datalist>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: C.gray, fontWeight: 700, marginBottom: 4 }}>EDIFICIO</div>
                      <select value={lugarMano.edificio} onChange={e => setLugarMano(l => ({ ...l, edificio: e.target.value }))} style={selStyle}>
                        <option value="">—</option>
                        {EDIFICIOS.map(e => <option key={e} value={e}>Edificio {e}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: C.gray, fontWeight: 700, marginBottom: 4 }}>GRUPO</div>
                      <select value={lugarMano.grupo} onChange={e => setLugarMano(l => ({ ...l, grupo: e.target.value }))} style={selStyle}>
                        <option value="">—</option>
                        {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ¿A QUIÉN AVISAR? — profesorado de guardia por zonas en esa hora */}
          {(() => {
            const pref = `${hoyISO}|${horaLugar}|`;
            const ids = [...new Set([
              ...profesores.map(p => cuadrante[`${pref}${p}`]).filter(Boolean),
              ...[apoyosGuardia, sustitutosGuardia].flatMap(m => Object.keys(m).filter(k => k.startsWith(pref) && m[k]).map(k => k.split("|")[2])),
            ])];
            const miEdificio = lugar?.edificio || "";
            const zonasG = ids.map(zonaId => {
              const z = ZONAS_CENTRO.find(z => z.id === zonaId);
              const sit = situacionZona({ fecha: hoyISO, hora: horaLugar, zonaId, ...equipoLugar, coberturas });
              const cerca = !!miEdificio && z?.edificio === miEdificio;
              return { zonaId, nombre: z?.label || zonaId, tipo: z?.tipo, cerca, sit };
            }).sort((a, b) => (b.cerca - a.cerca) || ((a.tipo === "aula") - (b.tipo === "aula")) || a.nombre.localeCompare(b.nombre));
            const rol = (sit, p) => p === sit.titular ? "Titular" : p === sit.apoyo ? "Pareja" : sit.sustituyeA ? `Sustituto · entra por ${sit.sustituyeA}` : "Sustituto · en reserva, libre";
            const chip = (p, activo, ocupado) => ({
              display: "inline-flex", flexDirection: "column", alignItems: "flex-start", padding: "6px 10px", borderRadius: 8, cursor: ocupado ? "default" : "pointer", textAlign: "left",
              border: `2px solid ${activo ? C.blue : "#d6d3d1"}`, background: activo ? "#DDF0F4" : ocupado ? C.light : "#fff", opacity: ocupado ? .65 : 1,
            });
            return (
              <div style={{ marginBottom: 16, background: C.light, borderRadius: 10, padding: 14 }}>
                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Icono nombre="guardias" tam={30} />¿A quién avisar?
                </label>
                <div style={{ fontSize: 14, color: C.gray, marginBottom: 10 }}>
                  Profesorado de guardia a {conTramo(horaLugar)}{esLectivo(new Date()) ? "" : " (hoy no es lectivo)"}. Toca un nombre para enviárselo{miEdificio ? <>; primero, la zona de <strong>tu edificio ({miEdificio})</strong></> : ""}.
                </div>
                {zonasG.length === 0 ? (
                  <div style={{ fontSize: 14, color: C.gray, background: "#fff", borderRadius: 8, padding: 10 }}>No hay guardias en el cuadrante para esta hora. Elige el destinatario en la lista de abajo.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", marginBottom: 12 }}>
                    {zonasG.map(z => {
                      const e = ESTADOS_ZONA[z.sit.estado];
                      const disponibles = z.sit.enZona.filter(p => p !== usuario);
                      const s2 = z.sit;
                      const reserva = s2.sustituto && !s2.sA && !s2.sustituyeA && !s2.enClase?.[s2.sustituto] && s2.sustituto !== usuario ? s2.sustituto : null;
                      const faltan = [[s2.titular, s2.tA], [s2.apoyo, s2.aA], [s2.sustituto, s2.sA]].filter(([p, f]) => p && f).map(([p]) => p);
                      const todos = disponibles.length > 0 && disponibles.every(p => destinatarios.includes(p));
                      const ocupados = Object.entries(z.sit.enClase || {});
                      return (
                        <div key={z.zonaId} style={{ background: "#fff", borderRadius: 10, padding: 10, border: `2px solid ${z.cerca ? C.teal : "transparent"}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>{z.cerca ? "⭐ " : ""}{z.nombre}</span>
                            <span style={{ color: e.color, background: e.bg, borderRadius: 6, padding: "1px 6px", fontWeight: 700, fontSize: 13 }}>{e.label}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {disponibles.map(p => (
                              <button key={p} type="button" onClick={() => alternarDest(p)} style={chip(p, destinatarios.includes(p), false)}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{destinatarios.includes(p) ? "✓ " : ""}{p}</span>
                                <span style={{ fontSize: 13, color: C.gray, fontWeight: 600 }}>{rol(z.sit, p)}</span>
                              </button>
                            ))}
                            {reserva && (
                              <button type="button" onClick={() => alternarDest(reserva)} style={{ ...chip(reserva, destinatarios.includes(reserva), false), borderStyle: destinatarios.includes(reserva) ? "solid" : "dashed" }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{destinatarios.includes(reserva) ? "✓ " : ""}{reserva}</span>
                                <span style={{ fontSize: 13, color: C.gray, fontWeight: 600 }}>{rol(s2, reserva)}</span>
                              </button>
                            )}
                            {ocupados.map(([p, clase]) => (
                              <span key={p} style={chip(p, false, true)} title="Está cubriendo una clase">
                                <span style={{ fontSize: 14, fontWeight: 700, color: C.gray }}>{p}</span>
                                <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>Ocupado · cubre {clase}</span>
                              </span>
                            ))}
                            {disponibles.length === 0 && ocupados.length === 0 && <span style={{ fontSize: 14, color: C.salmon, fontWeight: 700 }}>Nadie en la zona</span>}
                          </div>
                          {faltan.length > 0 && <div style={{ fontSize: 13, color: C.salmon, marginTop: 6 }}>Falta: {faltan.join(", ")}</div>}
                          {disponibles.length > 1 && (
                            <button type="button" onClick={() => setDestinatarios(d => todos ? d.filter(x => !disponibles.includes(x)) : [...new Set([...d, ...disponibles])])}
                              style={{ marginTop: 8, border: "none", background: "transparent", color: C.blue, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0 }}>
                              {todos ? "Quitar a la zona" : "📣 Avisar a la zona"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: C.gray, fontWeight: 700 }}>Otro destinatario:</span>
                  <select value="" onChange={e => { if (e.target.value) alternarDest(e.target.value); }} style={{ ...selStyle, width: "auto", flex: "1 1 200px" }}>
                    <option value="">— Añadir a cualquier profesor/a —</option>
                    {profesores.filter(p => p !== usuario && !destinatarios.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 10, fontSize: 14, color: C.dark }}>
                  <strong>Para:</strong>{" "}
                  {destinatarios.length === 0 ? <span style={{ color: C.gray }}>nadie todavía</span> : destinatarios.map(p => (
                    <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#DDF0F4", color: C.blue, borderRadius: 14, padding: "2px 8px", margin: "2px 4px 2px 0", fontWeight: 700, fontSize: 14 }}>
                      {p}<button type="button" onClick={() => alternarDest(p)} style={{ border: "none", background: "transparent", color: C.blue, cursor: "pointer", fontWeight: 800, padding: 0 }} aria-label={`Quitar a ${p}`}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <button
            onClick={handleEnviar}
            style={{
              width: "100%",
              padding: "12px",
              background: C.blue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer"
            }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Icono nombre="boton-enviar" tam={28} />Enviar Mensaje</span>
          </button>
        </div>
      )}
      
      {/* HISTORIAL */}
      {tab === "historial" && (
        <div style={{ background: C.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          {misMensajes.length === 0 ? (
            <div style={{ textAlign: "center", color: C.gray, padding: 40 }}>
              <Icono nombre="mensajes" tam={72} style={{ margin: "0 auto 10px" }} />
              <div>Sin mensajes</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {misMensajes.map(m => (
                <div key={m.id} style={{ background: m.destinatario === usuario ? "#DDF0F4" : "#FDF1D9", borderRadius: 10, padding: 12, borderLeft: `4px solid ${m.destinatario === usuario ? C.teal : C.blue}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: C.dark, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <Icono nombre={m.remitente === usuario ? "boton-enviar" : (m.leido ? "mensaje-leido" : "mensaje-recibido")} tam={28} />
                      {m.remitente === usuario ? "A: " : "De: "}{m.remitente === usuario ? m.destinatario : m.remitente}
                      {m.conCopia?.length > 0 && <span style={{ fontSize: 13, color: C.gray, fontWeight: 500 }}>· también a {m.conCopia.join(", ")}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: C.gray, display: "flex", alignItems: "center", gap: 5 }}>
                      <Icono nombre="hora-mensaje" tam={20} />
                      {new Date(m.ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {m.lugar && (
                    <div style={{ marginBottom: 6, padding: "6px 10px", borderRadius: 8, fontWeight: 800, fontSize: m.urgente ? 15 : 13,
                      background: m.urgente ? "#FDF1D9" : "#fff", color: m.urgente ? "#275D8C" : C.dark, border: `1px solid ${m.urgente ? C.salmon : C.light}` }}>
                      {m.urgente ? "🚨 " : ""}📍 {textoLugar(m.lugar)}
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.gray }}>{m.lugar.origen === "mano" ? " · indicado a mano" : ` · según ${m.lugar.origen === "horario" ? "su horario" : m.lugar.origen === "guardia" ? "su guardia" : "la clase que cubre"}${m.lugar.hora ? ` (${m.lugar.hora})` : ""}`}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>
                    {m.texto}
                  </div>
                  {/* Recibido: responder a un aviso urgente o ver lo que respondí */}
                  {m.destinatario === usuario && m.urgente && !m.respuesta && (
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => responderEn(m.id, "voy")} style={{ border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, cursor: "pointer", background: "#275D8C", color: "#fff" }}>🏃 Voy</button>
                      <button onClick={() => responderEn(m.id, "no")} style={{ border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, cursor: "pointer", background: "#FDF1D9", color: "#16333F" }}>✋ No puedo</button>
                    </div>
                  )}
                  {m.destinatario === usuario && m.respuesta && (
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: RESPUESTAS[m.respuesta.tipo].color }}>Respondiste: {RESPUESTAS[m.respuesta.tipo].icono} {m.respuesta.tipo === "voy" ? "Voy" : "No puedo"} · {horaC(m.respuesta.ts)}</div>
                  )}
                  {/* Enviado: estado del mensaje */}
                  {m.remitente === usuario && (
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, display: "inline-block", borderRadius: 6, padding: "2px 8px",
                      color: m.respuesta ? RESPUESTAS[m.respuesta.tipo].color : m.leido ? C.blue : C.gray, background: m.respuesta ? RESPUESTAS[m.respuesta.tipo].bg : "transparent" }}>
                      {m.respuesta ? `${RESPUESTAS[m.respuesta.tipo].icono} ${m.destinatario} ${RESPUESTAS[m.respuesta.tipo].txt} · ${horaC(m.respuesta.ts)}`
                        : m.leido ? `✓✓ Leído${m.leidoTs ? ` · ${horaC(m.leidoTs)}` : ""}` : "✓ Enviado · sin leer"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function ParteDia({ profesores, cuadrante, apoyosGuardia = {}, sustitutosGuardia = {}, ausencias, coberturas = {}, C }) {
  const hoy      = new Date();
  const diasES   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const diaHoy   = diasES[hoy.getDay()];
  const fechaHoy = isoLocal(hoy);
  const ausHoy   = ausencias.filter(a => isoLocal(a.fecha) === fechaHoy);

  const asignaciones = [];
  HORAS_GUARDIA.forEach(hora => {
    profesores.forEach(prof => {
      const zona = cuadrante[`${fechaHoy}|${hora}|${prof}`];
      if (!zona) return;
      const z = ZONAS_CENTRO.find(z => z.id === zona);
      const sit = situacionZona({ fecha: fechaHoy, hora, zonaId: zona, profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias, coberturas });
      asignaciones.push({ hora, zona: z?.label || zona, sit, estado: sit.estado });
    });
  });

  const porHora = HORAS_GUARDIA.map(hora => ({ hora, items:asignaciones.filter(a=>a.hora===hora) })).filter(h=>h.items.length>0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo={`Parte del Día — ${diaHoy}`} icono="estado-general" /></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12, marginBottom:16 }}>
        {[
          { label:"Zonas de guardia",   value:asignaciones.length,                                   color:C.dark   },
          { label:"Completas",          value:asignaciones.filter(a=>a.estado==="completa").length,    color:C.teal   },
          { label:"Entra el sustituto", value:asignaciones.filter(a=>a.estado==="sustituto").length,   color:C.amber  },
          { label:"Solo 1 profesor",    value:asignaciones.filter(a=>a.estado==="una").length,         color:"#a16207" },
          { label:"Descubiertas",       value:asignaciones.filter(a=>a.estado==="descubierta").length, color:C.salmon },
        ].map(s => (
          <div key={s.label} style={{ background:C.white, borderRadius:10, padding:14, textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderTop:`4px solid ${s.color}` }}>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:13, color:C.gray, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {ausHoy.length > 0 && (
        <div style={{ background:"#FDF1D9", border:`1px solid ${C.salmon}`, borderRadius:10, padding:12, marginBottom:16, fontSize:14 }}>
          <strong style={{ color:C.salmon }}>⚠️ Ausencias notificadas hoy:</strong>
          {ausHoy.map(a => (
            <div key={a.id} style={{ marginTop:4, color:C.dark }}>· {a.profesor} — {a.horas.join(", ")} — {a.motivo}{a.tarea&&<span style={{color:C.gray}}> · Tarea: {a.tarea.slice(0,50)}</span>}</div>
          ))}
        </div>
      )}
      {porHora.length === 0 ? (
        <div style={{ background:C.white, borderRadius:12, padding:30, textAlign:"center", color:C.gray, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          No hay guardias configuradas para hoy.<br/><span style={{fontSize:14}}>Ve a <strong>Cuadrante Guardias</strong> para asignar zonas.</span>
        </div>
      ) : porHora.map(({ hora, items }) => (
        <div key={hora} style={{ background:C.white, borderRadius:12, marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <div style={{ background:hora==="Recreo"?C.blue:C.dark, color:"#fff", padding:"10px 16px", fontWeight:700, fontSize:14 }}>
            <Ic n={hora==="Recreo" ? "guardias" : "hora-reloj"} tam={22} />{conTramo(hora)}
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:C.light }}>
              <th style={{ padding:"7px 16px", textAlign:"left", fontSize:14, color:C.gray, fontWeight:600 }}>Zona</th>
              <th style={{ padding:"7px 16px", textAlign:"left", fontSize:14, color:C.gray, fontWeight:600 }}>Titular</th>
              <th style={{ padding:"7px 16px", textAlign:"left", fontSize:14, color:C.gray, fontWeight:600 }}>Apoyo</th>
              <th style={{ padding:"7px 16px", textAlign:"left", fontSize:14, color:C.gray, fontWeight:600 }}>Sustituto</th>
              <th style={{ padding:"7px 16px", textAlign:"center", fontSize:14, color:C.gray, fontWeight:600 }}>Estado</th>
            </tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${C.cream}` }}>
                  <td style={{ padding:"10px 16px", fontSize:14, color:C.dark }}>{item.zona}</td>
                  {[[item.sit.titular, item.sit.tA, "titular"], [item.sit.apoyo, item.sit.aA, "apoyo"], [item.sit.sustituto, item.sit.sA, "sustituto"]].map(([p, falta, rol]) => {
                    const entra = rol === "sustituto" && item.sit.sustituyeA;
                    return (
                      <td key={rol} style={{ padding:"10px 16px", fontSize:14, color: !p ? "#275D8C" : falta ? C.salmon : C.dark, textDecoration: falta ? "line-through" : "none", fontWeight: entra ? 700 : 400 }}>
                        {p || "⚠️ Sin asignar"}{entra && <div style={{ fontSize:13, color:"#16333F", textDecoration:"none" }}>entra por {item.sit.sustituyeA}</div>}
                      </td>
                    );
                  })}
                  <td style={{ padding:"10px 16px", textAlign:"center" }}>
                    <span style={{ color:ESTADOS_ZONA[item.estado].color, background:ESTADOS_ZONA[item.estado].bg, borderRadius:8, padding:"3px 8px", fontWeight:700, fontSize:14, whiteSpace:"nowrap" }}>{ESTADOS_ZONA[item.estado].label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AHORA — la hora en curso de un vistazo (profesorado y jefatura)
// ════════════════════════════════════════════════════════════════════════════
// Minutos desde medianoche de "8:30"
const aMinutos = t => { const [h, m] = String(t).trim().split(":").map(Number); return h * 60 + m; };
const tramoMin = hora => (HORARIO[hora] || "0:00 – 0:00").split("–").map(aMinutos);
// Siguiente hora del horario a partir de un momento (o null si ya ha terminado la jornada)
function horaSiguiente(ahora = new Date()) {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  return HORAS.find(h => tramoMin(h)[0] > min) || null;
}
const ORDEN_ESTADO = { descubierta: 0, una: 1, sustituto: 2, completa: 3 };

// Equipo de una zona: titular, apoyo (pareja) y sustituto, con quién falta y quién entra
function EquipoZona({ sit, C }) {
  const filas = [
    { rol: "Titular", p: sit.titular, falta: sit.tA },
    { rol: "Apoyo (pareja)", p: sit.apoyo, falta: sit.aA },
    { rol: "Sustituto", p: sit.sustituto, falta: sit.sA, entra: sit.sustituyeA },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 6, marginTop: 6 }}>
      {filas.map(f => {
        const estado = !f.p ? { txt: "Sin asignar", color: "#275D8C", bg: "#FDF1D9" }
          : f.falta ? { txt: "Falta", color: C.salmon, bg: "#FDF1D9" }
          : sit.enClase?.[f.p] ? { txt: `Cubre ${sit.enClase[f.p]}`, color: "#1d4ed8", bg: "#DDF0F4" }
          : f.entra ? { txt: `Entra por ${f.entra}`, color: "#16333F", bg: "#FDF1D9" }
          : f.rol === "Sustituto" ? { txt: "En reserva", color: C.gray, bg: C.light }
          : { txt: "En la zona", color: "#275D8C", bg: "#DDF0F4" };
        return (
          <div key={f.rol} style={{ background: estado.bg, borderRadius: 8, padding: "6px 10px" }}>
            <div style={{ fontSize: 13, color: C.gray, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase" }}>{f.rol}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: f.p ? C.dark : "#275D8C", textDecoration: f.falta ? "line-through" : "none" }}>{f.p || "—"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: estado.color }}>{estado.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function AhoraGuardias({ profesores, cuadrante, apoyosGuardia = {}, sustitutosGuardia = {}, ausencias = [], coberturas = {}, setCoberturas, puedeAsignar = false, usuario = "", C }) {
  const [ahora, setAhora] = useState(() => new Date());
  const [horaElegida, setHoraElegida] = useState(""); // "" = la hora en curso
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 15000); return () => clearInterval(t); }, []);

  const fecha = isoLocal(ahora);
  const lectivo = esLectivo(ahora);
  const enCurso = horaEnCurso(ahora);
  const hora = horaElegida || enCurso;
  const siguiente = hora ? HORAS[HORAS.indexOf(hora) + 1] || null : horaSiguiente(ahora);
  const equipo = { profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias, coberturas };

  // Zonas de guardia de una hora, con su situación (las más urgentes primero)
  const zonasDe = h => {
    if (!h) return [];
    const ids = [...new Set(profesores.map(p => cuadrante[`${fecha}|${h}|${p}`]).filter(Boolean))];
    return ids.map(zonaId => {
      const z = ZONAS_CENTRO.find(z => z.id === zonaId);
      return { zonaId, zona: z?.label || zonaId, edificio: z?.edificio, sit: situacionZona({ fecha, hora: h, zonaId, ...equipo }) };
    }).sort((a, b) => ORDEN_ESTADO[a.sit.estado] - ORDEN_ESTADO[b.sit.estado] || a.zona.localeCompare(b.zona));
  };
  const zonas = zonasDe(hora);
  const zonasSig = zonasDe(siguiente);
  const ausentesAhora = hora ? ausencias.filter(a => isoLocal(a.fecha) === fecha && a.horas.includes(hora)) : [];
  const clasesSinProfe = hora === "Recreo" ? [] : ausentesAhora;
  const sinCubrir = clasesSinProfe.filter(a => !coberturas[claveCob(fecha, hora, a.id)]).length;
  const miClase = usuario && hora ? claseQueCubre(fecha, hora, usuario, coberturas, ausencias) : null;
  const miGuardia = usuario && hora
    ? guardiasDeProfesor({ fecha, profesor: usuario, ...equipo }).filter(g => g.hora === hora)
    : [];

  // Progreso del tramo en curso
  let progreso = null;
  if (hora && hora === enCurso) {
    const [ini, fin] = tramoMin(hora);
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    progreso = { pct: Math.round(((min - ini) / (fin - ini)) * 100), quedan: fin - min };
  }
  const reloj = ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const cuenta = e => zonas.filter(z => z.sit.estado === e).length;
  const tarjeta = { background: C.white, borderRadius: 12, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 14 };

  return (
    <div>
      {/* Cabecera con reloj */}
      <div style={{ background: C.dark, color: "#fff", borderRadius: 14, padding: "18px 20px", marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Icono nombre="hora-reloj" tam={44} />
          <div>
            <div style={{ fontSize: 13, opacity: .75, letterSpacing: 1 }}>{ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {!lectivo ? "Hoy no es día lectivo" : hora ? conTramo(hora) : siguiente ? `Antes de ${siguiente}` : "La jornada ha terminado"}
            </div>
            {horaElegida && horaElegida !== enCurso && <div style={{ fontSize: 14, opacity: .8 }}>Estás viendo otra hora · ahora es {enCurso || "fuera del horario"}</div>}
          </div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{reloj}</div>
        {progreso && (
          <div style={{ width: "100%" }}>
            <div style={{ height: 8, background: "rgba(255,255,255,.2)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${progreso.pct}%`, height: "100%", background: C.teal }} />
            </div>
            <div style={{ fontSize: 14, opacity: .85, marginTop: 4 }}>Quedan {progreso.quedan} min{siguiente ? ` · después: ${conTramo(siguiente)}` : " · última hora del día"}</div>
          </div>
        )}
      </div>

      {/* Ver otra hora (útil para preparar la siguiente o fuera del horario) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {[["", "En curso"], ...HORAS.map(h => [h, h])].map(([v, t]) => (
          <button key={t} onClick={() => setHoraElegida(v)}
            style={{ border: `1px solid ${horaElegida === v ? C.dark : "#d6d3d1"}`, background: horaElegida === v ? C.dark : C.white, color: horaElegida === v ? "#fff" : C.dark, borderRadius: 20, padding: "6px 12px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {t}{v === enCurso && v ? " ●" : ""}
          </button>
        ))}
      </div>

      {!lectivo || !hora ? (
        <div style={{ ...tarjeta, textAlign: "center", color: C.gray, padding: 28 }}>
          {!lectivo ? "Fin de semana: no hay guardias." : siguiente ? `Aún no ha empezado la jornada. La primera es ${conTramo(siguiente)}.` : "No hay ninguna hora en curso."}
          <div style={{ fontSize: 14, marginTop: 6 }}>Puedes elegir una hora arriba para verla.</div>
        </div>
      ) : (<>
        {/* Te toca ahora */}
        {usuario && (
          <div style={{ ...tarjeta, borderLeft: `6px solid ${miGuardia.length ? C.teal : "#d6d3d1"}` }}>
            <div style={{ fontWeight: 800, color: C.dark, fontSize: 16, marginBottom: 8 }}><Ic n="guardias" tam={22} />{miGuardia.length || miClase ? "Te toca guardia" : "No tienes guardia a esta hora"}</div>
            {miClase && (
              <div style={{ background: "#DDF0F4", border: `2px solid ${C.blue}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 800, color: C.blue, fontSize: 15, marginBottom: 6 }}>📋 Jefatura te ha asignado: cubres la clase de {miClase.profesor}{miClase.aula ? ` en ${miClase.aula}` : ""}</div>
                <TareaAusente a={miClase} C={C} />
              </div>
            )}
            {miGuardia.map((g, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 15, color: C.dark }}><strong>{g.zona}</strong> · como {g.rol}{g.rol === "sustituto" && g.sit.sustituyeA ? <span style={{ color: "#16333F", fontWeight: 700 }}> — entras por {g.sit.sustituyeA}</span> : ""}</div>
                <EquipoZona sit={g.sit} C={C} />
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {tareasDeGuardia(g, fecha, ausencias).map(a => <TareaAusente key={a.id} a={a} C={C} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumen */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Descubiertas", value: cuenta("descubierta"), color: C.salmon },
            { label: "Solo 1 profesor", value: cuenta("una"), color: "#a16207" },
            { label: "Entra el sustituto", value: cuenta("sustituto"), color: C.amber },
            { label: "Completas", value: cuenta("completa"), color: C.teal },
            { label: hora === "Recreo" ? "Ausentes" : "Clases sin cubrir", value: hora === "Recreo" ? ausentesAhora.length : sinCubrir, color: C.blue },
          ].map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 10, padding: 12, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Clases sin profe */}
        {clasesSinProfe.length > 0 && (
          <div style={tarjeta}>
            <div style={{ fontWeight: 800, color: C.dark, fontSize: 15, marginBottom: 10 }}><Ic n="profe-ausente" tam={22} />Clases sin su profesor/a · {sinCubrir ? <span style={{ color: "#16333F" }}>{sinCubrir} sin cubrir</span> : <span style={{ color: C.teal }}>todas cubiertas</span>}</div>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))" }}>
              {clasesSinProfe.map(a => (
                <div key={a.id} style={{ display: "grid", gap: 6, alignContent: "start" }}>
                  <TareaAusente a={a} C={C} />
                  <CubrirClase fecha={fecha} hora={hora} ausencia={a} equipo={equipo} coberturas={coberturas} setCoberturas={setCoberturas} puedeAsignar={puedeAsignar} C={C} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zonas de guardia */}
        <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
          <div style={{ background: hora === "Recreo" ? C.blue : C.dark, color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: 14 }}><Ic n="guardias" tam={20} />Zonas de guardia · {hora}</div>
          {zonas.length === 0 ? (
            <div style={{ padding: 22, textAlign: "center", color: C.gray, fontSize: 14 }}>No hay zonas en el cuadrante para esta hora.</div>
          ) : zonas.map(z => {
            const e = ESTADOS_ZONA[z.sit.estado];
            return (
              <div key={z.zonaId} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.cream}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{z.zona}</div>
                  <span style={{ color: e.color, background: e.bg, borderRadius: 8, padding: "3px 8px", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{e.label}</span>
                </div>
                <div>
                  <EquipoZona sit={z.sit} C={C} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Siguiente hora */}
        {siguiente && (
          <div style={{ ...tarjeta, background: C.light, fontSize: 14, color: C.dark }}>
            <strong>Siguiente: {conTramo(siguiente)}</strong> — {zonasSig.length} zona(s)
            {zonasSig.filter(z => z.sit.estado === "descubierta").length > 0
              ? <span style={{ color: C.salmon, fontWeight: 700 }}> · {zonasSig.filter(z => z.sit.estado === "descubierta").length} descubierta(s): {zonasSig.filter(z => z.sit.estado === "descubierta").map(z => z.zona).join(", ")}</span>
              : <span style={{ color: C.teal }}> · ninguna descubierta</span>}
            <button onClick={() => setHoraElegida(siguiente)} style={{ marginLeft: 8, border: "none", background: "transparent", color: C.blue, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Ver →</button>
          </div>
        )}
      </>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE AUSENCIAS (Jefatura)
// ═══════════════════════════════════════════════════════════════════════════
function GestionAusencias({ ausencias, setAusencias, profesores, C, fmt }) {
  const [filtFecha, setFiltFecha] = useState("");
  const [filtProf,  setFiltProf]  = useState("");
  const ausFiltradas = ausencias.filter(a => (!filtFecha||a.fecha===filtFecha) && (!filtProf||a.profesor===filtProf));

  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Gestión de Ausencias" icono="profe-ausente" /></div>
      <div style={{ background:C.white, borderRadius:12, padding:16, marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label style={{ display:"block", fontWeight:600, fontSize:14, color:C.dark, marginBottom:6 }}>Filtrar por fecha</label>
            <input type="date" value={filtFecha} onChange={e=>setFiltFecha(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #CDE9ED", fontSize:14, boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ display:"block", fontWeight:600, fontSize:14, color:C.dark, marginBottom:6 }}>Filtrar por profesor</label>
            <select value={filtProf} onChange={e=>setFiltProf(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #CDE9ED", fontSize:14 }}>
              <option value="">Todos</option>{profesores.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <button onClick={()=>{setFiltFecha("");setFiltProf("");}} style={{ marginTop:10, background:"none", border:"1px solid #CDE9ED", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:14, color:C.gray }}>Limpiar filtros</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
        {[
          { label:"Total",         value:ausencias.length,                                    color:C.dark   },
          { label:"Sin leer",      value:ausencias.filter(a=>!a.leida).length,                color:C.salmon },
          { label:"Con tarea",     value:ausencias.filter(a=>a.tarea&&a.tarea.trim()).length, color:C.teal   },
        ].map(s=>(
          <div key={s.label} style={{ background:C.white, borderRadius:10, padding:14, textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderTop:`4px solid ${s.color}` }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:13, color:C.gray, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {ausFiltradas.length === 0
        ? <div style={{ background:C.white, borderRadius:12, padding:30, textAlign:"center", color:C.gray }}>No hay ausencias notificadas</div>
        : ausFiltradas.map(a => (
          <div key={a.id} onClick={()=>setAusencias(prev=>prev.map(x=>x.id===a.id?{...x,leida:true}:x))}
            style={{ background:a.leida?C.white:"#FDF1D9", borderRadius:12, padding:16, marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderLeft:`4px solid ${a.leida?"#CDE9ED":C.salmon}`, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:700, color:C.dark, fontSize:15 }}>
                  <Ic n="cargo-profesor" tam={20} />{a.profesor}
                  {!a.leida && <span style={{ marginLeft:8, fontSize:13, background:C.salmon, color:"#fff", borderRadius:6, padding:"2px 8px" }}>Sin leer</span>}
                </div>
                <div style={{ fontSize:14, color:C.gray, marginTop:3 }}><Ic n="fecha-hora" tam={20} />{new Date(a.fecha).toLocaleDateString("es-ES")} · {a.motivo}</div>
                <div style={{ fontSize:14, color:C.dark, marginTop:3 }}><Ic n="hora-reloj" tam={20} />Horas: <strong>{a.horas.join(", ")}</strong></div>
                {a.tarea && <div style={{ fontSize:14, marginTop:6, background:C.light, borderRadius:6, padding:"6px 10px" }}><Ic n="ejercicios" tam={20} />{a.tarea}</div>}
              </div>
              <div style={{ fontSize:13, color:C.gray, whiteSpace:"nowrap", textAlign:"right" }}>Notificado: {fmt(a.ts)}{a.registradaPor && <div><Ic n="profe-ausente" tam={20} />Registrada por {a.registradaPor}</div>}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS Y DOCUMENTOS POR FECHA (Jefatura)
// ═══════════════════════════════════════════════════════════════════════════
// Filas de firmas de guardia de un día (quién tenía que estar en cada zona y quién ha firmado)
function filasFirmasDia(fecha, { profesores, cuadrante, apoyos = {}, sustitutos = {}, ausencias = [] }, firmas = []) {
  const filas = [];
  HORAS_GUARDIA.forEach(hora => {
    profesores.forEach(prof => {
      const zonaId = cuadrante[`${fecha}|${hora}|${prof}`];
      if (!zonaId) return;
      const z = ZONAS_CENTRO.find(z => z.id === zonaId);
      const sit = situacionZona({ fecha, hora, zonaId, profesores, cuadrante, apoyos, sustitutos, ausencias });
      const personas = sit.enZona.map(p => ({ p, firma: firmas.find(f => f.fecha === fecha && f.hora === hora && f.zonaId === zonaId && f.profesor === p) }));
      filas.push({ hora, zona: z?.label || zonaId, personas, empezada: horaEmpezada(fecha, hora) });
    });
  });
  return filas;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const PERIODOS = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "quincena", label: "Quincena" },
  { id: "mes", label: "Mes" },
  { id: "rango", label: "Entre fechas" },
];
// Devuelve { desde, hasta, texto } (fechas AAAA-MM-DD) del periodo que contiene la fecha de referencia
function calcularPeriodo(tipo, ref, desdeLibre, hastaLibre) {
  const d = parseISO(ref);
  const y = d.getFullYear(), m = d.getMonth();
  const finMes = new Date(y, m + 1, 0).getDate();
  const largo = x => parseISO(x).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (tipo === "dia") return { desde: isoLocal(d), hasta: isoLocal(d), texto: largo(d) };
  if (tipo === "semana") {
    const l = lunesDe(d), v = sumarDias(l, 4);
    return { desde: isoLocal(l), hasta: isoLocal(v), texto: `Semana del ${fmtD(l)} al ${fmtD(v)}` };
  }
  if (tipo === "quincena") {
    const primera = d.getDate() <= 15;
    const ini = new Date(y, m, primera ? 1 : 16), fin = new Date(y, m, primera ? 15 : finMes);
    return { desde: isoLocal(ini), hasta: isoLocal(fin), texto: `${primera ? "1ª" : "2ª"} quincena de ${MESES[m]} de ${y} (${fmtD(ini)} – ${fmtD(fin)})` };
  }
  if (tipo === "mes") return { desde: isoLocal(new Date(y, m, 1)), hasta: isoLocal(new Date(y, m, finMes)), texto: `${MESES[m][0].toUpperCase() + MESES[m].slice(1)} de ${y}` };
  const a = desdeLibre || isoLocal(d), b = hastaLibre || a;
  const [desde, hasta] = a <= b ? [a, b] : [b, a];
  return { desde, hasta, texto: desde === hasta ? largo(desde) : `Del ${fmtD(parseISO(desde))} al ${fmtD(parseISO(hasta))}` };
}
// Mueve la fecha de referencia al periodo anterior (-1) o siguiente (+1)
function moverPeriodo(tipo, ref, dir) {
  const d = parseISO(ref);
  if (tipo === "dia") { let x = sumarDias(d, dir); while (!esLectivo(x)) x = sumarDias(x, dir); return isoLocal(x); }
  if (tipo === "semana") return isoLocal(sumarDias(d, 7 * dir));
  if (tipo === "quincena") {
    if (d.getDate() <= 15) return isoLocal(dir > 0 ? new Date(d.getFullYear(), d.getMonth(), 16) : new Date(d.getFullYear(), d.getMonth() - 1, 16));
    return isoLocal(dir > 0 ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : new Date(d.getFullYear(), d.getMonth(), 1));
  }
  return isoLocal(new Date(d.getFullYear(), d.getMonth() + dir, 1));
}
const diasEntre = (desde, hasta) => { const r = []; for (let x = parseISO(desde); isoLocal(x) <= hasta; x = sumarDias(x, 1)) r.push(isoLocal(x)); return r; };
const contarPor = (lista, clave) => {
  const m = {};
  lista.forEach(x => { const k = typeof clave === "function" ? clave(x) : x[clave]; if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const minutosBano = b => b.regreso ? Math.max(1, Math.round((new Date(b.regreso) - new Date(b.salida || b.ts)) / 60000)) : null;
const etiquetaTip = p => TIPIFICACION[p.gravedad]?.find(t => t.id === p.tipificacion)?.label || "";

// Calcula todas las cifras del periodo
function estadisticasPeriodo({ desde, hasta, partes, banos, ausencias, firmas, listas, equipo, tutores }) {
  const enRango = f => f && f >= desde && f <= hasta;
  const pP = partes.filter(p => enRango(isoLocal(p.ts))).sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const bP = banos.filter(b => enRango(isoLocal(b.ts || b.salida))).sort((a, b) => new Date(a.ts || a.salida) - new Date(b.ts || b.salida));
  const aP = ausencias.filter(a => enRango(isoLocal(a.fecha))).sort((a, b) => isoLocal(a.fecha).localeCompare(isoLocal(b.fecha)));
  const lP = listas.filter(l => enRango(l.fecha));
  const dias = diasEntre(desde, hasta);
  const lectivos = dias.filter(esLectivo);
  let debidas = 0, firmadas = 0;
  const hoyISO = isoLocal();
  lectivos.filter(f => f <= hoyISO).forEach(f => {
    filasFirmasDia(f, equipo, firmas).filter(x => x.empezada).forEach(x => x.personas.forEach(pe => { debidas++; if (pe.firma) firmadas++; }));
  });
  const minutos = bP.map(minutosBano).filter(Boolean);
  const porDia = lectivos.map(f => ({
    fecha: f,
    leve: pP.filter(p => isoLocal(p.ts) === f && p.gravedad === "leve").length,
    grave: pP.filter(p => isoLocal(p.ts) === f && p.gravedad === "grave").length,
    muy_grave: pP.filter(p => isoLocal(p.ts) === f && p.gravedad === "muy_grave").length,
    banos: bP.filter(b => isoLocal(b.ts || b.salida) === f).length,
    ausencias: aP.filter(a => isoLocal(a.fecha) === f).length,
    horasAusencia: aP.filter(a => isoLocal(a.fecha) === f).reduce((s, a) => s + (a.horas?.length || 0), 0),
  })).map(d => ({ ...d, partes: d.leve + d.grave + d.muy_grave }));
  return {
    partes: pP, banos: bP, ausencias: aP, listas: lP, dias, lectivos, porDia,
    gravedad: { leve: pP.filter(p => p.gravedad === "leve").length, grave: pP.filter(p => p.gravedad === "grave").length, muy_grave: pP.filter(p => p.gravedad === "muy_grave").length },
    alumnosConParte: new Set(pP.map(p => p.alumnoId ?? p.alumno)).size,
    porGrupo: resumenPorGrupo(pP, tutores),
    porHora: HORAS.map(h => [h, pP.filter(p => p.hora === h).length]).filter(([, n]) => n > 0),
    porAlumno: contarPor(pP, p => `${p.alumno} (${p.curso})`).slice(0, 10),
    porTipificacion: contarPor(pP, etiquetaTip).slice(0, 8),
    porProfesorParte: contarPor(pP, "profesor").slice(0, 10),
    banosPorGrupo: contarPor(bP, "curso"),
    banosPorAlumno: contarPor(bP, b => `${b.alumno} (${b.curso})`).slice(0, 10),
    banoMedio: minutos.length ? Math.round(minutos.reduce((a, b) => a + b, 0) / minutos.length) : 0,
    banosLargos: minutos.filter(m => m > 10).length,
    ausenciasPorMotivo: contarPor(aP, "motivo"),
    ausenciasPorProfesor: contarPor(aP, "profesor"),
    horasAusencia: aP.reduce((s, a) => s + (a.horas?.length || 0), 0),
    profesoresAusentes: new Set(aP.map(a => a.profesor)).size,
    guardiasDebidas: debidas, guardiasFirmadas: firmadas,
    listasPasadas: lP.length, faltasEnListas: lP.reduce((s, l) => s + (l.ausentes?.length || 0), 0),
  };
}

// ─── PDF: estadísticas del periodo ───────────────────────────────────────────
function pdfEstadisticas(est, periodo, autor = "") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, autor ? "Estadísticas de convivencia" : "Estadísticas del centro", `${periodo.texto} · ${autor || "Jefatura de Estudios"}`);
  const tituloSec = t => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text(t, 14, y); doc.setTextColor(0); y += 3;
  };
  const tabla = (head, body, extra = {}) => {
    autoTable(doc, { ...estiloTabla, startY: y, head: [head], body: body.length ? body.map(r => r.map(sinEmoji)) : [[...head.map((_, i) => i === 0 ? "Sin datos en este periodo" : "")]], ...extra });
    y = doc.lastAutoTable.finalY + 9;
  };
  const pct = (a, b) => b ? `${Math.round(100 * a / b)} %` : "-";
  tituloSec("Resumen");
  tabla(["Indicador", "Valor"], [
    ["Días lectivos del periodo", est.lectivos.length],
    ["Partes (total)", est.partes.length],
    ["   Leves / Graves / Muy graves", `${est.gravedad.leve} / ${est.gravedad.grave} / ${est.gravedad.muy_grave}`],
    ["Alumnos/as con algún parte", est.alumnosConParte],
    ["Media de partes por día lectivo", est.lectivos.length ? (est.partes.length / est.lectivos.length).toFixed(1) : "-"],
    ["Salidas al baño", est.banos.length],
    ["   Duración media / salidas de más de 10 min", `${est.banoMedio || "-"} min / ${est.banosLargos}`],
    ...(autor ? [] : [["Ausencias del profesorado", `${est.ausencias.length} (${est.horasAusencia} horas, ${est.profesoresAusentes} profesores/as)`],
    ["Firmas de guardia", `${est.guardiasFirmadas} de ${est.guardiasDebidas} (${pct(est.guardiasFirmadas, est.guardiasDebidas)})`],
    ["Listas pasadas en guardia / faltas anotadas", `${est.listasPasadas} / ${est.faltasEnListas}`]]),
  ].map(r => r.map(String)), { columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" }, 1: { halign: "center" } } });
  if (est.porDia.length > 1) {
    tituloSec("Evolución por día");
    tabla(["Día", "Leves", "Graves", "Muy graves", "Partes", "Baños", ...(autor ? [] : ["Ausencias prof.", "Horas aus."])],
      est.porDia.map(d => [parseISO(d.fecha).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit" }), d.leve, d.grave, d.muy_grave, d.partes, d.banos, ...(autor ? [] : [d.ausencias, d.horasAusencia])].map(String)),
      { styles: { ...estiloTabla.styles, halign: "center" } });
  }
  tituloSec("Partes por grupo y tutoría");
  tabla(["Grupo", "Tutor/a", "Leves", "Graves", "Muy graves", "Total"], est.porGrupo.map(r => [r.curso, r.tutor || "-", r.leve, r.grave, r.muy_grave, r.total].map(String)));
  tituloSec("Partes por hora de clase");
  tabla(["Hora", "Partes"], est.porHora.map(([h, n]) => [h, String(n)]));
  tituloSec("Alumnado con más partes");
  tabla(["Alumno/a", "Partes"], est.porAlumno.map(([k, n]) => [k, String(n)]));
  tituloSec("Faltas más frecuentes");
  tabla(["Tipificación", "Partes"], est.porTipificacion.map(([k, n]) => [k, String(n)]), { columnStyles: { 1: { cellWidth: 20, halign: "center" } } });
  tituloSec("Salidas al baño por grupo");
  tabla(["Grupo", "Salidas"], est.banosPorGrupo.map(([k, n]) => [k, String(n)]));
  if (!autor) {
  tituloSec("Ausencias del profesorado por motivo");
  tabla(["Motivo", "Ausencias"], est.ausenciasPorMotivo.map(([k, n]) => [k, String(n)]));
  tituloSec("Ausencias por profesor/a");
  tabla(["Profesor/a", "Ausencias"], est.ausenciasPorProfesor.map(([k, n]) => [k, String(n)]));
  }
  guardarPDF(doc, `estadisticas-${periodo.desde}${periodo.hasta !== periodo.desde ? `-a-${periodo.hasta}` : ""}.pdf`);
}

// ─── PDF: ausencias del profesorado ──────────────────────────────────────────
function pdfAusencias(ausencias, periodo) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  let y = cabeceraPDF(doc, "Ausencias del profesorado", `${periodo.texto} · Jefatura de Estudios`);
  const horas = ausencias.reduce((s, a) => s + (a.horas?.length || 0), 0);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`Total: ${ausencias.length} ausencias · ${horas} horas lectivas · ${new Set(ausencias.map(a => a.profesor)).size} profesores/as`, 14, y);
  autoTable(doc, { ...estiloTabla, startY: y + 4,
    head: [["Fecha", "Profesor/a", "Motivo", "Horas", "Grupo / aula", "Asignatura", "Tarea para el alumnado", "Dónde está la tarea"]],
    body: ausencias.length ? ausencias.map(a => [fmtD(parseISO(a.fecha)), a.profesor, a.motivo, (a.horas || []).join(", "), a.aula || "-", a.asignatura || "-", a.tarea || "-", [a.ubicacion, a.enlace].filter(Boolean).join(" · ") || "-"].map(sinEmoji)) : [["-", "No hay ausencias en este periodo", "", "", "", "", "", ""]],
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 34 }, 2: { cellWidth: 26 }, 3: { cellWidth: 30 }, 4: { cellWidth: 24 }, 5: { cellWidth: 26 }, 7: { cellWidth: 34 } } });
  guardarPDF(doc, `ausencias-profesorado-${periodo.desde}${periodo.hasta !== periodo.desde ? `-a-${periodo.hasta}` : ""}.pdf`);
}

// ─── Excel (.xlsx) con todos los datos del periodo, una hoja por tema ─────────
// La librería se carga solo al pulsar el botón, para que la aplicación no pese más.
// No incluye el contacto de las familias (RGPD): solo lo necesario para analizar.
async function excelPeriodo(est, periodo, tutores = {}, alumnos = [], soloAlumnado = false) {
  // Primero se preparan las hojas; luego se ven en pantalla y/o se descargan
  const hojas = [];
  const hoja = (nombre, cabecera, filas, anchos) => hojas.push({ nombre, cabecera, filas, anchos });
  const fecha = d => fmtD(parseISO(d));
  const gLabel = g => ({ leve: "Leve", grave: "Grave", muy_grave: "Muy grave" })[g] || g;

  hoja("Resumen", ["Indicador", "Valor"], [
    ["Periodo", periodo.texto], ["Días lectivos", est.lectivos.length],
    ["Partes", est.partes.length], ["Leves", est.gravedad.leve], ["Graves", est.gravedad.grave], ["Muy graves", est.gravedad.muy_grave],
    ["Alumnos/as con parte", est.alumnosConParte], ["Salidas al baño", est.banos.length], ["Duración media del baño (min)", est.banoMedio || ""],
    ...(soloAlumnado ? [] : [["Ausencias del profesorado", est.ausencias.length], ["Horas de ausencia", est.horasAusencia],
    ["Guardias firmadas", est.guardiasFirmadas], ["Guardias que había que firmar", est.guardiasDebidas],
    ["Listas pasadas en guardia", est.listasPasadas], ["Faltas anotadas en esas listas", est.faltasEnListas]]),
  ], [34, 50]);

  hoja("Por día", ["Fecha", "Día", "Partes leves", "Partes graves", "Partes muy graves", "Total partes", "Salidas al baño", ...(soloAlumnado ? [] : ["Ausencias profesorado", "Horas de ausencia"])],
    est.porDia.map(d => [fecha(d.fecha), DIAS_ES[parseISO(d.fecha).getDay()], d.leve, d.grave, d.muy_grave, d.partes, d.banos, ...(soloAlumnado ? [] : [d.ausencias, d.horasAusencia])]),
    [12, 11, 12, 12, 16, 12, 14, 20, 16]);

  hoja("Partes", ["Ref.", "Fecha", "Hora registro", "Hora de clase", "Alumno/a", "Grupo", "Tutor/a", "Correo del tutor/a", "Tipo", "Gravedad", "Falta tipificada", "Normativa", "Profesor/a", "Descripción", "Parte de grupo"],
    est.partes.map(p => [`PARTE-${p.id}`, fecha(p.ts), horaCorta(p.ts), p.hora || "", p.alumno, p.curso, tutorDeParte(p, tutores), p.tutorEmail || tutores[p.curso]?.email || "",
      p.tipo || "", gLabel(p.gravedad), etiquetaTip(p), p.gravedad === "leve" ? "Plan de Convivencia" : "Decreto 32/2019 CAM", p.profesor || "", p.descripcion || "", p.esGrupal ? "Sí" : "No"]),
    [12, 11, 8, 10, 28, 10, 20, 28, 16, 10, 50, 18, 20, 60, 8]);

  // Una fila por alumno con parte o salida al baño en el periodo
  const claves = new Map();
  [...est.partes, ...est.banos].forEach(x => { const k = `${x.alumno}|${x.curso}`; if (!claves.has(k)) claves.set(k, { alumno: x.alumno, curso: x.curso }); });
  const filasAlumno = [...claves.values()].map(({ alumno, curso }) => {
    const pa = est.partes.filter(p => p.alumno === alumno && p.curso === curso);
    const ba = est.banos.filter(b => b.alumno === alumno && b.curso === curso);
    const cuenta = g => pa.filter(p => p.gravedad === g).length;
    const faltaTop = contarPor(pa, etiquetaTip)[0];
    const tutor = tutores[curso]?.tutor || alumnos.find(a => a.nombre === alumno)?.tutor || "";
    return [alumno, curso, tutor, cuenta("leve"), cuenta("grave"), cuenta("muy_grave"), pa.length, faltaTop ? faltaTop[0] : "", ba.length,
      pa.length ? fecha(pa.reduce((m, p) => p.ts > m ? p.ts : m, pa[0].ts)) : ""];
  }).sort((a, b) => b[6] - a[6] || b[8] - a[8] || a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  hoja("Por alumno", ["Alumno/a", "Grupo", "Tutor/a", "Leves", "Graves", "Muy graves", "Total partes", "Falta más repetida", "Salidas al baño", "Último parte"],
    filasAlumno, [28, 10, 20, 7, 7, 10, 11, 50, 13, 12]);

  hoja("Por grupo", ["Grupo", "Tutor/a", "Correo del tutor/a", "Leves", "Graves", "Muy graves", "Total partes", "Salidas al baño"],
    est.porGrupo.map(r => [r.curso, r.tutor || "", r.email || "", r.leve, r.grave, r.muy_grave, r.total, est.banos.filter(b => b.curso === r.curso).length]),
    [10, 22, 28, 7, 7, 10, 11, 13]);

  hoja("Baños", ["Fecha", "Salida", "Regreso", "Minutos fuera", "Alumno/a", "Grupo", "Autorizado por"],
    est.banos.map(b => [fecha(b.ts || b.salida), horaCorta(b.salida || b.ts), b.regreso ? horaCorta(b.regreso) : "Sin regreso", minutosBano(b) ?? "", b.alumno, b.curso, b.profesor || ""]),
    [11, 8, 11, 12, 28, 10, 22]);

  if (!soloAlumnado) hoja("Ausencias profesorado", ["Fecha", "Día", "Profesor/a", "Motivo", "Horas", "Nº de horas", "Grupo / aula", "Edificio", "Asignatura", "Tarea para el alumnado", "Dónde está la tarea", "Enlace"],
    est.ausencias.map(a => [fecha(a.fecha), DIAS_ES[parseISO(a.fecha).getDay()], a.profesor, a.motivo || "", (a.horas || []).join(", "), (a.horas || []).length, a.aula || "", a.edificio || "", a.asignatura || "", a.tarea || "", a.ubicacion || "", a.enlace || ""]),
    [11, 10, 22, 16, 26, 10, 12, 8, 16, 50, 22, 30]);

  if (!soloAlumnado) hoja("Listas de guardia", ["Fecha", "Hora", "Grupo", "Profesor/a de guardia", "Pasada a las", "Nº de faltas", "Alumnado que faltaba"],
    est.listas.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || HORAS.indexOf(a.hora) - HORAS.indexOf(b.hora))
      .map(l => [fecha(l.fecha), l.hora, l.curso, l.profesor, horaCorta(l.ts), (l.ausentes || []).length, (l.ausentes || []).map(x => x.nombre).join(", ")]),
    [11, 9, 10, 22, 11, 11, 60]);

  const archivo = `rumboaula-datos-${periodo.desde}${periodo.hasta !== periodo.desde ? `-a-${periodo.hasta}` : ""}.xlsx`;
  const descargar = async () => {
    const XLSX = await import("xlsx");
    const libro = XLSX.utils.book_new();
    hojas.forEach(({ nombre, cabecera, filas, anchos }) => {
      const h = XLSX.utils.aoa_to_sheet([cabecera, ...(filas.length ? filas : [["Sin datos en este periodo"]])]);
      h["!cols"] = anchos.map(w => ({ wch: w }));
      h["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, filas.length), c: cabecera.length - 1 } }) };
      XLSX.utils.book_append_sheet(libro, h, nombre);
    });
    XLSX.writeFile(libro, archivo);
  };
  if (visor.excel) visor.excel({ hojas, archivo, descargar: () => descargar().catch(() => window.alert("No se ha podido crear el Excel. Inténtalo de nuevo.")) });
  else await descargar();
}

// Barras horizontales sencillas
function Barras({ datos, color = R.turquesa, vacio = "Sin datos en este periodo.", onClick }) {
  const max = Math.max(1, ...datos.map(d => d[1]));
  if (!datos.length) return <div style={{ fontSize: 15, color: R.petroleo }}>{vacio}</div>;
  return (
    <div>
      {datos.map(([k, n, clave]) => (
        <div key={k} onClick={onClick ? () => onClick(clave ?? k, k) : undefined} role={onClick ? "button" : undefined} title={onClick ? "Pulsa para ver estos partes" : undefined}
          onMouseOver={onClick ? e => { e.currentTarget.style.background = R.azulClaro; } : undefined} onMouseOut={onClick ? e => { e.currentTarget.style.background = "transparent"; } : undefined}
          style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(60px,1.2fr) 34px", gap: 8, alignItems: "center", marginBottom: 2, minHeight: 32, padding: "2px 4px", fontSize: 14, cursor: onClick ? "pointer" : "default" }}>
          <div title={k} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: R.petroleo }}>{k}</div>
          <div style={{ background: R.gris, height: 14 }}><div style={{ width: `${(100 * n) / max}%`, background: color, height: "100%" }} /></div>
          <div style={{ textAlign: "right", fontWeight: 700, color: R.petroleo }}>{n}</div>
        </div>
      ))}
    </div>
  );
}

// Ventana con el detalle de un conjunto de partes (un día, un grupo, una falta…)
function DetallePartes({ titulo, subtitulo, partes, tutores, onVerParte, onCerrar, C }) {
  useEffect(() => { const f = e => { if (e.key === "Escape") onCerrar(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onCerrar]);
  const g = { leve: partes.filter(p => p.gravedad === "leve").length, grave: partes.filter(p => p.gravedad === "grave").length, muy_grave: partes.filter(p => p.gravedad === "muy_grave").length };
  const faltas = contarPor(partes, etiquetaTip);
  const top = faltas[0];
  const h3 = { margin: "0 0 10px", color: C.dark, fontSize: 15 };
  const caja = { background: C.white, borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
  const ordenados = [...partes].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 150, display: "flex", alignItems: "stretch", justifyContent: "center", padding: "3vh 2vw" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.cream, borderRadius: 16, width: "100%", maxWidth: 1200, overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: R.azul, color: "#fff", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 14, opacity: .85 }}>{subtitulo}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {partes.length > 0 && <button onClick={() => pdfInformePartes(ordenados, `${titulo}${subtitulo ? ` · ${subtitulo}` : ""}`, tutores)} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>⬇️ PDF</button>}
            <button onClick={onCerrar} aria-label="Cerrar" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {partes.length === 0 ? <div style={{ ...caja, textAlign: "center", color: C.gray }}>No hay partes.</div> : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
                {[{ n: partes.length, t: "Partes", c: C.dark }, { n: g.leve, t: "Leves", c: C.teal }, { n: g.grave, t: "Graves", c: C.amber }, { n: g.muy_grave, t: "Muy graves", c: C.salmon }, { n: new Set(partes.map(p => p.alumnoId ?? p.alumno)).size, t: "Alumnos/as", c: C.blue }].map(k => (
                  <div key={k.t} style={{ ...caja, borderTop: `4px solid ${k.c}`, padding: 12 }}><div style={{ fontSize: 26, fontWeight: 800, color: C.dark }}>{k.n}</div><div style={{ fontSize: 14, fontWeight: 700, color: C.gray }}>{k.t}</div></div>
                ))}
              </div>
              {top && (
                <div style={{ ...caja, marginBottom: 14, borderLeft: `5px solid ${C.amber}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: .5 }}>La falta que más se repite</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginTop: 4 }}>{top[0]}</div>
                  <div style={{ fontSize: 14, color: C.gray, marginTop: 2 }}>{top[1]} de {partes.length} partes ({Math.round(100 * top[1] / partes.length)} %)</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 14 }}>
                <div style={caja}><h3 style={h3}><Ic n="tipificacion" tam={20} />Motivos (faltas tipificadas)</h3><Barras datos={faltas} color={C.amber} vacio="Sin tipificar." /></div>
                <div style={caja}><h3 style={h3}><Ic n="por-curso" tam={20} />Por grupo</h3><Barras datos={contarPor(partes, "curso")} /></div>
                <div style={caja}><h3 style={h3}><Ic n="hora-reloj" tam={20} />Por hora de clase</h3><Barras datos={HORAS.map(h => [h, partes.filter(p => p.hora === h).length]).filter(([, n]) => n)} color={C.blue} /></div>
                <div style={caja}><h3 style={h3}><Ic n="por-alumno" tam={20} />Alumnado</h3><Barras datos={contarPor(partes, p => `${p.alumno} (${p.curso})`).slice(0, 10)} color={C.salmon} /></div>
                <div style={caja}><h3 style={h3}><Ic n="cargo-profesor" tam={20} />Profesorado que pone el parte</h3><Barras datos={contarPor(partes, "profesor").slice(0, 10)} color="#2B647E" /></div>
              </div>
              <h3 style={{ ...h3, marginTop: 6 }}><Ic n="partes" tam={20} />Los {partes.length} partes <span style={{ fontWeight: 500, fontSize: 14, color: C.gray }}>· pulsa uno para verlo en grande</span></h3>
              {ordenados.map(p => <ParteCard key={p.id} parte={p} onVer={() => onVerParte(p)} onPrint={() => pdfParte(p)} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Informe para la familia de un alumno/a (PDF y texto para el correo) ─────
function datosFamilia(alumno, partes, banos) {
  const g = gr => partes.filter(p => p.gravedad === gr).length;
  return { leve: g("leve"), grave: g("grave"), muy_grave: g("muy_grave"), faltas: contarPor(partes, etiquetaTip), banos: banos.length,
    tutor: partes.find(p => p.tutor)?.tutor || alumno.tutor || "", ordenados: [...partes].sort((a, b) => new Date(a.ts) - new Date(b.ts)) };
}
function textoInformeFamilia(alumno, partes, banos, periodo, remitente, tutores = {}) {
  const d = datosFamilia(alumno, partes, banos);
  const tutor = tutores[alumno.curso]?.tutor || d.tutor;
  const lineas = d.ordenados.map(p => `• ${fmtD(p.ts)} (${p.hora || "hora no indicada"}) · ${sinEmoji(gObj(p.gravedad)?.label)} · ${etiquetaTip(p) || p.tipo}\n  ${p.descripcion}`).join("\n");
  const firma = remitente || tutor || "El equipo docente";
  return `Estimada familia de ${alumno.nombre} (${alumno.curso}):

Les escribimos desde el ${CENTRO} para informarles de la convivencia de ${alumno.nombre} durante ${periodo.texto}.

Resumen:
- Partes: ${partes.length} (${d.leve} leves, ${d.grave} graves y ${d.muy_grave} muy graves)${d.faltas[0] ? `\n- Lo que más se repite: ${d.faltas[0][0]} (${d.faltas[0][1]} ${d.faltas[0][1] === 1 ? "vez" : "veces"})` : ""}
- Salidas al baño durante las clases: ${d.banos}
${partes.length ? `\nDetalle de los partes:\n${lineas}\n` : "\nNo tiene ningún parte en este periodo.\n"}${banos.length ? `\nSalidas al baño durante las clases:\n${[...banos].sort((a, b) => new Date(a.salida || a.ts) - new Date(b.salida || b.ts)).map(b => `• ${fmtD(b.salida || b.ts)} · salió a las ${horaCorta(b.salida || b.ts)}${b.regreso ? `, volvió a las ${horaCorta(b.regreso)} (${minutosBano(b)} min)` : ""}${b.profesor ? ` · con ${b.profesor}` : ""}`).join("\n")}\n` : ""}
Nos gustaría hablar con ustedes para trabajar juntos. Pueden responder a este correo para concertar una cita.

Un saludo,
${firma}${tutor && firma !== tutor ? `\n(Tutor/a del grupo: ${tutor})` : tutor ? "\nTutor/a del grupo" : ""}`;
}
function pdfInformeFamilia(alumno, partes, banos, periodo, tutores = {}, remitente = "") {
  const d = datosFamilia(alumno, partes, banos);
  const tutor = tutores[alumno.curso]?.tutor || d.tutor;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = cabeceraPDF(doc, "Informe de convivencia para la familia", periodo.texto[0].toUpperCase() + periodo.texto.slice(1));
  autoTable(doc, { ...estiloTabla, startY: y, theme: "grid", columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, fillColor: [238, 245, 248] } },
    body: [["Alumno/a", alumno.nombre], ["Grupo", alumno.curso], ["Tutor/a", tutor || "-"], ["Correo del tutor/a", tutores[alumno.curso]?.email || "-"]].map(r => r.map(sinEmoji)) });
  y = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text("Resumen", 14, y); doc.setTextColor(0);
  autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Partes", "Leves", "Graves", "Muy graves", "Salidas al baño"]],
    body: [[partes.length, d.leve, d.grave, d.muy_grave, d.banos].map(String)], styles: { ...estiloTabla.styles, halign: "center", fontSize: 13 } });
  y = doc.lastAutoTable.finalY + 6;
  if (d.faltas.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Conductas que más se repiten:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    d.faltas.slice(0, 3).forEach(([k, n]) => { const l = doc.splitTextToSize(`• ${sinEmoji(k)} (${n})`, w - 28); doc.text(l, 14, y); y += l.length * 5; });
    y += 3;
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text("Detalle de los partes", 14, y); doc.setTextColor(0);
  autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Fecha", "Hora", "Gravedad", "Conducta", "Profesor/a", "Qué ocurrió"]],
    body: d.ordenados.length ? d.ordenados.map(p => [fmtD(p.ts), p.hora || "-", sinEmoji(gObj(p.gravedad)?.label), etiquetaTip(p) || p.tipo, p.profesor, p.descripcion].map(sinEmoji)) : [["-", "-", "-", "Ningún parte en este periodo", "-", "-"]],
    columnStyles: { 0: { cellWidth: 19 }, 1: { cellWidth: 15 }, 2: { cellWidth: 18 }, 3: { cellWidth: 45 }, 4: { cellWidth: 26 } } });
  y = doc.lastAutoTable.finalY + 8;
  if (banos.length) {
    if (y > 250) { doc.addPage(); y = 24; }
    const ordB = [...banos].sort((a, b) => new Date(a.salida || a.ts) - new Date(b.salida || b.ts));
    const mins = ordB.map(minutosBano).filter(Boolean);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO);
    doc.text(`Salidas al baño durante las clases (${banos.length}${mins.length ? ` · ${Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)} min de media` : ""})`, 14, y); doc.setTextColor(0);
    autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Fecha", "Salida", "Regreso", "Minutos fuera", "Con el profesor/a"]],
      body: ordB.map(b => [fmtD(b.salida || b.ts), horaCorta(b.salida || b.ts), b.regreso ? horaCorta(b.regreso) : "Sin anotar", minutosBano(b) ?? "-", b.profesor || "-"].map(v => sinEmoji(String(v)))),
      didParseCell: c => { if (c.section === "body" && c.column.index === 3 && Number(c.cell.raw) > 10) { c.cell.styles.textColor = [180, 83, 9]; c.cell.styles.fontStyle = "bold"; } } });
    y = doc.lastAutoTable.finalY + 8;
  }
  y = comparativaPDF(doc, y, { desde: periodo.desde, hasta: periodo.hasta, alumno, cursos: [alumno.curso] });
  if (y > 240) { doc.addPage(); y = 24; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const cierre = doc.splitTextToSize("Les enviamos este informe para mantenerles informados y trabajar juntos. Pueden solicitar una reunión con el tutor/a o con Jefatura de Estudios.", w - 28);
  doc.text(cierre, 14, y); y += cierre.length * 5;
  firmasPDF(doc, y, [{ cargo: remitente && remitente !== tutor ? "El profesor/a" : "El tutor/a", nombre: remitente || tutor }, { cargo: "Vº Bº Jefatura de Estudios", sello: true }, { cargo: "Recibí: la familia" }]);
  guardarPDF(doc, `informe-familia-${nombreArchivo(alumno.nombre)}-${periodo.desde}.pdf`);
}

// Botones para contactar con la familia de un alumno/a
// ─── Elegir a quién se envía un aviso ────────────────────────────────────────
// Correos del centro (Jefatura, Orientación…) configurables en Administración
const CorreosCentroCtx = createContext({ correos: {}, setCorreos: () => {}, profes: [] });
const DESTINOS_CENTRO = [
  { id: "jefatura", label: "Jefatura de Estudios", icono: "cargo-jefatura" },
  { id: "orientacion", label: "Orientación", icono: "tutor" },
  { id: "direccion", label: "Dirección", icono: "cargo-direccion" },
];
const correoValido = c => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(String(c || "").trim());
function ElegirDestinatarios({ alumno, tutorNombre, tutorEmail, asunto, cuerpo, porDefecto = ["familia", "tutor"], C }) {
  const { correos, profes = [] } = useContext(CorreosCentroCtx);
  const [profesElegidos, setProfesElegidos] = useState([]);
  const opciones = [
    { id: "familia", label: `Familia de ${alumno?.nombre || "el alumno/a"}`, email: alumno?.email, icono: "por-alumno" },
    { id: "tutor", label: `Tutor/a${tutorNombre ? `: ${tutorNombre}` : ""}`, email: tutorEmail, icono: "tutor" },
    ...DESTINOS_CENTRO.map(d => ({ ...d, email: correos?.[d.id] })),
  ];
  const [marcados, setMarcados] = useState(() => porDefecto.filter(id => correoValido(opciones.find(o => o.id === id)?.email)));
  const [otro, setOtro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const lista = [...opciones.filter(o => marcados.includes(o.id)).map(o => o.email.trim()),
    ...profesElegidos.map(n => profes.find(p => p.nombre === n)?.email).filter(correoValido),
    ...otro.split(/[,;\s]+/).filter(correoValido)];
  const unicos = [...new Set(lista)];
  const cambia = id => setMarcados(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]);
  const cuerpoCorto = cuerpo && cuerpo.length > 1800 ? cuerpo.slice(0, 1800) + "\n[…] (el texto completo va en el PDF adjunto)" : cuerpo || "";
  const mailto = `mailto:${unicos.map(encodeURIComponent).join(",")}?subject=${encodeURIComponent(asunto || "")}&body=${encodeURIComponent(cuerpoCorto)}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(unicos.join(", ")); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { window.prompt("Copia los correos:", unicos.join(", ")); } };
  return (
    <div style={{ background: R.azulClaro, padding: 12, marginTop: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: R.petroleo, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="selecciona-profesor" tam={32} />¿A quién se lo envías?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
        {opciones.map(o => {
          const ok = correoValido(o.email);
          return (
            <label key={o.id} title={ok ? o.email : "Sin correo registrado"} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "8px 10px", borderRadius: 6, border: `2px solid ${marcados.includes(o.id) && ok ? R.turquesa : C.white}`, background: C.white, cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : .55 }}>
              <input type="checkbox" checked={ok && marcados.includes(o.id)} disabled={!ok} onChange={() => cambia(o.id)} style={{ width: 22, height: 22, accentColor: R.azul, flexShrink: 0 }} />
              <Icono nombre={o.icono} tam={32} />
              <span style={{ fontSize: 15, lineHeight: 1.3, minWidth: 0 }}><b style={{ color: R.petroleo }}>{o.label}</b><br /><span style={{ color: R.petroleo, fontSize: 14 }}>{ok ? <>{o.email.split("@")[0]}@<wbr />{o.email.split("@").slice(1).join("@")}</> : DESTINOS_CENTRO.some(d => d.id === o.id) ? "Sin correo: añádelo en Administración" : "Sin correo registrado"}</span></span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <Icono nombre="anadir-profesor" tam={32} />
        <select value="" aria-label="Añadir a otro profesor/a" onChange={e => { const n = e.target.value; if (n) setProfesElegidos(prev => prev.includes(n) ? prev : [...prev, n]); }}
          style={{ flex: "1 1 0", minWidth: 0, minHeight: 48, padding: "8px 10px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: "#fff" }}>
          <option value="">Añadir a otro profesor/a…</option>
          {[...profes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
            <option key={p.nombre} value={p.nombre} disabled={!correoValido(p.email) || profesElegidos.includes(p.nombre)}>
              {p.nombre}{correoValido(p.email) ? ` · ${p.email}` : " · sin correo"}
            </option>
          ))}
        </select>
      </div>
      {profesElegidos.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {profesElegidos.map(n => (
            <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.white, color: R.petroleo, border: `2px solid ${R.turquesa}`, borderRadius: 22, padding: "4px 4px 4px 12px", fontSize: 15, fontWeight: 700 }}>
              {n}
              <button aria-label={`Quitar a ${n}`} onClick={() => setProfesElegidos(prev => prev.filter(x => x !== n))}
                style={{ border: "none", background: R.azulClaro, borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontWeight: 700, fontSize: 18, color: R.petroleo, lineHeight: "30px", padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input value={otro} onChange={e => setOtro(e.target.value)} placeholder="Otro correo (opcional): PTSC, familia separada…" aria-label="Otro correo"
        style={{ width: "100%", marginTop: 10, minHeight: 48, padding: "8px 12px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <a href={unicos.length ? mailto : undefined} onClick={e => { if (!unicos.length) e.preventDefault(); }}
          style={{ flex: "1 1 200px", textAlign: "center", textDecoration: "none", minHeight: 48, padding: "8px 12px", borderRadius: 6, background: unicos.length ? R.azul : R.gris, color: unicos.length ? "#fff" : R.petroleo, fontWeight: 700, fontSize: 17, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: unicos.length ? "pointer" : "not-allowed" }}>
          <Icono nombre="boton-enviar" tam={30} />Abrir en mi correo ({unicos.length})
        </a>
        <button onClick={copiar} disabled={!unicos.length} style={{ flex: "1 1 160px", minHeight: 48, padding: "8px 12px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontWeight: 700, fontSize: 16, cursor: unicos.length ? "pointer" : "not-allowed" }}>
          {copiado ? "✅ Correos copiados" : "Copiar solo los correos"}
        </button>
      </div>
      <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}>Se abre tu programa de correo con los destinatarios, el asunto y el texto. Revisa y adjunta el PDF antes de enviarlo.</div>
    </div>
  );
}

// Correos del centro, en Administración
// Zonas de guardia (Administración): nombre, edificio, añadir y ocultar. Nunca se borran:
// lo ya guardado (guardias, firmas, medidas) apunta a su id.
function ZonasCentro({ zonas, setZonas }) {
  const lista = zonas?.length ? zonas : ZONAS_POR_DEFECTO;
  const [nueva, setNueva] = useState({ label: "", edificio: "" });
  const cambiar = (id, cambios) => setZonas(lista.map(z => z.id === id ? { ...z, ...cambios } : z));
  const edificios = [...new Set(lista.map(z => z.edificio).filter(e => e && e !== "-"))].sort();
  const campo = { width: "100%", minHeight: 44, padding: "8px 12px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: C.white, boxSizing: "border-box" };
  const boton = { minHeight: 44, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
  const anadir = () => {
    const label = nueva.label.trim(); if (!label) return;
    const edificio = nueva.edificio.trim() || "-";
    setZonas([...lista, { id: `z-${Date.now()}`, label, edificio, tipo: edificio === "-" ? "otra" : "pasillo" }]);
    setNueva({ label: "", edificio: "" });
  };
  const grupos = [...edificios, "-"].map(ed => ({ ed, zs: lista.filter(z => (z.edificio || "-") === ed) })).filter(g => g.zs.length);
  return (
    <div style={{ marginBottom: 24 }}>
      <TituloBloque titulo="Zonas de guardia" sub="Edificios, plantas y zonas del recreo de tu centro, para el cuadrante de guardias" icono="edificio" />
      <div style={{ background: R.azulClaro, padding: 16, display: "grid", gap: 14 }}>
        <datalist id="gd-edificios">{edificios.map(e => <option key={e} value={e} />)}</datalist>
        {grupos.map(({ ed, zs }) => (
          <div key={ed}>
            <div style={{ background: R.turquesa, color: R.noche, fontWeight: 700, fontSize: 16, padding: "8px 12px" }}>{ed === "-" ? "Sin edificio (aula, recreo y otras)" : `Edificio ${ed}`}</div>
            <div style={{ display: "grid", gap: 1, background: R.turquesaClaro }}>
              {zs.map(z => {
                const fija = ZONAS_FIJAS.includes(z.id);
                return (
                  <div key={z.id} data-zona={z.id} style={{ background: z.oculta ? R.gris : C.white, padding: "10px 12px", display: "grid", gridTemplateColumns: "auto minmax(60px, 120px) 1fr", gap: 8, alignItems: "center" }}>
                    <input aria-label={`Nombre de la zona ${z.label}`} value={z.label} onChange={e => cambiar(z.id, { label: e.target.value })} style={{ ...campo, gridColumn: "1 / -1", opacity: z.oculta ? .7 : 1 }} />
                    <span style={{ fontSize: 14, color: R.petroleo }}>Edificio</span>
                    <input aria-label={`Edificio de ${z.label}`} list="gd-edificios" value={z.edificio === "-" ? "" : z.edificio} placeholder="—" disabled={fija}
                      onChange={e => cambiar(z.id, { edificio: e.target.value.trim() || "-" })} style={{ ...campo, background: fija ? R.gris : C.white }} />
                    <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 8 }}>
                      {z.oculta && <span style={{ fontSize: 14, color: R.petroleo }}>Oculta</span>}
                      {fija
                        ? <span style={{ fontSize: 14, color: R.petroleo }}>Necesaria</span>
                        : <button type="button" onClick={() => cambiar(z.id, { oculta: !z.oculta })} style={boton}>{z.oculta ? "Mostrar" : "Ocultar"}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: R.petroleo }}>Añadir una zona</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(60px, 120px) 1fr", gap: 8, alignItems: "center" }}>
            <input id="gd-zona-nueva" aria-label="Nombre de la zona nueva" value={nueva.label} onChange={e => setNueva(v => ({ ...v, label: e.target.value }))} placeholder="Por ejemplo, Edificio D · Planta 0 · Pasillo" style={{ ...campo, gridColumn: "1 / -1" }} />
            <span style={{ fontSize: 14, color: R.petroleo }}>Edificio</span>
            <input aria-label="Edificio de la zona nueva" list="gd-edificios" value={nueva.edificio} onChange={e => setNueva(v => ({ ...v, edificio: e.target.value }))} placeholder="—" style={campo} />
            <button type="button" onClick={anadir} disabled={!nueva.label.trim()} style={{ ...boton, justifySelf: "end", background: nueva.label.trim() ? R.azul : R.gris, color: nueva.label.trim() ? "#fff" : R.petroleo, border: "none" }}>Añadir</button>
          </div>
          <div style={{ fontSize: 14, color: R.petroleo }}>Deja el edificio vacío para zonas del recreo u otras. Las zonas no se borran: «Ocultar» las quita del cuadrante sin perder las guardias ya hechas.</div>
        </div>
      </div>
    </div>
  );
}

// Horario del centro (Administración): horas de inicio y fin de cada franja
function HorarioCentro({ horario, setHorario }) {
  const campo = { minHeight: 48, padding: "8px 10px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: C.white, boxSizing: "border-box", width: "100%" };
  const conCero = t => t.split(":").map((x, i) => i === 0 ? x.padStart(2, "0") : x).join(":");
  const sinCero = t => t.replace(/^0(\d)/, "$1");
  const partes = h => (horario[h] && horario[h].includes("–") ? horario[h] : HORARIO_POR_DEFECTO[h]).split("–").map(x => conCero(x.trim()));
  const cambiar = (h, i, valor) => setHorario(prev => { const p = partes(h); p[i] = valor; return { ...prev, [h]: `${sinCero(p[0])} – ${sinCero(p[1])}` }; });
  const mal = h => horario[h] && !tramoValido(horario[h]);
  const solapa = (h, i) => i > 0 && !mal(h) && !mal(HORAS[i - 1]) && enMinutos(partes(h)[0]) < enMinutos(partes(HORAS[i - 1])[1]);
  return (
    <div style={{ marginBottom: 24 }}>
      <TituloBloque titulo="Horario del centro" sub="Las horas de cada franja: se usan en guardias, medidas, partes y en «Ahora»" icono="horario" />
      <div style={{ background: R.azulClaro, padding: 16, display: "grid", gap: 10 }}>
        {HORAS.map((h, i) => (
          <div key={h} style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px 10px", alignItems: "center" }}>
            <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: 16, color: R.petroleo }}>{h}</div>
            <label style={{ fontSize: 14, color: R.petroleo }}>Empieza
              <input type="time" aria-label={`Inicio de ${h}`} value={partes(h)[0]} onChange={e => e.target.value && cambiar(h, 0, e.target.value)} style={{ ...campo, marginTop: 4 }} /></label>
            <label style={{ fontSize: 14, color: R.petroleo }}>Acaba
              <input type="time" aria-label={`Fin de ${h}`} value={partes(h)[1]} onChange={e => e.target.value && cambiar(h, 1, e.target.value)} style={{ ...campo, marginTop: 4 }} /></label>
            {(mal(h) || solapa(h, i)) && <div style={{ gridColumn: "1 / -1", fontSize: 14, color: R.noche, background: R.crema, borderLeft: `6px solid ${R.mostaza}`, padding: "6px 10px" }}>
              {mal(h) ? `⚠️ ${h} termina antes de empezar: mientras no se corrija, se usa ${HORARIO_POR_DEFECTO[h]}.` : `⚠️ ${h} empieza antes de que acabe ${HORAS[i - 1]}.`}
            </div>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: R.petroleo, flex: "1 1 220px" }}>Los cambios se guardan solos. Las franjas son siempre las mismas; solo cambian sus horas.</span>
          <button type="button" onClick={() => setHorario({})} style={{ minHeight: 44, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Volver al horario inicial</button>
        </div>
      </div>
    </div>
  );
}

// Datos del centro (Administración): nombre y localidad que salen en la app, los PDF y los correos
function DatosCentro({ datos, setDatos }) {
  const campo = { width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: C.white, boxSizing: "border-box" };
  const etiqueta = { display: "block", fontWeight: 700, fontSize: 15, color: R.petroleo, marginBottom: 8 };
  const nombre = datos.nombre?.trim() || CENTRO_POR_DEFECTO.nombre, ciudad = datos.ciudad?.trim() || CENTRO_POR_DEFECTO.ciudad;
  return (
    <div style={{ marginBottom: 24 }}>
      <TituloBloque titulo="Datos del centro" sub="Nombre, localidad y logotipo: salen en la entrada, la cabecera, los PDF y los correos a las familias" icono="edificio" />
      <div style={{ background: R.azulClaro, padding: 16, display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <div>
            <label style={etiqueta} htmlFor="gd-centro-nombre">Nombre del centro</label>
            <input id="gd-centro-nombre" value={datos.nombre || ""} onChange={e => setDatos(d => ({ ...d, nombre: e.target.value }))} placeholder="Por ejemplo, IES Enrique Tierno Galván" style={campo} />
          </div>
          <div>
            <label style={etiqueta} htmlFor="gd-centro-ciudad">Localidad</label>
            <input id="gd-centro-ciudad" value={datos.ciudad || ""} onChange={e => setDatos(d => ({ ...d, ciudad: e.target.value }))} placeholder="Por ejemplo, Madrid" style={campo} />
          </div>
        </div>
        <div>
          <div style={etiqueta}>Logotipo para los documentos <span style={{ fontWeight: 400 }}>(opcional)</span></div>
          <div style={{ fontSize: 14, color: R.petroleo, marginBottom: 8 }}>Sale al pie de cada página de los PDF. Usa solo imágenes que el centro tenga permiso para usar.</div>
          {datos.logo?.data
            ? <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 10 }}>
                <img src={datos.logo.data} alt="Logotipo para los documentos" style={{ maxHeight: 60, maxWidth: "100%", display: "block" }} />
                <button type="button" onClick={() => setDatos(d => ({ ...d, logo: null }))} style={{ minHeight: 44, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Quitar logotipo</button>
              </div>
            : <input id="gd-centro-logo" type="file" accept="image/png,image/jpeg" aria-label="Logotipo para los documentos" onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                const lector = new FileReader();
                lector.onload = () => {
                  const img = new Image();
                  img.onload = () => {
                    // Se reduce para que ocupe poco: como mucho 900 × 240 píxeles
                    const k = Math.min(1, 900 / img.width, 240 / img.height);
                    const lienzo = document.createElement("canvas");
                    lienzo.width = Math.round(img.width * k); lienzo.height = Math.round(img.height * k);
                    lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
                    setDatos(d => ({ ...d, logo: { data: lienzo.toDataURL("image/png"), w: lienzo.width, h: lienzo.height } }));
                  };
                  img.src = lector.result;
                };
                lector.readAsDataURL(f);
              }} style={{ fontSize: 16, color: R.petroleo }} />}
        </div>
        <div style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: "10px 14px", fontSize: 15, color: R.petroleo }}>
          Así aparecerá: <b>{nombre.toUpperCase()} · {ciudad.toUpperCase()}</b>
          <div style={{ marginTop: 4 }}>En los correos a las familias: «Les escribimos desde el {nombre}…». Los cambios se guardan solos.</div>
        </div>
      </div>
    </div>
  );
}

function CorreosCentro({ C }) {
  const { correos, setCorreos } = useContext(CorreosCentroCtx);
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <h3 style={{ marginTop: 0, color: C.dark, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="mensaje-enviar" tam={40} />Correos del centro para los avisos</h3>
      <div style={{ fontSize: 14, color: C.gray, marginBottom: 12 }}>Aparecen como destinatarios al avisar de un parte o enviar un informe a la familia.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
        {DESTINOS_CENTRO.map(d => (
          <label key={d.id} style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Icono nombre={d.icono} tam={24} />{d.label}</span>
            <input type="email" value={correos?.[d.id] || ""} placeholder="correo@educa.madrid.org" onChange={e => setCorreos(prev => ({ ...prev, [d.id]: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${correos?.[d.id] && !correoValido(correos[d.id]) ? C.salmon : "#CDE9ED"}`, fontSize: 14, boxSizing: "border-box" }} />
          </label>
        ))}
      </div>
    </div>
  );
}

function ContactoFamilia({ alumno, partes, banos, periodo, tutores, remitente, C }) {
  const [copiado, setCopiado] = useState("");
  const copiar = async (texto, que) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(que); setTimeout(() => setCopiado(""), 2000); }
    catch { window.prompt("Copia el texto:", texto); }
  };
  if (!alumno) return null;
  const btn = { flex: "1 1 150px", minHeight: 48, padding: "8px 12px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontWeight: 700, fontSize: 16, cursor: "pointer" };
  return (
    <div style={{ marginTop: 10, border: `1px solid ${R.turquesaClaro}` }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: R.noche, background: R.mostaza, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="mensaje-enviar" tam={30} />Contactar con la familia</div>
      <div style={{ padding: 12, background: C.white }}>
      <div style={{ fontSize: 15, color: R.petroleo, marginBottom: 10 }}><Ic n="mensaje-enviar" tam={20} />{alumno.email || "sin correo"} · 📱 {alumno.telefono || "sin teléfono"}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn} onClick={() => pdfInformeFamilia(alumno, partes, banos, periodo, tutores, remitente)}><Ic n="informe" tam={20} />Ver informe para la familia</button>
        <button style={btn} onClick={() => copiar(textoInformeFamilia(alumno, partes, banos, periodo, remitente, tutores), "texto")}>{copiado === "texto" ? "✅ Copiado" : "📋 Copiar texto del correo"}</button>
      </div>
      <ElegirDestinatarios alumno={alumno} tutorNombre={tutores[alumno.curso]?.tutor || alumno.tutor} tutorEmail={tutores[alumno.curso]?.email}
        asunto={`Convivencia de ${alumno.nombre} (${alumno.curso}) · ${periodo.texto}`} cuerpo={textoInformeFamilia(alumno, partes, banos, periodo, remitente, tutores)} C={C} />
      </div>
    </div>
  );
}

// ─── Avisos a familias: alumnado con muchos partes en el trimestre ───────────
const UMBRAL_AVISO = 3;
// Trimestres del curso: septiembre-diciembre, enero-marzo y abril-junio
function trimestreDe(fecha = new Date()) {
  const d = parseISO(fecha), y = d.getFullYear(), m = d.getMonth();
  const [n, ini, fin] = m >= 8 ? [1, new Date(y, 8, 1), new Date(y, 11, 31)] : m <= 2 ? [2, new Date(y, 0, 1), new Date(y, 2, 31)] : [3, new Date(y, 3, 1), new Date(y, 7, 31)];
  const texto = `el ${n}º trimestre (${n === 1 ? "septiembre a diciembre" : n === 2 ? "enero a marzo" : "abril a junio"} de ${y})`;
  return { n, desde: isoLocal(ini), hasta: isoLocal(fin), texto, clave: `${y}-T${n}` };
}
// Devuelve el alumnado que ha llegado al umbral: por los partes que he puesto yo y, si soy tutor/a, por los de mi grupo
function alumnosParaAvisar({ partes, usuario, tutores = {}, avisos = {}, umbral = UMBRAL_AVISO }) {
  const tri = trimestreDe();
  const misTutorias = Object.entries(tutores).filter(([, t]) => t?.tutor === usuario).map(([c]) => c);
  const delTri = partes.filter(p => { const f = isoLocal(p.ts); return f >= tri.desde && f <= tri.hasta; });
  const lista = [];
  const agrupar = (ps, ambito) => {
    const porAlumno = new Map();
    ps.forEach(p => { const k = p.alumnoId ?? p.alumno; if (!porAlumno.has(k)) porAlumno.set(k, []); porAlumno.get(k).push(p); });
    porAlumno.forEach((ps2, k) => {
      if (ps2.length < umbral) return;
      const id = `${usuario}|${ambito}|${k}|${tri.clave}`;
      const aviso = avisos[id];
      lista.push({ id, alumnoId: ps2[0].alumnoId, alumno: ps2[0].alumno, curso: ps2[0].curso, ambito, partes: ps2, n: ps2.length,
        graves: ps2.filter(p => p.gravedad !== "leve").length, aviso, pendiente: !aviso || ps2.length > aviso.n });
    });
  };
  agrupar(delTri.filter(p => p.profesor === usuario), "mios");
  misTutorias.forEach(c => agrupar(delTri.filter(p => p.curso === c), `tutoria:${c}`));
  return { tri, lista: lista.sort((a, b) => b.pendiente - a.pendiente || b.n - a.n) };
}

function PanelAvisos({ partes, alumnos, banos, usuario, tutores, avisos, setAvisos, onVerPartes, C }) {
  const { tri, lista } = alumnosParaAvisar({ partes, usuario, tutores, avisos });
  const [abierto, setAbierto] = useState(null);
  const [verHechos, setVerHechos] = useState(false);
  const pendientes = lista.filter(x => x.pendiente), hechos = lista.filter(x => !x.pendiente);
  const marcar = x => setAvisos(prev => ({ ...prev, [x.id]: { n: x.n, ts: new Date().toISOString(), por: usuario } }));
  const deshacer = x => setAvisos(prev => { const r = { ...prev }; delete r[x.id]; return r; });
  const tarjeta = (x) => {
    const al = alumnos.find(a => a.id === x.alumnoId) || { id: x.alumnoId, nombre: x.alumno, curso: x.curso };
    const banosAl = banos.filter(b => b.alumno === x.alumno && b.curso === x.curso && isoLocal(b.ts || b.salida) >= tri.desde && isoLocal(b.ts || b.salida) <= tri.hasta);
    return (
      <div key={x.id} style={{ background: C.white, padding: 12, marginBottom: 8, border: `1px solid ${R.turquesaClaro}`, borderLeft: `10px solid ${x.pendiente ? R.mostaza : R.verde}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: R.petroleo, fontSize: 17 }}>{x.alumno} <span style={{ fontWeight: 400, fontSize: 15 }}>· {x.curso}</span></div>
            <div style={{ fontSize: 14, color: R.petroleo, lineHeight: 1.45 }}>
              <b style={{ color: R.noche }}>{x.n} partes</b> este trimestre{x.graves ? ` (${x.graves} graves o muy graves)` : ""} · {x.ambito === "mios" ? "puestos por ti" : `en tu tutoría`}
              {x.aviso && <> · {x.pendiente ? `avisada con ${x.aviso.n}, hay ${x.n - x.aviso.n} nuevo(s)` : `✅ familia avisada el ${fmtD(x.aviso.ts)}`}</>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onVerPartes(x)} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}><Ic n="buscar" tam={22} />Ver partes</button>
            <button onClick={() => setAbierto(abierto === x.id ? null : x.id)} style={{ background: R.mostaza, color: R.noche, border: "none", borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}><Ic n="mensaje-enviar" tam={22} />Avisar a la familia</button>
            {x.pendiente
              ? <button onClick={() => marcar(x)} style={{ background: R.verde, color: R.noche, border: "none", borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>✅ Ya he avisado</button>
              : <button onClick={() => deshacer(x)} style={{ background: "none", color: R.azul, border: "none", textDecoration: "underline", minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15 }}>Deshacer</button>}
          </div>
        </div>
        {abierto === x.id && <ContactoFamilia alumno={al} partes={x.partes} banos={banosAl} periodo={tri} tutores={tutores} remitente={usuario} C={C} />}
      </div>
    );
  };
  return (
    <div className="no-print" style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, color: R.noche, fontSize: 17, padding: "10px 14px", background: pendientes.length ? R.mostaza : R.verde }}>
        <Ic n="alertas" tam={24} />{pendientes.length ? `${pendientes.length} alumno/a(s) con ${UMBRAL_AVISO} o más partes: conviene avisar a su familia` : "Avisos a familias"}
      </div>
      <div style={{ background: R.crema, padding: 14 }}>
      <div style={{ fontSize: 15, color: R.petroleo, marginBottom: 12, lineHeight: 1.45 }}>
        Alumnado con {UMBRAL_AVISO} o más partes en {tri.texto}: los que has puesto tú{Object.values(tutores).some(t => t?.tutor === usuario) ? " y los de tu tutoría" : ""}. Cuando avises, pulsa «Ya he avisado». Si luego tiene más partes, volverá a aparecer.
      </div>
      {pendientes.length === 0 && <div style={{ fontSize: 16, color: R.petroleo, fontWeight: 700, marginBottom: hechos.length ? 8 : 0 }}>✅ No tienes avisos pendientes.</div>}
      {pendientes.map(tarjeta)}
      {hechos.length > 0 && (
        <>
          <button onClick={() => setVerHechos(v => !v)} style={{ background: "none", border: "none", color: R.azul, cursor: "pointer", fontSize: 16, fontWeight: 700, minHeight: 44, padding: 0, marginTop: 4 }}>
            {verHechos ? "▾" : "▸"} Familias ya avisadas ({hechos.length})
          </button>
          {verHechos && <div style={{ marginTop: 8 }}>{hechos.map(tarjeta)}</div>}
        </>
      )}
      </div>
    </div>
  );
}

function EstadisticasDocumentos({ avisos = {}, setAvisos, modo = "jefatura", usuario = "", partes: partesTodos, banos: banosTodos, ausencias: ausTodas, firmas: firmasTodas, listas: listasTodas, alumnos: alumnosTodos, profesores, cuadrante, apoyosGuardia, sustitutosGuardia, tutores, onVerParte, C, inpStyle, selStyle, labelStyle }) {
  const [detalle, setDetalle] = useState(null); // { titulo, subtitulo, partes }
  // Profesorado: solo ve los partes que ha puesto y, si es tutor/a, los de su grupo
  const esProfe = modo === "profesor";
  const misTutorias = esProfe ? Object.entries(tutores || {}).filter(([, t]) => t?.tutor === usuario).map(([c]) => c).sort() : [];
  const [ambito, setAmbito] = useState(() => misTutorias[0] || "mios");
  const ambitoOk = ambito === "mios" || misTutorias.includes(ambito) ? ambito : "mios";
  const partes = !esProfe ? partesTodos : ambitoOk === "mios" ? partesTodos.filter(p => p.profesor === usuario) : partesTodos.filter(p => p.curso === ambitoOk);
  const banos = !esProfe ? banosTodos : ambitoOk === "mios" ? banosTodos.filter(b => b.profesor === usuario) : banosTodos.filter(b => b.curso === ambitoOk);
  const ausencias = esProfe ? [] : ausTodas, firmas = esProfe ? [] : firmasTodas, listas = esProfe ? [] : listasTodas;
  const alumnos = !esProfe ? alumnosTodos : ambitoOk === "mios" ? alumnosTodos.filter(a => partes.some(p => p.alumnoId === a.id) || banos.some(b => b.alumno === a.nombre && b.curso === a.curso)) : alumnosTodos.filter(a => a.curso === ambitoOk);
  const [tipo, setTipo] = useState("dia");
  const [ref, setRef] = useState(isoLocal());
  const [desdeLibre, setDesdeLibre] = useState(isoLocal(sumarDias(new Date(), -14)));
  const [hastaLibre, setHastaLibre] = useState(isoLocal());
  const [alumnoDoc, setAlumnoDoc] = useState("");
  const [grupoDoc, setGrupoDoc] = useState("");
  const [profDoc, setProfDoc] = useState("");
  const periodo = calcularPeriodo(tipo, ref, desdeLibre, hastaLibre);
  const equipo = { profesores, cuadrante: esProfe ? {} : cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias };
  const est = estadisticasPeriodo({ ...periodo, partes, banos, ausencias, firmas, listas, equipo, tutores });
  const cursos = [...new Set(alumnos.map(a => a.curso))].sort();
  const pct = (a, b) => b ? Math.round(100 * a / b) : null;
  const maxDia = Math.max(1, ...est.porDia.map(d => d.partes));
  const periodoTxt = periodo.texto[0].toUpperCase() + periodo.texto.slice(1);
  const abrirDia = f => setDetalle({ titulo: `Partes del ${parseISO(f).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`, partes: est.partes.filter(p => isoLocal(p.ts) === f) });
  const abrir = (titulo, filtro) => setDetalle({ titulo, subtitulo: periodoTxt, partes: est.partes.filter(filtro) });

  const tarjeta = { background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 16, marginBottom: 14 };
  const h3 = { margin: "0 0 12px", color: R.petroleo, fontSize: 18, display: "flex", alignItems: "center", gap: 8 };
  const btnDoc = (activo = true) => ({ display: "block", width: "100%", textAlign: "left", minHeight: 48, padding: "12px 14px", borderRadius: 6, border: `2px solid ${activo ? R.turquesa : R.gris}`, background: activo ? C.white : R.gris, color: R.petroleo, opacity: activo ? 1 : .7, cursor: activo ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 16 });
  const sub = { display: "block", fontWeight: 400, fontSize: 14, color: R.petroleo, marginTop: 4 };

  const partesAlumno = est.partes.filter(p => String(p.alumnoId) === alumnoDoc);
  const partesGrupo = est.partes.filter(p => p.curso === grupoDoc);
  const ausProf = est.ausencias.filter(a => a.profesor === profDoc);
  const alumnoObj = alumnos.find(a => String(a.id) === alumnoDoc);
  const nombreAlumno = alumnoObj?.nombre || "";
  const banosAlumno = est.banos.filter(b => alumnoObj && b.alumno === alumnoObj.nombre && b.curso === alumnoObj.curso);

  return (
    <div>
      <TituloBloque titulo={esProfe ? "Mis estadísticas e informes" : "Estadísticas y documentos"} sub="Cifras, gráficos y documentos del periodo que elijas" icono="estadisticas" />
      <div style={{ height: 16 }} />
      {esProfe && (
        <div className="no-print" style={{ ...tarjeta, background: R.azulClaro, border: "none" }}>
          <label style={labelStyle}>¿Qué partes quieres analizar?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ...(misTutorias.length
                ? misTutorias.map(c => ({ id: c, txt: `🏫 Como tutor/a: ${c}`, sub: "Todos los partes de tu grupo, los ponga quien los ponga" }))
                : [{ id: "sin-tutoria", txt: "🏫 Como tutor/a", sub: "No tienes ninguna tutoría asignada", off: true }]),
              { id: "mios", txt: "👤 Como profesor/a: mis partes", sub: "Los partes que has puesto y el alumnado que sale al baño en tus clases" },
            ].map(o => (
              <button key={o.id} disabled={o.off} onClick={() => { setAmbito(o.id); setAlumnoDoc(""); setGrupoDoc(""); }}
                style={{ flex: "1 1 220px", textAlign: "left", minHeight: 56, padding: "10px 14px", borderRadius: 6, border: `2px solid ${ambitoOk === o.id ? R.azul : C.white}`, background: o.off ? R.gris : C.white, cursor: o.off ? "not-allowed" : "pointer", opacity: o.off ? .6 : 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: R.petroleo, display: "flex", alignItems: "center", gap: 6 }}>{ambitoOk === o.id ? "✔ " : ""}<ConIcono texto={o.txt} tam={34} /></div>
                <div style={{ fontSize: 14, color: R.petroleo }}>{o.sub}</div>
              </button>
            ))}
          </div>
          {!misTutorias.length && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 10 }}>Estás viendo tus partes como profesor/a. Si eres tutor/a y no aparece tu grupo, pide a Administración que te asigne la tutoría.{MODO_DEMO ? " En la demostración, para verlo como tutor/a pulsa «Salir» y entra con el botón «Tutor/a de un grupo»." : ""}</div>}
        </div>
      )}
      {detalle && <DetallePartes {...detalle} tutores={tutores} onVerParte={onVerParte} onCerrar={() => setDetalle(null)} C={C} />}
      {esProfe && setAvisos && <PanelAvisos partes={partesTodos} alumnos={alumnosTodos} banos={banosTodos} usuario={usuario} tutores={tutores} avisos={avisos} setAvisos={setAvisos} C={C}
        onVerPartes={x => setDetalle({ titulo: `Partes de ${x.alumno} (${x.curso})`, subtitulo: `${trimestreDe().texto[0].toUpperCase()}${trimestreDe().texto.slice(1)} · ${x.ambito === "mios" ? `puestos por ${usuario}` : "tutoría"}`, partes: x.partes })} />}

      {/* Selector de periodo */}
      <div className="no-print" style={tarjeta}>
        <label style={labelStyle}>¿De qué periodo?</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setTipo(p.id)}
              style={{ minHeight: 44, padding: "0 16px", borderRadius: 22, border: `2px solid ${tipo === p.id ? R.azul : R.turquesa}`, background: tipo === p.id ? R.azul : C.white, color: tipo === p.id ? "#fff" : R.petroleo, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {p.label}
            </button>
          ))}
        </div>
        {tipo === "rango" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            <div><label style={{ fontSize: 14, color: R.petroleo, fontWeight: 700 }}>Desde</label><input type="date" value={desdeLibre} onChange={e => setDesdeLibre(e.target.value)} style={inpStyle} /></div>
            <div><label style={{ fontSize: 14, color: R.petroleo, fontWeight: 700 }}>Hasta</label><input type="date" value={hastaLibre} onChange={e => setHastaLibre(e.target.value)} style={inpStyle} /></div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setRef(moverPeriodo(tipo, ref, -1))} aria-label="Periodo anterior" style={{ minWidth: 48, minHeight: 48, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.turquesa}`, background: C.white, color: R.petroleo, cursor: "pointer", fontWeight: 700 }}>◀</button>
            <input type="date" value={ref} onChange={e => setRef(e.target.value || isoLocal())} style={{ ...inpStyle, width: "auto", flex: "1 1 160px", marginBottom: 0 }} aria-label="Fecha" />
            <button onClick={() => setRef(moverPeriodo(tipo, ref, 1))} aria-label="Periodo siguiente" style={{ minWidth: 48, minHeight: 48, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.turquesa}`, background: C.white, color: R.petroleo, cursor: "pointer", fontWeight: 700 }}>▶</button>
            <button onClick={() => setRef(isoLocal())} style={{ minHeight: 48, padding: "0 16px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, cursor: "pointer", fontWeight: 700, fontSize: 16 }}>Hoy</button>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: R.azul }}><Ic n="fecha-hora" tam={20} />{periodo.texto[0].toUpperCase() + periodo.texto.slice(1)} · {est.lectivos.length} día(s) lectivo(s)</div>
      </div>

      {/* Cifras principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 14 }}>
        {[
          { n: est.partes.length, t: "Partes", s: `${est.gravedad.leve} leves · ${est.gravedad.grave} graves · ${est.gravedad.muy_grave} muy graves`, c: R.verde, click: () => abrir("Todos los partes", () => true) },
          { n: est.alumnosConParte, t: "Alumnos/as con parte", s: est.lectivos.length ? `${(est.partes.length / est.lectivos.length).toFixed(1)} partes por día` : "", c: R.turquesa },
          { n: est.banos.length, t: "Salidas al baño", s: est.banoMedio ? `${est.banoMedio} min de media · ${est.banosLargos} de más de 10 min` : "", c: R.verde },
          ...(esProfe ? [
            { n: est.gravedad.grave + est.gravedad.muy_grave, t: "Graves y muy graves", s: "Pulsa para verlos", c: R.azul, click: () => abrir("Partes graves y muy graves", p => p.gravedad !== "leve") },
          ] : [
            { n: est.ausencias.length, t: "Ausencias profesorado", s: `${est.horasAusencia} horas · ${est.profesoresAusentes} profesores/as`, c: R.azul },
            { n: est.guardiasDebidas ? `${pct(est.guardiasFirmadas, est.guardiasDebidas)} %` : "-", t: "Guardias firmadas", s: `${est.guardiasFirmadas} de ${est.guardiasDebidas}`, c: R.mostaza },
            { n: est.listasPasadas, t: "Listas en guardia", s: `${est.faltasEnListas} faltas anotadas`, c: R.petroleo },
          ]),
        ].map(k => (
          <div key={k.t} onClick={k.click} title={k.click ? "Pulsa para verlos en detalle" : undefined} style={{ background: C.white, padding: 14, border: `1px solid ${R.turquesaClaro}`, borderTop: `8px solid ${k.c}`, cursor: k.click ? "pointer" : "default" }}>
            <div style={{ fontFamily: TITULO, fontSize: 32, fontWeight: 400, color: R.petroleo }}>{k.n}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: R.petroleo }}>{k.t}</div>
            <div style={{ fontSize: 14, color: R.petroleo, marginTop: 2 }}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Evolución por día */}
      {est.porDia.length > 1 && (
        <div style={tarjeta}>
          <h3 style={h3}>Partes por día</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, overflowX: "auto", paddingBottom: 4 }}>
            {est.porDia.map(d => (
              <div key={d.fecha} title={`${fmtD(parseISO(d.fecha))}: ${d.partes} partes (${d.leve} leves, ${d.grave} graves, ${d.muy_grave} muy graves) · ${d.banos} baños · ${d.ausencias} ausencias. Pulsa para ver el detalle.`}
                role="button" tabIndex={0} onClick={() => abrirDia(d.fecha)} onKeyDown={e => { if (e.key === "Enter") abrirDia(d.fecha); }}
                onMouseOver={e => { e.currentTarget.style.background = R.azulClaro; }} onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
                style={{ flex: "1 0 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", cursor: "pointer", borderRadius: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: R.petroleo }}>{d.partes || ""}</div>
                <div style={{ width: "100%", maxWidth: 34, display: "flex", flexDirection: "column-reverse", height: `${(100 * d.partes) / maxDia}%`, minHeight: d.partes ? 3 : 0, borderRadius: "4px 4px 0 0", overflow: "hidden" }}>
                  <div style={{ flex: d.leve, background: COLOR_GRAVEDAD.leve }} /><div style={{ flex: d.grave, background: COLOR_GRAVEDAD.grave }} /><div style={{ flex: d.muy_grave, background: COLOR_GRAVEDAD.muy_grave }} />
                </div>
                <div style={{ fontSize: 14, color: R.petroleo, marginTop: 3 }}>{parseISO(d.fecha).getDate()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 14, color: R.petroleo, marginTop: 10, flexWrap: "wrap" }}>
            <span><span style={{ display: "inline-block", width: 14, height: 14, background: COLOR_GRAVEDAD.leve, verticalAlign: -2 }} /> Leves</span>
            <span><span style={{ display: "inline-block", width: 14, height: 14, background: COLOR_GRAVEDAD.grave, verticalAlign: -2 }} /> Graves</span>
            <span><span style={{ display: "inline-block", width: 14, height: 14, background: COLOR_GRAVEDAD.muy_grave, verticalAlign: -2 }} /> Muy graves</span>
            <span><b>Pulsa una columna</b> para ver ese día en grande: motivos, faltas que más se repiten y cada parte.</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        <div style={tarjeta}><h3 style={h3}><Ic n="por-curso" tam={20} />Partes por grupo</h3><Barras datos={est.porGrupo.map(r => [`${r.curso}${r.tutor ? ` · ${r.tutor}` : ""}`, r.total, r.curso])} onClick={c => abrir(`Partes de ${c}`, p => p.curso === c)} /></div>
        <div style={tarjeta}><h3 style={h3}><Ic n="hora-reloj" tam={20} />Partes por hora de clase</h3><Barras datos={est.porHora} color={R.azul} onClick={h => abrir(`Partes a ${h}`, p => p.hora === h)} /></div>
        <div style={tarjeta}><h3 style={h3}><Ic n="por-alumno" tam={20} />Alumnado con más partes</h3><Barras datos={est.porAlumno} color={R.mostaza} onClick={k => abrir(`Partes de ${k}`, p => `${p.alumno} (${p.curso})` === k)} /></div>
        <div style={tarjeta}><h3 style={h3}><Ic n="tipificacion" tam={20} />Faltas más frecuentes</h3><Barras datos={est.porTipificacion} color={R.petroleo} onClick={k => abrir(k, p => etiquetaTip(p) === k)} /></div>
        <div style={tarjeta}><h3 style={h3}><Ic n="banos" tam={20} />Salidas al baño por grupo</h3><Barras datos={est.banosPorGrupo} color={R.verde} /></div>
        {esProfe
          ? <div style={tarjeta}><h3 style={h3}><Ic n="banos" tam={20} />Alumnado que más sale al baño</h3><Barras datos={est.banosPorAlumno} color={R.verde} /></div>
          : <div style={tarjeta}><h3 style={h3}><Ic n="profe-ausente" tam={20} />Ausencias del profesorado por motivo</h3><Barras datos={est.ausenciasPorMotivo} color={R.petroleo} /></div>}
      </div>

      {/* Documentos */}
      <div className="no-print" style={tarjeta}>
        <h3 style={h3}><Ic n="informe" tam={20} />Documentos de este periodo</h3>
        <div style={{ fontSize: 15, color: R.petroleo, marginBottom: 12 }}>Al pulsar, el informe se abre <b>en pantalla</b>; desde ahí lo descargas o lo imprimes. Usan las fechas elegidas arriba.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
          <button style={btnDoc()} onClick={() => pdfEstadisticas(est, periodo, esProfe ? `${ambitoOk === "mios" ? "Partes puestos por" : `Tutoría de ${ambitoOk} ·`} ${usuario}` : "")}>
            <Ic n="dashboard" tam={20} />Estadísticas del periodo<span style={sub}>Resumen, evolución por día, grupos, alumnado, faltas y profesorado</span>
          </button>
          <button style={btnDoc(est.partes.length > 0)} disabled={!est.partes.length} onClick={() => pdfInformePartes(est.partes, periodo.texto, tutores, undefined, periodo)}>
            <Ic n="partes" tam={20} />Todos los partes<span style={sub}>{est.partes.length} parte(s) con su detalle y resumen por grupo</span>
          </button>
          <button style={btnDoc(est.banos.length > 0)} disabled={!est.banos.length} onClick={() => pdfInformeBanos(est.banos, periodo.texto)}>
            <Ic n="banos" tam={20} />Salidas al baño<span style={sub}>{est.banos.length} salida(s) con hora y duración</span>
          </button>
          {!esProfe && <button style={btnDoc(est.ausencias.length > 0)} disabled={!est.ausencias.length} onClick={() => pdfAusencias(est.ausencias, periodo)}>
            <Ic n="profe-ausente" tam={20} />Ausencias del profesorado<span style={sub}>{est.ausencias.length} ausencia(s) con horas, grupo y tarea</span>
          </button>}
          {tipo === "dia" && !esProfe && (
            <button style={btnDoc()} onClick={() => pdfFirmasYListas(periodo.desde, filasFirmasDia(periodo.desde, equipo, firmas), est.listas.slice().sort((a, b) => HORAS.indexOf(a.hora) - HORAS.indexOf(b.hora)))}>
              <Ic n="firmar" tam={20} />Firmas de guardia y listas<span style={sub}>Quién tenía guardia, quién firmó y las listas pasadas</span>
            </button>
          )}
          <button style={btnDoc()} onClick={() => excelPeriodo(est, periodo, tutores, alumnos, esProfe).catch(() => window.alert("No se ha podido crear el Excel. Comprueba la conexión e inténtalo de nuevo."))}>
            <Ic n="importar" tam={20} />Ver y descargar en Excel<span style={sub}>{esProfe ? "Partes con alumno, grupo, falta y profesor; resumen por alumno, por grupo y baños" : "Partes con alumno, grupo, tutor, falta y profesor; por alumno, por grupo, baños, ausencias y listas"}</span>
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${R.turquesaClaro}`, marginTop: 16, paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          <div>
            <label style={labelStyle}><Ic n="por-alumno" tam={20} />Partes de un alumno/a</label>
            <select value={alumnoDoc} onChange={e => setAlumnoDoc(e.target.value)} style={{ ...selStyle, marginBottom: 8 }}>
              <option value="">Elige alumno/a…</option>
              {[...alumnos].sort((a, b) => a.curso.localeCompare(b.curso) || a.nombre.localeCompare(b.nombre)).map(a => {
                const n = est.partes.filter(p => p.alumnoId === a.id).length;
                return <option key={a.id} value={String(a.id)}>{a.nombre} ({a.curso}){n ? ` · ${n}` : ""}</option>;
              })}
            </select>
            <button style={btnDoc(partesAlumno.length > 0)} disabled={!partesAlumno.length} onClick={() => pdfInformePartes(partesAlumno, `${nombreAlumno} · ${periodo.texto}`, tutores, undefined, periodo)}>
              ⬇️ {alumnoDoc ? `${partesAlumno.length} parte(s) en este periodo` : "Descargar"}
            </button>
            {alumnoObj && <ContactoFamilia alumno={alumnoObj} partes={partesAlumno} banos={banosAlumno} periodo={periodo} tutores={tutores} remitente={esProfe ? usuario : ""} C={C} />}
          </div>
          {(!esProfe || ambitoOk === "mios") && <div>
            <label style={labelStyle}><Ic n="por-curso" tam={20} />Partes de un grupo</label>
            <select value={grupoDoc} onChange={e => setGrupoDoc(e.target.value)} style={{ ...selStyle, marginBottom: 8 }}>
              <option value="">Elige grupo…</option>
              {(esProfe ? [...new Set(partes.map(p => p.curso))].sort() : cursos).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={btnDoc(partesGrupo.length > 0)} disabled={!partesGrupo.length} onClick={() => pdfInformePartes(partesGrupo, `Grupo ${grupoDoc} · ${periodo.texto}`, tutores, undefined, periodo)}>
              ⬇️ {grupoDoc ? `${partesGrupo.length} parte(s) en este periodo` : "Descargar"}
            </button>
          </div>}
          {!esProfe && <div>
            <label style={labelStyle}><Ic n="cargo-profesor" tam={20} />Ausencias de un profesor/a</label>
            <select value={profDoc} onChange={e => setProfDoc(e.target.value)} style={{ ...selStyle, marginBottom: 8 }}>
              <option value="">Elige profesor/a…</option>
              {[...profesores].sort().map(p => { const n = est.ausencias.filter(a => a.profesor === p).length; return <option key={p} value={p}>{p}{n ? ` · ${n}` : ""}</option>; })}
            </select>
            <button style={btnDoc(ausProf.length > 0)} disabled={!ausProf.length} onClick={() => pdfAusencias(ausProf, { ...periodo, texto: `${profDoc} · ${periodo.texto}` })}>
              ⬇️ {profDoc ? `${ausProf.length} ausencia(s) en este periodo` : "Descargar"}
            </button>
          </div>}
        </div>
        <div style={{ fontSize: 14, color: R.petroleo, marginTop: 12 }}>Las faltas oficiales de asistencia del alumnado se registran en Raíces; aquí solo aparecen las anotadas en las listas de guardia.</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PREGUNTAS FRECUENTES (también desde la pantalla de entrada)
// Las respuestas sobre datos y mensajes describen la versión de demostración:
// cambiarlas cuando la app funcione con el servidor del centro.
// ════════════════════════════════════════════════════════════════════════════
// El navegador avisa si la app se puede instalar con un botón (Chrome, Edge, Android)
if (typeof window !== "undefined" && !window.__rumboInstalarEscucha) {
  window.__rumboInstalarEscucha = true;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); window.__rumboInstalar = e; window.dispatchEvent(new Event("rumbo:instalable")); });
  window.addEventListener("appinstalled", () => { window.__rumboInstalar = null; window.dispatchEvent(new Event("rumbo:instalable")); });
}
const abrirPreguntas = (id = "") => window.dispatchEvent(new CustomEvent("rumbo:faq", { detail: id }));
function tipoDispositivo() {
  if (typeof navigator === "undefined") return "ordenador";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "ordenador";
}

function GuiaInstalar() {
  const [disp, setDisp] = useState(tipoDispositivo);
  const [puede, setPuede] = useState(() => !!(typeof window !== "undefined" && window.__rumboInstalar));
  const instalada = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone);
  useEffect(() => { const h = () => setPuede(!!window.__rumboInstalar); window.addEventListener("rumbo:instalable", h); return () => window.removeEventListener("rumbo:instalable", h); }, []);
  const instalar = async () => { const ev = window.__rumboInstalar; if (!ev) return; ev.prompt(); try { await ev.userChoice; } catch { /* nada */ } window.__rumboInstalar = null; setPuede(false); };
  const PASOS = {
    android: { titulo: "Móvil Android (Chrome)", pasos: ["Abre rumboaula.vercel.app en Chrome.", "Toca el menú ⋮ (arriba a la derecha).", "Elige «Instalar aplicación» o «Añadir a pantalla de inicio».", "Confirma: el icono de RumboAula aparece con tus aplicaciones."] },
    iphone: { titulo: "iPhone o iPad (Safari)", pasos: ["Abre rumboaula.vercel.app en Safari (en otros navegadores del iPhone puede no aparecer la opción).", "Toca el botón Compartir (el cuadrado con una flecha hacia arriba).", "Desliza y elige «Añadir a pantalla de inicio».", "Toca «Añadir»: el icono aparece en tu pantalla de inicio."] },
    ordenador: { titulo: "Ordenador (Chrome o Edge)", pasos: ["Abre rumboaula.vercel.app en Chrome o Edge.", "Pulsa el icono de instalar que aparece a la derecha de la barra de direcciones (una pantalla con una flecha).", "Si no lo ves: menú ⋮ › «Enviar, guardar y compartir» › «Instalar página como aplicación» en Chrome, o menú … › «Aplicaciones» › «Instalar este sitio como aplicación» en Edge.", "Se abrirá en su propia ventana y quedará en el menú de inicio o en el Dock. En Firefox no se puede instalar: guarda la página en marcadores."] },
  };
  const tab = id => ({ border: `2px solid ${disp === id ? C.teal : C.light}`, background: disp === id ? "#DDF0F4" : "#fff", color: disp === id ? C.teal : C.gray, borderRadius: 8, padding: "6px 10px", fontSize: 14, fontWeight: 700, cursor: "pointer" });
  return (
    <div>
      <p style={{ margin: "0 0 8px" }}>Para ver la demostración <strong>no hace falta instalar nada</strong>: basta con abrir <strong>rumboaula.vercel.app</strong> en el navegador. Instalarla solo sirve para tenerla a mano, con su icono, como cualquier otra aplicación.</p>
      {instalada ? <p style={{ color: C.teal, fontWeight: 700 }}>✅ Ya la estás usando instalada en este dispositivo.</p>
        : puede && <button onClick={instalar} style={{ border: "none", borderRadius: 10, background: C.teal, color: "#fff", fontWeight: 800, padding: "10px 16px", cursor: "pointer", margin: "4px 0 10px" }}>📲 Instalar ahora en este dispositivo</button>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 8px" }} role="tablist" aria-label="Tipo de dispositivo">
        {Object.entries(PASOS).map(([id, v]) => <button key={id} role="tab" aria-selected={disp === id} onClick={() => setDisp(id)} style={tab(id)}>{v.titulo}</button>)}
      </div>
      <ol style={{ margin: "0 0 6px", paddingLeft: 20 }}>{PASOS[disp].pasos.map(t => <li key={t} style={{ marginBottom: 4 }}>{t}</li>)}</ol>
      <p style={{ margin: "8px 0 0", color: C.gray, fontSize: 14 }}>Después, para la demostración: pulsa «Cargar los datos de ejemplo» y elige un perfil (Profesor/a, Tutor/a, Jefatura o Administración). Recuerda que en esta versión cada dispositivo tiene sus propios datos.</p>
    </div>
  );
}

const PREGUNTAS = [
  { id: "instalar", q: "¿Cómo instalo RumboAula en el móvil o en el ordenador para ver una demostración?", a: <GuiaInstalar /> },
  { id: "datos", q: "¿Dónde se guardan los datos?", a: <>
    <p>En esta <strong>versión de demostración</strong>, en el navegador del dispositivo que estás usando: no se envían a ningún sitio. Por eso todo lo que ves es ficticio y <strong>no deben introducirse datos reales</strong> de alumnado ni de familias.</p>
    <p>Cuando se use en un centro, los datos estarán <strong>solo en un servidor del propio centro</strong> (o en los de EducaMadrid) y no saldrán de él.</p></> },
  { id: "dispositivos", q: "¿La puedo usar en el móvil y en el ordenador?", a: <>
    <p>Sí: es la misma aplicación, con el mismo enlace, en cualquier navegador. Se adapta a la pantalla del móvil, la tableta o el ordenador.</p>
    <p>En esta versión, cada dispositivo guarda sus propios datos: lo que hagas en el móvil no aparece en el ordenador. Cuando funcione con el servidor del centro, verás lo mismo en todos.</p></> },
  { id: "mensajes", q: "¿Por qué no le ha llegado mi mensaje a un compañero?", a: <>
    <p>Porque en esta versión los mensajes de Galvángram se quedan en el dispositivo donde se escriben. En la demostración, para ver cómo llega un aviso, pulsa «Salir» y entra como quien lo ha recibido en «Entrar como otro profe del claustro».</p>
    <p>Con el servidor del centro, el mensaje llegará al momento al móvil o al ordenador del compañero.</p></> },
  { id: "privacidad", q: "¿Quién puede ver mis mensajes de Galvángram?", a: <p>Solo tú y las personas a las que se lo envías. Cada uno ve únicamente los mensajes que ha enviado o recibido.</p> },
  { id: "emergencia", q: "¿Qué hago en una emergencia?", a: <>
    <p>Sigue el <strong>protocolo del centro</strong>: llama a conserjería o a jefatura y avisa en persona si hace falta. RumboAula ayuda a avisar más rápido a los profes de guardia de tu zona, con el aula indicada, pero <strong>no sustituye</strong> al protocolo.</p></> },
  { id: "alumnado", q: "¿Qué datos del alumnado guarda y quién los ve?", a: <>
    <p>Nombre, curso, tutor/a y contacto de la familia (importados de Raíces), los partes, las salidas al baño y las listas pasadas en guardia.</p>
    <p>Solo los ven <strong>jefatura y el profesorado implicado</strong>: quien pone el parte y el tutor/a del grupo. El resto del claustro no tiene acceso a ellos. Los informes de fallos de la app <strong>nunca</strong> incluyen datos del alumnado.</p></> },
  { id: "ley", q: "¿Respeta la ley de protección de datos y de menores?", a: <>
    <p>RumboAula está <strong>diseñada para cumplir</strong> el Reglamento General de Protección de Datos (RGPD), la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales, y la normativa de protección de menores, además del Decreto 32/2019 de convivencia de la Comunidad de Madrid:</p>
    <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>
      <li>Solo recoge los datos necesarios para la convivencia y las guardias.</li>
      <li>Los datos del alumnado solo los ven jefatura y el profesorado implicado.</li>
      <li>Los datos se quedan en el centro y no se comparten con terceros.</li>
      <li>Los avisos al móvil no llevan nombres ni datos personales.</li>
    </ul>
    <p>Antes de usarla con datos reales, se someterá a la <strong>aprobación del equipo directivo y de la Delegación de Protección de Datos de la Consejería de Educación de la Comunidad de Madrid</strong>. Mientras tanto, es una versión de demostración con datos ficticios.</p></> },
  { id: "fallos", q: "¿Qué hago si algo falla?", a: <p>Pulsa «⚠️ Informar de un problema» (abajo a la izquierda) y cuenta qué ha pasado: se envía por correo a la responsable con la pantalla, tu perfil, la hora y el error técnico. Si una pantalla se rompe, la propia app te ofrecerá avisar.</p> },
  { id: "oficial", q: "¿Es una herramienta oficial?", a: <p>Es un <strong>prototipo</strong> creado por una profesora para mejorar la convivencia y la organización de las guardias. Todavía no está aprobado para datos reales: antes de usarlo en el centro tienen que darle el visto bueno el equipo directivo y la Delegación de Protección de Datos de la Consejería de Educación.</p> },
];

function PreguntasFrecuentes() {
  const [abierto, setAbierto] = useState(false);
  const [desplegada, setDesplegada] = useState("");
  useEffect(() => {
    const h = ev => { setAbierto(true); if (ev.detail) setDesplegada(ev.detail); };
    window.addEventListener("rumbo:faq", h);
    return () => window.removeEventListener("rumbo:faq", h);
  }, []);
  useEffect(() => { if (!abierto) return; const k = e => { if (e.key === "Escape") setAbierto(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [abierto]);
  if (!abierto) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rumbo-faq-titulo" onClick={() => setAbierto(false)}
      style={{ position: "fixed", inset: 0, zIndex: 2250, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, fontFamily: "system-ui,sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(680px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ background: R.azul, color: "#fff", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div id="rumbo-faq-titulo" style={{ fontWeight: 900, fontSize: 18 }}>❓ Preguntas frecuentes</div>
          <button onClick={() => setAbierto(false)} aria-label="Cerrar preguntas frecuentes" style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.4)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 18px 18px", fontSize: 14, lineHeight: 1.55, color: C.dark }}>
          <a href="/manual/" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 4px", padding: "12px 14px", borderRadius: 12, background: "#DDF0F4", border: `2px solid ${C.teal}`, color: C.dark, textDecoration: "none" }}>
            <Icono nombre="como-se-usa" tam={36} />
            <span><strong style={{ fontSize: 15 }}>📘 Manual de uso</strong><br /><span style={{ fontSize: 14, color: C.gray }}>Paso a paso, por perfiles, con las pantallas reales. Se abre en otra pestaña.</span></span>
          </a>
          {PREGUNTAS.map(({ id, q, a }) => (
            <details key={id} open={desplegada === id} onToggle={e => { if (e.currentTarget.open) setDesplegada(id); else if (desplegada === id) setDesplegada(""); }}
              style={{ borderBottom: `1px solid ${C.light}`, padding: "10px 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 15, color: C.dark, listStyle: "revert" }}>{q}</summary>
              <div style={{ marginTop: 8 }}>{a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// RED DE SEGURIDAD: errores e «Informar de un problema»
// Los fallos quedan registrados y se pueden enviar por correo a la responsable.
// Nunca se envían datos del alumnado: solo pantalla, perfil, hora y el error técnico.
// ════════════════════════════════════════════════════════════════════════════
const CORREO_SOPORTE = "mtgonzalezmunoz@educa.madrid.org";
const VERSION_APP = import.meta.env.VITE_APP_VERSION || "local";
const CLAVE_ERRORES = PREFIJO + "errores";
function erroresGuardados() { try { return JSON.parse(localStorage.getItem(CLAVE_ERRORES) || "[]"); } catch { return []; } }
function registrarError(origen, error, detalle = "") {
  const ctx = (typeof window !== "undefined" && window.__rumboContexto) || {};
  const e = { ts: new Date().toISOString(), origen, mensaje: String(error?.message || error || "Error desconocido").slice(0, 300),
    detalle: String(detalle || error?.stack || "").split("\n").slice(0, 6).join("\n").slice(0, 600), pantalla: ctx.pantalla || "", perfil: ctx.perfil || "" };
  try { localStorage.setItem(CLAVE_ERRORES, JSON.stringify([e, ...erroresGuardados()].slice(0, 10))); } catch { /* sin almacenamiento */ }
  try { window.dispatchEvent(new CustomEvent("rumbo:error", { detail: e })); } catch { /* nada */ }
  return e;
}
if (typeof window !== "undefined" && !window.__rumboErrores) {
  window.__rumboErrores = true;
  window.addEventListener("error", ev => { if (ev.error || ev.message) registrarError("script", ev.error || ev.message); });
  window.addEventListener("unhandledrejection", ev => registrarError("promesa", ev.reason));
}
function textoInforme(descripcion = "", errorActual = null) {
  const ctx = (typeof window !== "undefined" && window.__rumboContexto) || {};
  const errores = errorActual ? [errorActual, ...erroresGuardados().filter(x => x.ts !== errorActual.ts)] : erroresGuardados();
  const lineas = [
    descripcion ? `QUÉ HA PASADO:\n${descripcion}\n` : "",
    `Pantalla: ${ctx.pantalla || "—"} · Perfil: ${ctx.perfil || "—"}`,
    `Fecha: ${new Date().toLocaleString("es-ES")}`,
    `Versión: ${VERSION_APP}`,
    `Navegador: ${typeof navigator !== "undefined" ? navigator.userAgent : "—"}`,
    "",
    errores.length ? "ÚLTIMOS ERRORES TÉCNICOS:" : "Sin errores técnicos registrados.",
    ...errores.slice(0, 3).map(x => `- ${new Date(x.ts).toLocaleTimeString("es-ES")} [${x.origen} · ${x.pantalla || "—"}] ${x.mensaje}${x.detalle ? `\n  ${x.detalle.split("\n").slice(0, 3).join("\n  ")}` : ""}`),
  ];
  return lineas.filter(l => l !== "").join("\n");
}
function abrirCorreoInforme(asunto, cuerpo) {
  const url = `mailto:${CORREO_SOPORTE}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo.slice(0, 1800))}`;
  try { window.location.href = url; } catch { /* sin cliente de correo */ }
}
async function copiarTexto(t) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }

// Si una pantalla falla al dibujarse, en lugar de quedarse en blanco se muestra esto
class RedSeguridad extends Component {
  constructor(props) { super(props); this.state = { error: null, copiado: false }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { this.registrado = registrarError("pantalla", error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    const informe = textoInforme("", this.registrado);
    const btn = { border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%", marginTop: 10 };
    return (
      <div role="alert" style={{ minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui,sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,.15)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.dark }}>😕 Algo ha fallado en esta pantalla</div>
          <p style={{ color: C.gray, fontSize: 14, lineHeight: 1.5 }}>No has hecho nada mal. Lo que habías guardado sigue en este dispositivo. Avisa a la responsable de la app para que lo arregle y vuelve a empezar.</p>
          <button style={{ ...btn, background: C.teal, color: "#fff" }} onClick={() => abrirCorreoInforme("RumboAula: algo ha fallado", informe)}>📧 Avisar a la responsable</button>
          <button style={{ ...btn, background: C.light, color: C.dark }} onClick={async () => this.setState({ copiado: await copiarTexto(informe) })}>{this.state.copiado ? "✅ Informe copiado" : "📋 Copiar el informe"}</button>
          <button style={{ ...btn, background: "transparent", color: C.blue }} onClick={() => window.location.reload()}>🔄 Volver a empezar</button>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 10 }}>Si no se abre el correo, copia el informe y envíalo a {CORREO_SOPORTE}. No incluye datos del alumnado.</div>
        </div>
      </div>
    );
  }
}

// Botón siempre visible para informar de un problema, y aviso si salta un error
function InformarProblema() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [errorReciente, setErrorReciente] = useState(null);
  useEffect(() => {
    const h = ev => setErrorReciente(ev.detail);
    window.addEventListener("rumbo:error", h);
    return () => window.removeEventListener("rumbo:error", h);
  }, []);
  const informe = () => textoInforme(texto.trim(), errorReciente);
  const btn = { border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 14, cursor: "pointer" };
  return (<>
    {errorReciente && !abierto && (
      <div role="status" style={{ position: "fixed", left: 12, bottom: 60, zIndex: 2150, background: "#FDF1D9", border: `2px solid ${C.salmon}`, borderRadius: 12, padding: "10px 12px", maxWidth: "min(360px, calc(100% - 24px))", boxShadow: "0 6px 20px rgba(0,0,0,.15)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 180px", fontSize: 14, color: "#275D8C", fontWeight: 700 }}>⚠️ Algo no ha ido bien en esta pantalla.</div>
        <button style={{ ...btn, background: "#275D8C", color: "#fff", padding: "6px 10px", fontSize: 14 }} onClick={() => setAbierto(true)}>Avisar</button>
        <button aria-label="Cerrar" style={{ ...btn, background: "transparent", color: C.gray, padding: "6px 8px" }} onClick={() => setErrorReciente(null)}>✕</button>
      </div>
    )}
    <button className="rumbo-informar" onClick={() => setAbierto(true)} aria-label="Informar de un problema"
      style={{ position: "fixed", left: 12, bottom: 12, zIndex: 240, background: "#fff", color: C.dark, border: `1px solid ${C.light}`, borderRadius: 20, padding: "7px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 10px rgba(0,0,0,.12)", opacity: .92 }}>
      ⚠️ <span className="rumbo-informar-txt">Informar de un problema</span>
    </button>
    <style>{`@media (max-width: 600px) { .rumbo-informar-txt, .gd-faq-txt { display: none; } }`}</style>
    {abierto && (
      <div role="dialog" aria-modal="true" aria-labelledby="rumbo-informar-titulo" onClick={() => setAbierto(false)}
        style={{ position: "fixed", inset: 0, zIndex: 2300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 20, width: "min(480px, 100%)", fontFamily: "system-ui,sans-serif" }}>
          <div id="rumbo-informar-titulo" style={{ fontSize: 19, fontWeight: 900, color: C.dark, marginBottom: 4 }}>⚠️ Informar de un problema</div>
          <div style={{ fontSize: 14, color: C.gray, marginBottom: 10 }}>Cuéntale a la responsable de la app qué ha pasado o qué no te cuadra.</div>
          <textarea autoFocus value={texto} onChange={e => setTexto(e.target.value)} rows={4} placeholder="Ej.: al pulsar «Asignar» no ha pasado nada…"
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, border: `2px solid ${C.light}`, padding: 10, fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
          {errorReciente && <div style={{ fontSize: 14, color: "#275D8C", marginTop: 6 }}>Se incluirá el error técnico que acaba de producirse.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <button style={{ ...btn, background: C.teal, color: "#fff" }} onClick={() => { abrirCorreoInforme("RumboAula: informe de un problema", informe()); }}>📧 Abrir el correo</button>
            <button style={{ ...btn, background: C.light, color: C.dark }} onClick={async () => setCopiado(await copiarTexto(informe()))}>{copiado ? "✅ Copiado" : "📋 Copiar el informe"}</button>
          </div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>
            Se envía a {CORREO_SOPORTE} con la pantalla, tu perfil, la hora, la versión y los últimos errores técnicos. <strong>No se envían datos del alumnado.</strong> Si no se abre tu correo, copia el informe y envíalo tú.
          </div>
          <button style={{ ...btn, background: "transparent", color: C.gray, width: "100%", marginTop: 6 }} onClick={() => { setAbierto(false); setCopiado(false); }}>Cerrar</button>
        </div>
      </div>
    )}
  </>);
}

// Para comprobar la red de seguridad (pruebas automáticas): abrir la app con ?probar-fallo=pantalla o ?probar-fallo=script
function ProbarFallo() {
  const modo = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("probar-fallo") : null;
  useEffect(() => { if (modo === "script") setTimeout(() => { throw new Error("Fallo de prueba (script)"); }, 50); }, [modo]);
  if (modo === "pantalla") throw new Error("Fallo de prueba (pantalla)");
  return null;
}

export default function App() {
  return (
    <RedSeguridad>
      <ProbarFallo />
      <AppInterna />
      <InformarProblema />
      <PreguntasFrecuentes />
    </RedSeguridad>
  );
}

function AppInterna() {
  const [perfil, setPerfil]       = useState(null);
  const [usuario, setUsuario]     = useState(null);
  const [tab, setTab]             = useState("partes");
  const [alumnos, setAlumnos]     = useState(DEMO_ALUMNOS);
  DATOS_CENTRO.alumnos = alumnos;
  const [profesores, setProfesores] = useState(DEMO_PROFESORES);
  const [partes, setPartes]       = useState([]);
  const [medidas, setMedidas]     = useState([]);
  DATOS_CENTRO.partes = partes;
  const [banos, setBanos]         = useState([]);
  const [alertas, setAlertas]     = useState([]);
  const [mensajes, setMensajes]   = useState([]);
  const [guardias, setGuardias]   = useState([]);
  const [tutores, setTutores]     = useState(TUTORES_DEMO); // {curso: {tutor, email}}
  const [informes, setInformes]   = useState([]);           // informes descargados
  const [loading, setLoading]     = useState(true);
  const [showParte, setShowParte] = useState(null);
  const [avisosFamilia, setAvisosFamilia] = useState({});
  const [datosCentro, setDatosCentro] = useState(CENTRO_POR_DEFECTO);
  fijarCentro(datosCentro);
  const [horarioCentro, setHorarioCentro] = useState({});
  fijarHorario(horarioCentro);
  const [zonasCentro, setZonasCentro] = useState(null);
  fijarZonas(zonasCentro);
  const [correosCentro, setCorreosCentro] = useState(MODO_DEMO ? { jefatura: "jefatura@ejemplo.es", orientacion: "orientacion@ejemplo.es", direccion: "direccion@ejemplo.es" } : {}); // {jefatura, orientacion, direccion} // avisos a familias ya hechos: {id: {n, ts, por}}
  const [parteGrande, setParteGrande] = useState(false); // parte a pantalla completa
  useEffect(() => {
    if (!showParte) return;
    const f = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); setShowParte(null); } };
    window.addEventListener("keydown", f, true); return () => window.removeEventListener("keydown", f, true);
  }, [showParte]);
  const [showCoordinacion, setShowCoordinacion] = useState(false);
  const [fechaCoordinacion, setFechaCoordinacion] = useState("");
  const [showAlerta, setShowAlerta] = useState(null);
  const [printParte, setPrintParte] = useState(null);
  const [printInforme, setPrintInforme] = useState(false);
  const [showCuadrante, setShowCuadrante] = useState(false); // Nuevo: modal cuadrante
  const [semanaCuadrante, setSemanaCuadrante] = useState(0); // 0 = esta semana, 1 = la siguiente...

  // Filtros generales
  const [filtCurso, setFiltCurso]           = useState("");
  const [filtAlumno, setFiltAlumno]         = useState("");
  const [filtGravedad, setFiltGravedad]     = useState("");
  const [filtFechaDesde, setFiltFechaDesde] = useState("");
  const [filtFechaHasta, setFiltFechaHasta] = useState("");
  const [informeType, setInformeType]       = useState("partes");  // "partes" | "banos"

  // Formulario nuevo parte
  const [fAlumno, setFAlumno]     = useState("");
  const [fBusqueda, setFBusqueda] = useState("");
  const [fTipo, setFTipo]                 = useState("Comportamiento");
  const [fGravedad, setFGravedad]         = useState("leve");
  const [fTipificacion, setFTipificacion] = useState("");
  const [fDesc, setFDesc]                 = useState("");
  const [fHora, setFHora]                 = useState("1ª hora");
  const [fProfesor, setFProfesor]         = useState(DEMO_PROFESORES[4]);
  const [moduloProfesor, setModuloProfesor] = useState("alumnos");   // "alumnos" | "guardias"
  const [moduloJefatura, setModuloJefatura] = useState("alumnos");   // "alumnos" | "guardias"
  const [parteGenerado, setParteGenerado] = useState(null);

  // Parte de grupo
  const [gCurso, setGCurso]         = useState("");
  const [gTipo, setGTipo]           = useState("Comportamiento");
  const [gGravedad, setGGravedad]       = useState("leve");
  const [gTipificacion, setGTipificacion] = useState("");
  const [gDesc, setGDesc]           = useState("");
  const [gHora, setGHora]           = useState("1ª hora");
  const [gExcluidos, setGExcluidos] = useState([]);
  const [grupoGenerado, setGrupoGenerado] = useState(null);

  // Baños
  const [bAlumno, setBAlumno]     = useState("");
  const [bBusqueda, setBBusqueda] = useState("");

  // Guardias
  const [guProfesorAusente, setGuProfesorAusente] = useState("");
  const [guHora, setGuHora]                       = useState("1ª hora");
  const [guModulo, setGuModulo]                   = useState("Módulo A");
  const [guCurso, setGuCurso]                     = useState("");
  const [guMateria, setGuMateria]                 = useState("");
  const [guProfesorGuardia, setGuProfesorGuardia] = useState("");
  const [guMotivo, setGuMotivo]                   = useState("Enfermedad");
  const [guMaterial, setGuMaterial]               = useState("");
  const [guardiaGenerada, setGuardiaGenerada]     = useState(null);
  const [nuevoProfesor, setNuevoProfesor]         = useState("");
  const [feedbackAñadirProfesor, setFeedbackAñadirProfesor] = useState(false); // Nuevo: feedback visual

  // Guardias — nuevo sistema
  const [cuadrante, setCuadrante]     = useState({});
  const [coberturas, setCoberturas]   = useState({});
  const [vistaGalv, setVistaGalv]     = useState({ v: "enviar", k: 0 });
  const [ultimoProfe, setUltimoProfe] = useState(() => { try { return localStorage.getItem(PREFIJO + "ultimo_profe") || ""; } catch { return ""; } });
  useEffect(() => { try { if (ultimoProfe) localStorage.setItem(PREFIJO + "ultimo_profe", ultimoProfe); } catch { /* sin almacenamiento */ } }, [ultimoProfe]); // vista con la que se abre Galvángram
  const [horarios, setHorarios]       = useState({}); // horario de clases semanal: "Lunes|3ª hora|Profesor" → { grupo, aula, edificio, materia } // quién cubre cada clase sin profe: "fecha|hora|idAusencia" → profesor
  const [apoyosGuardia, setApoyosGuardia] = useState({}); // {fecha|hora|zona: profesor}
  const [sustitutosGuardia, setSustitutosGuardia] = useState({}); // {fecha|hora|zona: profesor}
  const [cuentas, setCuentas] = useState(CUENTAS_DEMO); // {nombre: {cargo, clave}}
  const [firmas, setFirmas] = useState([]);   // firmas de guardia
  const [listas, setListas] = useState([]);   // listas pasadas en guardia
  const [registroTelefono, setRegistroTelefono] = useState(false); // Jefatura registra una ausencia por teléfono
  const [profesoresGuardia, setProfesoresGuardia] = useState({}); // Nuevo: {dia|hora|zona: profesor}
  const [ausencias, setAusencias]     = useState([]);
  const [quinceInicio, setQInicio]    = useState("");
  const [quinceProfesor, setQProf]    = useState("");
  const [ausMotivo, setAusMotivo]     = useState("Enfermedad");
  const [ausFecha, setAusFecha]       = useState("");
  const [ausHoras, setAusHoras]       = useState([]);
  const [ausTarea, setAusTarea]       = useState("");
  const [ausEnlace, setAusEnlace]     = useState("");
  const [ausUbicacion, setAusUbicacion] = useState("");
  const [ausAula, setAusAula]         = useState("");
  const [ausAsignatura, setAusAsignatura] = useState("");
  const [ausProfesor, setAusProfesor] = useState("");
  const [diaSeleccionadoGuardias, setDiaSeleccionadoGuardias] = useState(null);

  // Carga
  useEffect(() => {
    async function load() {
      setLoading(true);
      const p  = await sGet("partes");    if (p)  setPartes(p);
      const b  = await sGet("banos");     if (b)  setBanos(b);
      const a  = await sGet("alertas");   if (a)  setAlertas(a);
      const m  = await sGet("mensajes");  if (m)  setMensajes(m);
      const al = await sGet("alumnos");   if (al) setAlumnos(al);
      const tu = await sGet("tutores");   if (tu) setTutores(tu);
      const inf = await sGet("informes"); if (inf) setInformes(inf);
      // Primera visita a la demostración: se cargan partes, baños y alertas de ejemplo
      const me = await sGet("medidas"); if (me) setMedidas(me);
      if (MODO_DEMO && !p) {
        const ej = datosEjemploConvivencia(DEMO_PROFESORES);
        setAlumnos(ej.alumnos); setPartes(ej.partes); setBanos(ej.banos); setAlertas(ej.alertas); setInformes(ej.informes); setTutores(ej.tutores);
        if (!me) setMedidas(medidasEjemplo(ej.partes));
      } else if (MODO_DEMO && !me) setMedidas(medidasEjemplo(p));
      const pr = await sGet("profesores");if (pr) setProfesores(pr);
      const g  = await sGet("guardias");    if (g)  setGuardias(g);
      const cq = await sGet("cuadrante");   if (cq) setCuadrante(cq);
      const au = await sGet("ausencias");   if (au) setAusencias(au);
      const ap = await sGet("apoyos_guardia");     if (ap) setApoyosGuardia(ap);
      const su = await sGet("sustitutos_guardia"); if (su) setSustitutosGuardia(su);
      const cob = await sGet("coberturas_clase"); if (cob) setCoberturas(cob);
      const hor = await sGet("horarios_clase"); if (hor) setHorarios(hor);
      const pg = await sGet("profesores_guardia"); if (pg) setProfesoresGuardia(pg);
      const cu = await sGet("cuentas"); if (cu) setCuentas(cu);
      const fi = await sGet("firmas_guardia"); if (fi) setFirmas(fi);
      const li = await sGet("listas_guardia"); if (li) setListas(li);
      const avf = await sGet("avisos_familia"); if (avf) setAvisosFamilia(avf);
      const cc = await sGet("correos_centro"); if (cc) setCorreosCentro(cc);
      const dc = await sGet("datos_centro"); if (dc) setDatosCentro(dc);
      const hc = await sGet("horario_centro"); if (hc) setHorarioCentro(hc);
      const zc = await sGet("zonas_centro"); if (zc) setZonasCentro(zc);
      const cuentasActuales = cu || CUENTAS_DEMO;
      const ses = leerSesion();
      // Solo se recupera la sesión si esa persona tiene clave y su cargo permite ese perfil
      if (ses?.usuario && ses?.perfil && (cuentasActuales[ses.usuario]?.clave || MODO_DEMO) &&
          perfilesPermitidos(cuentasActuales, ses.usuario).some(p => p.id === ses.perfil.id)) {
        setUsuario(ses.usuario); setPerfil(ses.perfil);
        if ((pr || DEMO_PROFESORES).includes(ses.usuario)) setFProfesor(ses.usuario);
        setTab(ses.perfil.id === "jefatura" ? "dashboard" : ses.perfil.id === "admin" ? "admin_panel" : "partes");
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => { if (!loading) sSet("partes", partes); },     [partes, loading]);
  useEffect(() => { if (!loading) sSet("medidas", medidas); },   [medidas, loading]);
  useEffect(() => { if (!loading) sSet("banos", banos); },       [banos, loading]);
  useEffect(() => { if (!loading) sSet("alertas", alertas); },   [alertas, loading]);
  useEffect(() => { if (!loading) sSet("mensajes", mensajes); }, [mensajes, loading]);
  useEffect(() => { if (!loading) sSet("alumnos", alumnos); },   [alumnos, loading]);
  useEffect(() => { if (!loading) sSet("tutores", tutores); },   [tutores, loading]);
  useEffect(() => { if (!loading) sSet("informes", informes); }, [informes, loading]);
  useEffect(() => { if (!loading) sSet("profesores", profesores); }, [profesores, loading]);
  useEffect(() => { if (!loading) sSet("guardias",   guardias);   }, [guardias,   loading]);
  useEffect(() => { if (!loading) sSet("cuadrante", cuadrante); }, [cuadrante, loading]);
  useEffect(() => { if (!loading) sSet("coberturas_clase", coberturas); }, [coberturas, loading]);
  useEffect(() => { if (!loading) sSet("horarios_clase", horarios); }, [horarios, loading]);
  // Pantalla y perfil actuales, para los informes de errores
  useEffect(() => { window.__rumboContexto = { pantalla: perfil ? tab : "entrada", perfil: perfil?.id || "sin entrar" }; }, [perfil, tab]);
  useEffect(() => { if (!loading) sSet("ausencias", ausencias); }, [ausencias, loading]);
  useEffect(() => { if (!loading) sSet("apoyos_guardia", apoyosGuardia); }, [apoyosGuardia, loading]);
  useEffect(() => { if (!loading) sSet("sustitutos_guardia", sustitutosGuardia); }, [sustitutosGuardia, loading]);
  useEffect(() => { if (!loading) sSet("cuentas", cuentas); }, [cuentas, loading]);
  useEffect(() => { if (!loading) sSet("firmas_guardia", firmas); }, [firmas, loading]);
  useEffect(() => { if (!loading) sSet("listas_guardia", listas); }, [listas, loading]);
  useEffect(() => { if (!loading) sSet("avisos_familia", avisosFamilia); }, [avisosFamilia, loading]);
  useEffect(() => { if (!loading) sSet("correos_centro", correosCentro); }, [correosCentro, loading]);
  useEffect(() => { if (!loading) sSet("datos_centro", datosCentro); }, [datosCentro, loading]);
  useEffect(() => { if (!loading) sSet("horario_centro", horarioCentro); }, [horarioCentro, loading]);
  useEffect(() => { if (!loading && zonasCentro) sSet("zonas_centro", zonasCentro); }, [zonasCentro, loading]);
  // Cada profesor actúa siempre en su propio nombre
  const identidadFija = !!usuario && profesores.includes(usuario);
  useEffect(() => { if (identidadFija) { setFProfesor(usuario); setAusProfesor(usuario); } }, [usuario, identidadFija]);
  useEffect(() => { if (!loading) sSet("profesores_guardia", profesoresGuardia); }, [profesoresGuardia, loading]);

  // Derivados
  const cursos        = [...new Set(alumnos.map(a => a.curso))].sort();
  const alumnoSel     = alumnos.find(a => a.id === parseInt(fAlumno));
  const banoActivos   = banos.filter(b => !b.regreso);
  const alertasNoLeidas = alertas.filter(a => !a.leida).length;
  const partesDeAlumno = id => partes.filter(p => p.alumnoId === id);
  // Completa un parte con el tutor/a y su correo (los partes antiguos no los guardaban)
  const completar = p => p && ({ ...p, tutor: p.tutor || tutores[p.curso]?.tutor || "", tutorEmail: p.tutorEmail || tutores[p.curso]?.email || "" });

  // ─── Rectificar un parte: Jefatura y el profesor/a que lo puso, durante 48 horas ───
  const [rectificando, setRectificando] = useState(false);
  const [rDesc, setRDesc] = useState("");
  const [rTip, setRTip]   = useState("");
  useEffect(() => { setRectificando(false); }, [showParte?.id]);
  const horasDesde = p => (Date.now() - new Date(p.ts).getTime()) / 3600000;
  const puedeRectificar = p => !!p && !!perfil && horasDesde(p) < HORAS_RECTIFICAR &&
    (perfil.id === "jefatura" || (perfil.id === "profesor" && p.profesor === usuario));
  function empezarRectificar() { setRDesc(showParte.descripcion || ""); setRTip(showParte.tipificacion || ""); setRectificando(true); }
  function guardarRectificacion() {
    if (!rDesc.trim() || !puedeRectificar(showParte)) return;
    const cambio = { ts: new Date().toISOString(), por: usuario, perfil: perfil.id, descripcionAnterior: showParte.descripcion, tipificacionAnterior: showParte.tipificacion || "" };
    const actualizado = { ...showParte, descripcion: rDesc.trim(), tipificacion: rTip, rectificaciones: [...(showParte.rectificaciones || []), cambio] };
    setPartes(prev => prev.map(x => x.id === showParte.id ? { ...x, descripcion: actualizado.descripcion, tipificacion: rTip, rectificaciones: actualizado.rectificaciones } : x));
    setShowParte(completar(actualizado));
    setRectificando(false);
  }
  const partesLeves    = id => partesDeAlumno(id).filter(p => p.gravedad === "leve").length;
  const partesFiltrados = partes.filter(p => {
    if (filtCurso     && p.curso    !== filtCurso)              return false;
    if (filtAlumno    && p.alumnoId !== parseInt(filtAlumno))   return false;
    if (filtGravedad  && p.gravedad !== filtGravedad)           return false;
    if (filtFechaDesde && p.ts.split("T")[0] < filtFechaDesde) return false;
    if (filtFechaHasta && p.ts.split("T")[0] > filtFechaHasta) return false;
    return true;
  });

  const banosFiltrados = banos.filter(b => {
    if (filtCurso && b.curso !== filtCurso) return false;
    const fb = (b.ts || b.salida || "").split("T")[0];
    if (filtFechaDesde && fb < filtFechaDesde) return false;
    if (filtFechaHasta && fb > filtFechaHasta) return false;
    return true;
  });

  function cargarEjemploGuardias() {
    const conv = datosEjemploConvivencia(DEMO_PROFESORES);
    setAlumnos(conv.alumnos); setPartes(conv.partes); setBanos(conv.banos); setAlertas(conv.alertas); setInformes(conv.informes); setTutores(conv.tutores);
    // El ejemplo usa los profesores ficticios de demostración; se añaden a la lista si faltan
    const lista = [...new Set([...profesores, ...DEMO_PROFESORES])];
    setProfesores(lista);
    const ej = datosEjemploGuardias(DEMO_PROFESORES);
    setCuadrante(ej.cuadrante); setApoyosGuardia(ej.apoyos); setSustitutosGuardia(ej.sustitutos); setAusencias(ej.ausencias); setCoberturas({});
    setHorarios(horarioEjemplo(DEMO_PROFESORES, [...new Set(conv.alumnos.map(a => a.curso))].sort()));
    setFirmas(ej.firmas); setListas([]);
    if (ej.sugerido) { setUsuario(ej.sugerido); setUltimoProfe(ej.sugerido); }
    // Sin avisos emergentes: la pantalla de entrada muestra que los datos están cargados
  }

  function cambiarPerfil(id) {
    const p = perfilesPermitidos(cuentas, usuario).find(x => x.key === id || x.id === id);
    if (!p || (p.key && p.key === perfil?.key)) return;
    guardarSesion({ usuario, perfil: p });
    setPerfil(p); setTab(tabInicial(p.id));
    setModuloProfesor("alumnos"); setModuloJefatura("alumnos");
    setShowParte(null); setShowAlerta(null);
    window.scrollTo(0, 0);
  }

  function salir() {
    guardarSesion(null);
    setPerfil(null); setUsuario(null); setTab("partes"); setShowParte(null); setPrintParte(null);
    setPrintInforme(false); setShowAlerta(null);
    setFAlumno(""); setFBusqueda(""); setFDesc(""); setParteGenerado(null);
    setGCurso(""); setGDesc(""); setGExcluidos([]); setGrupoGenerado(null);
    setBAlumno(""); setBBusqueda("");
    setGuProfesorAusente(""); setGuMateria(""); setGuProfesorGuardia(""); setGuMaterial(""); setGuardiaGenerada(null);
    setFiltCurso(""); setFiltAlumno(""); setFiltGravedad(""); setFiltFechaDesde(""); setFiltFechaHasta("");
  }

  function generarAlertasParte(parte, partesActuales) {
    const nuevasAlertas = [];
    // Se cuentan solo los partes del mismo trimestre que el nuevo (la cuenta empieza de cero cada trimestre)
    const tri    = trimestreDe(parte.ts);
    const delAlumnoTri = partesActuales.filter(p => { const f = isoLocal(p.ts); return p.alumnoId === parte.alumnoId && f >= tri.desde && f <= tri.hasta; });
    const total  = delAlumnoTri.length + 1;
    const leves  = delAlumnoTri.filter(p => p.gravedad === "leve").length + (parte.gravedad === "leve" ? 1 : 0);
    const minParte = new Date(parte.ts).getHours() * 60 + new Date(parte.ts).getMinutes();
    const aMinH = t => { const [h, m] = t.trim().split(":").map(Number); return h * 60 + m; };
    const iniJornada = aMinH(HORARIO[HORAS[0]].split("–")[0]) - 30, finJornada = aMinH(HORARIO[HORAS[HORAS.length - 1]].split("–")[1]);
    const fueraHorario = minParte < iniJornada || minParte > finJornada;
    // Avisa cada 3 partes: al llegar a 3, 6, 9...
    if (parte.gravedad === "leve" && leves % UMBRAL_AVISO === 0) nuevasAlertas.push({ id: Date.now() + 1, tipo: "acumulacion_leves", alumno: parte.alumno, curso: parte.curso, msg: `Acumulación de ${leves} partes leves en ${tri.texto} — Considerar sanción`, ts: parte.ts, leida: false });
    if (total % UMBRAL_AVISO === 0) nuevasAlertas.push({ id: Date.now() + 2, tipo: "total_partes", alumno: parte.alumno, curso: parte.curso, msg: `Ha alcanzado ${total} partes en ${tri.texto}`, ts: parte.ts, leida: false });
    if (fueraHorario)      nuevasAlertas.push({ id: Date.now() + 3, tipo: "fuera_horario",     alumno: parte.alumno, curso: parte.curso, msg: `Parte generado fuera del horario habitual (${new Date(parte.ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })})`, ts: parte.ts, leida: false });
    if (nuevasAlertas.length > 0) { setAlertas(prev => [...nuevasAlertas, ...prev]); setShowAlerta(nuevasAlertas[0]); }
  }

  function crearParte() {
    if (!fAlumno || !fDesc.trim()) return;
    const al = alumnos.find(a => a.id === parseInt(fAlumno));
    const p = { id: Date.now(), alumnoId: al.id, alumno: al.nombre, curso: al.curso, tutor: tutorDeGrupo(tutores, alumnos, al.curso) || al.tutor, tutorEmail: tutores[al.curso]?.email || "", email: al.email, telefono: al.telefono, tipo: fTipo, gravedad: fGravedad, tipificacion: fTipificacion, descripcion: fDesc, profesor: fProfesor, hora: fHora, ts: new Date().toISOString() };
    generarAlertasParte(p, partes);
    setPartes(prev => [p, ...prev]);
    setParteGenerado(p);
    setFAlumno(""); setFBusqueda(""); setFDesc(""); setFTipo("Comportamiento"); setFGravedad("leve"); setFTipificacion("");
  }

  // Marcar si ha venido (lo hace la guardia de la zona o Jefatura); si no se presenta, alerta para Jefatura
  function marcarMedida(id, i, estado) {
    const m = medidas.find(x => x.id === id); if (!m) return;
    setMedidas(prev => prev.map(x => x.id === id ? { ...x, sesiones: x.sesiones.map((s, j) => j === i ? { ...s, estado, marcadaPor: estado === "pendiente" ? "" : usuario } : s) } : x));
    if (estado === "ausente") {
      const s = m.sesiones[i];
      setAlertas(prev => [{ id: Date.now(), tipo: "medida_incumplida", alumno: m.alumno, curso: m.curso, msg: `No se ha presentado a «${tipoMedida(m.tipo).label}» (${fechaCorta(s.fecha)} · ${s.hora}${s.lugar ? ` · ${s.lugar}` : ""}) · lo marcó ${usuario}`, ts: new Date().toISOString(), leida: false }, ...prev]);
    }
  }
  // Quién está de guardia en una zona del cuadrante a esa hora (con ausencias y sustituciones)
  const guardiaDe = (fecha, hora, zonaId) => situacionZona({ fecha, hora, zonaId, profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias, coberturas }).enZona;

  function ponerParteIncumplimiento(m) {
    const al = alumnos.find(a => a.id === m.alumnoId) || {};
    const dias = (m.sesiones || []).filter(s => s.estado === "ausente").map(s => fechaCorta(s.fecha)).join(", ");
    const p = { id: Date.now(), alumnoId: m.alumnoId, alumno: m.alumno, curso: m.curso, tutor: tutorDeGrupo(tutores, alumnos, m.curso) || al.tutor || "", tutorEmail: tutores[m.curso]?.email || "", email: al.email || "", telefono: al.telefono || "", tipo: "Comportamiento", gravedad: "leve", tipificacion: "9L", descripcion: `No ha cumplido la medida «${tipoMedida(m.tipo).label}»${dias ? ` (${dias})` : ""} impuesta por un parte anterior.`, profesor: usuario, hora: "", ts: new Date().toISOString() };
    generarAlertasParte(p, partes);
    setPartes(prev => [p, ...prev]);
    return p.id;
  }

  function crearParteGrupo() {
    if (!gCurso || !gDesc.trim()) return;
    const grupo = alumnos.filter(a => a.curso === gCurso && !gExcluidos.includes(a.id));
    const ts = new Date().toISOString();
    const nuevos = grupo.map(al => ({ id: Date.now() + al.id, alumnoId: al.id, alumno: al.nombre, curso: al.curso, tutor: tutorDeGrupo(tutores, alumnos, al.curso) || al.tutor, tutorEmail: tutores[al.curso]?.email || "", email: al.email, telefono: al.telefono, tipo: gTipo, gravedad: gGravedad, tipificacion: gTipificacion, descripcion: gDesc, profesor: fProfesor, hora: gHora, ts, esGrupal: true }));
    const partesTemp = [...partes]; nuevos.forEach(p => generarAlertasParte(p, partesTemp));
    setPartes(prev => [...nuevos, ...prev]);
    setGrupoGenerado({ curso: gCurso, total: nuevos.length, ts });
    setGDesc(""); setGExcluidos([]); setGTipo("Comportamiento"); setGGravedad("leve"); setGTipificacion("");
  }

  function crearGuardia() {
    if (!guProfesorAusente || !guCurso || !guProfesorGuardia) return;
    const g = { id: Date.now(), profesorAusente: guProfesorAusente, hora: guHora, modulo: guModulo, curso: guCurso, materia: guMateria, profesorGuardia: guProfesorGuardia, motivo: guMotivo, material: guMaterial, ts: new Date().toISOString(), fecha: todayStr() };
    setGuardias(prev => [g, ...prev]);
    setGuardiaGenerada(g);
    setGuProfesorAusente(""); setGuMateria(""); setGuProfesorGuardia(""); setGuMaterial("");
  }

  function checkAbusoBano(alumnoId) {
    const al = alumnos.find(a => a.id === alumnoId);
    const hoy = todayStr(), sem = weekKey(new Date());
    const sal = banos.filter(b => b.alumnoId === alumnoId);
    const hoyC = sal.filter(b => b.fecha === hoy).length + 1;
    const semC = sal.filter(b => weekKey(b.fecha) === sem).length + 1;
    const msgs = [];
    if (hoyC > 2) msgs.push(`Ha ido al baño ${hoyC} veces hoy`);
    if (semC > 3) msgs.push(`Ha ido al baño ${semC} veces esta semana`);
    if (msgs.length > 0) {
      const al2 = { id: Date.now(), tipo: "bano", alumno: al.nombre, curso: al.curso, msg: msgs.join(" · "), msgs, ts: new Date().toISOString(), leida: false };
      setAlertas(prev => [al2, ...prev]); setShowAlerta(al2);
    }
  }

  function registrarSalida() {
    if (!bAlumno) return;
    const id = parseInt(bAlumno); checkAbusoBano(id);
    const al = alumnos.find(a => a.id === id);
    const ahora = new Date().toISOString();
    setBanos(prev => [{ id: Date.now(), alumnoId: id, alumno: al.nombre, curso: al.curso, fecha: todayStr(), salida: ahora, ts: ahora, profesor: usuario || "", regreso: null }, ...prev]);
    setBAlumno(""); setBBusqueda("");
  }

  // Estilos base
  // Campos como los de Raíces: borde turquesa grueso, 48 px de alto y letra de 16 px
  const inpStyle = { width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", background: C.white, color: R.noche };
  const selStyle = { ...inpStyle };
  const labelStyle = { display: "block", fontWeight: 700, marginBottom: 8, color: R.petroleo, fontSize: 15 };
  // Campos de la pantalla principal (rediseño): 48 px de alto, letra de 16 px y borde que se ve
  const campoStyle = { width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, lineHeight: 1.4, fontFamily: "inherit", boxSizing: "border-box", background: C.white, color: R.noche };
  const etiquetaStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontWeight: 700, marginBottom: 8, color: R.petroleo, fontSize: 15 };

  // ── Pantalla de carga ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE }}>
      <div style={{ color: R.petroleo, textAlign: "center" }}>
        <Logo alto={90} />
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 16 }}>Cargando {APP}…</div>
      </div>
    </div>
  );

  if (printParte)   return <PrintParte parte={printParte} onClose={() => setPrintParte(null)} />;
  if (printInforme) return <PrintInforme type={informeType} partes={partesFiltrados} banos={banosFiltrados} tutores={tutores}
    filtros={{ filtCurso, filtAlumno, filtGravedad, filtFechaDesde, filtFechaHasta }}
    onDescargado={inf => setInformes(prev => [{ id: Date.now(), ts: new Date().toISOString(), autor: usuario || "", total: inf.ids.length, ...inf }, ...prev].slice(0, 100))}
    onClose={() => setPrintInforme(false)} />;

  // ── Pantalla de entrada ──
  // Abrir Galvángram en el historial (desde un aviso)
  function abrirMensajes() {
    if (perfil?.id === "profesor") setModuloProfesor("galvangramm");
    if (perfil?.id === "jefatura") setModuloJefatura("galvangramm");
    setTab("mensajeria");
    setVistaGalv({ v: "historial", k: Date.now() });
  }
  const sinLeerMios = mensajes.filter(m => m.destinatario === usuario && !m.leido).length;

  const profeDemo = usuario || ultimoProfe;
  const tutoraDemo = (() => { const t = Object.entries(tutores).filter(([, v]) => v?.tutor && profesores.includes(v.tutor) && v.tutor !== profeDemo && !["Ana Jiménez", "Elena Vega"].includes(v.tutor)).sort(([a], [b]) => a.localeCompare(b))[0]; return t ? { nombre: t[1].tutor, curso: t[0] } : null; })();
  if (!perfil) return (
    <PantallaEntrada profesores={profesores} cuentas={cuentas} setCuentas={setCuentas}
      nombreSugerido={profeDemo} onCargarEjemplo={cargarEjemploGuardias}
      tutoraDemo={tutoraDemo}
      sinLeerPor={mensajes.filter(m => !m.leido).reduce((acc, m) => { const a = acc[m.destinatario] || { total: 0, urgentes: 0 }; a.total++; if (m.urgente) a.urgentes++; acc[m.destinatario] = a; return acc; }, {})}
      onEntrar={(nombre, p, opciones = {}) => {
        setUsuario(nombre); if (profesores.includes(nombre)) setFProfesor(nombre);
        if (p.id === "profesor" && !opciones.otro && nombre !== tutoraDemo?.nombre && !["Ana Jiménez", "Elena Vega"].includes(nombre)) setUltimoProfe(nombre);
        guardarSesion({ usuario: nombre, perfil: p }); setPerfil(p); setTab(tabInicial(p.id));
      }} />
  );

  const avisosPendientes = perfil.id === "profesor" && usuario ? alumnosParaAvisar({ partes, usuario, tutores, avisos: avisosFamilia }).lista.filter(x => x.pendiente).length : 0;
  // Número de la pestaña «Medidas»: las que hay que programar y las que tocan hoy
  const medidasHoy = medidas.filter(m => estadoMedida(m) === "sin_programar").length + medidas.reduce((n, m) => n + (m.sesiones || []).filter(s => s.fecha === isoLocal() && s.estado === "pendiente").length, 0);
  const tabs = perfil.id === "profesor"
    ? moduloProfesor === "alumnos"
      ? [
          { id: "partes",      label: "📋 Nuevo Parte", color: "#06b6d4" },
          { id: "parte_grupo", label: "👥 Parte de Grupo", color: "#ec4899" },
          { id: "bano",        label: "🚻 Baños", color: "#63CBA1" },
          { id: "historial",   label: "🗂 Mis Partes", color: "#2B647E" },
          { id: "mis_estadisticas", label: `📈 Estadísticas${avisosPendientes ? ` · 🔔 ${avisosPendientes}` : ""}`, color: "#06b6d4" },
        ]
      : moduloProfesor === "guardias"
      ? [
          { id: "ahora",          label: "⏰ Ahora", color: "#F6C862" },
          { id: "mi_guardia",     label: "🔄 Mi Guardia Hoy", color: "#06b6d4" },
          { id: "notif_ausencia", label: "📢 Notificar Ausencia", color: "#ec4899" },
          { id: "guardias_ver",   label: "📄 Ver Guardias", color: "#63CBA1" },
        ]
      : [] // Galvángram no tiene tabs adicionales
    : perfil.id === "jefatura"
    ? moduloJefatura === "alumnos"
      ? [
          { id: "dashboard",    label: "📊 Dashboard", color: "#06b6d4" },
          { id: "por_curso",    label: "🏫 Por Curso", color: "#ec4899" },
          { id: "por_alumno",   label: "👤 Por Alumno", color: "#63CBA1" },
          { id: "partes_todos", label: "📋 Partes", color: "#2B647E" },
          { id: "medidas",      label: `⚖️ Medidas${medidasHoy ? ` (${medidasHoy})` : ""}`, color: "#2B647E" },
          { id: "bano_live",    label: "🚻 Baños", color: "#06b6d4" },
          { id: "alertas",      label: `🔔${alertasNoLeidas > 0 ? ` (${alertasNoLeidas})` : ""} Alertas`, color: "#ec4899" },
          { id: "informe",      label: "📤 Informe", color: "#63CBA1" },
          { id: "estadisticas", label: "📈 Estadísticas", color: "#2B647E" },
        ]
      : moduloJefatura === "guardias"
      ? [
          { id: "ahora",         label: "⏰ Ahora", color: "#F6C862" },
          { id: "cuadrante",     label: "📅 Cuadrante", color: "#06b6d4" },
          { id: "coordinacion",  label: "🔄 Coordinación Diaria", color: "#2B647E" },
          { id: "parte_dia",     label: "🔄 Parte del Día", color: "#ec4899" },
          { id: "ausencias_jef", label: "📢 Ausencias de Profesores", color: "#63CBA1" },
          { id: "firmas_jef",    label: "✍️ Firmas y listas", color: "#06b6d4" },
          { id: "estadisticas",  label: "📈 Estadísticas", color: "#2B647E" },
        ]
      : [] // Galvángram no tiene tabs adicionales
    : [
        // Admin no necesita tabs adicionales, solo usa los módulos
      ];

  // Módulos de cada perfil (franja turquesa o menú lateral)
  const irProfesor = (id) => { setModuloProfesor(id); setTab(id === "alumnos" ? "partes" : (id === "guardias" ? "mi_guardia" : "mensajeria")); };
  const irJefatura = (id) => { setModuloJefatura(id); setTab(id === "alumnos" ? "dashboard" : (id === "guardias" ? "cuadrante" : "mensajeria")); };
  const irAdmin = (id) => { setModuloJefatura(id); setTab(id === "alumnos" ? "admin_panel" : "admin_profesores"); };
  const modulos = perfil.id === "profesor"
    ? [
        { id: "alumnos",  label: "👨‍🎓 Partes" },
        { id: "guardias", label: "🔄 Guardias" },
        { id: "galvangramm", label: `💬 Galvángram${sinLeerMios ? ` (${sinLeerMios})` : ""}` },
      ].map(m => ({ ...m, ir: () => irProfesor(m.id) }))
    : perfil.id === "jefatura"
    ? [
        { id: "alumnos",  label: "📋 Partes & Alumnos" },
        { id: "guardias", label: "🔄 Guardias & Ausencias" },
        { id: "galvangramm", label: `💬 Galvángram${sinLeerMios ? ` (${sinLeerMios})` : ""}` },
      ].map(m => ({ ...m, ir: () => irJefatura(m.id) }))
    : perfil.id === "admin"
    ? [
        { id: "alumnos",  label: "👥 Alumnos" },
        { id: "guardias", label: "👨‍🏫 Profesores" },
      ].map(m => ({ ...m, ir: () => irAdmin(m.id) }))
    : [];
  const moduloActivo = perfil.id === "profesor" ? moduloProfesor : moduloJefatura;

  return (
    <CorreosCentroCtx.Provider value={{ correos: correosCentro, setCorreos: setCorreosCentro, profes: profesores.map(p => ({ nombre: p, email: cuentas[p]?.email || (MODO_DEMO ? correoDemo(p) : "") })) }}>
    <div className="gd-app" style={{ minHeight: "100vh", background: C.white, color: R.petroleo, fontFamily: FUENTE, fontSize: 16, lineHeight: 1.5, width: "100%" }}>
      {usuario && <AvisosMensajes mensajes={mensajes} usuario={usuario} C={C} onAbrir={abrirMensajes}
        onActualizar={(id, cambios) => setMensajes(prev => prev.map(m => m.id === id ? { ...m, ...cambios } : m))} />}
      {/* Estilo inspirado en Raíces: cabecera blanca, menú turquesa (lateral en pantallas anchas) y pestañas grises */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        .gd-app :focus-visible { outline: 3px solid ${R.azul}; outline-offset: 2px; }
        .gd-pulsable:active:not(:disabled) { transform: scale(.98); }
        .gd-redondo { width: 52px; height: 52px; padding: 0; border-radius: 50%; border: none; background: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .gd-redondo:hover { filter: brightness(.95); }
        .gd-solo-movil { display: none; }
        .gd-modulos { background: ${R.turquesa}; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; }
        .gd-modulo { min-height: 52px; padding: 0 10px; border: none; border-right: 1px solid rgba(255,255,255,.7); background: transparent; color: #fff; font-family: inherit; font-size: 18px; font-weight: 400; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; }
        .gd-modulo:last-child { border-right: none; }
        .gd-modulo::before { content: ""; flex: none; border-left: 9px solid ${R.mostaza}; border-top: 7px solid transparent; border-bottom: 7px solid transparent; }
        .gd-modulo:hover { background: rgba(255,255,255,.18); }
        .gd-modulo.activo { box-shadow: inset 0 -5px 0 ${R.mostaza}; }
        .gd-modulo.activo::before { border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid ${R.mostaza}; border-bottom: none; }
        .gd-tabs { display: flex; overflow-x: auto; background: ${R.gris}; border-bottom: 1px solid #D5DEE2; -webkit-overflow-scrolling: touch; }
        .gd-tab { flex: none; min-height: 48px; padding: 0 16px; border: none; border-right: 1px solid #D5DEE2; background: transparent; color: ${R.petroleo}; font-family: inherit; font-size: 16px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; }
        .gd-tab:hover { background: rgba(255,255,255,.6); }
        .gd-tab.activo { background: ${C.white}; font-weight: 700; box-shadow: inset 0 3px 0 ${R.azul}; }
        @media (prefers-reduced-motion: reduce) { .gd-pulsable:active:not(:disabled) { transform: none; } }
        @media print { .no-print { display: none !important; } }
        @media (min-width: 900px) {
          .gd-cuerpo { display: grid; grid-template-columns: 250px minmax(0, 1fr); align-items: stretch; min-height: calc(100vh - 110px); }
          .gd-lateral { display: flex; flex-direction: column; background: ${R.turquesa}; }
          .gd-modulos { display: contents; }
          .gd-modulo { justify-content: flex-start; text-align: left; border-right: none; border-bottom: 1px solid rgba(255,255,255,.7); min-height: 50px; padding: 6px 16px; font-size: 22px; line-height: 1.2; }
          .gd-modulo.activo { box-shadow: none; }
          .gd-tabs { flex-direction: column; overflow: visible; background: ${R.turquesaClaro}; border-bottom: none; }
          .gd-tab { border-right: none; border-bottom: 1px solid rgba(255,255,255,.8); padding: 6px 16px 6px 34px; white-space: normal; text-align: left; color: ${R.noche}; }
          .gd-tab.activo { box-shadow: inset 5px 0 0 ${R.azul}; color: ${R.petroleo}; }
        }
        @media (max-width: 1100px) { .gd-saludo-cab { display: none !important; } .gd-solo-movil { display: block; } .gd-logo-grande { display: none !important; } .gd-logo-corto { display: block !important; } }
        @media (max-width: 600px) {
          .gd-header { padding: 8px 12px !important; }
          .gd-redondo { width: 46px; height: 46px; }
          .gd-redondo img { width: 46px !important; height: 46px !important; }
          .gd-titulo-bloque { font-size: 28px !important; }
          .gd-header-izq { gap: 8px !important; }
          .gd-logo { display: none; }
          .gd-header select { max-width: 120px !important; }
          .gd-modulo { font-size: 16px; padding: 0 6px; gap: 6px; }
          .gd-contenido { padding: 16px 16px 32px !important; }
          .gd-rejilla-3 { grid-template-columns: 1fr !important; gap: 16px !important; }
          .gd-bloque { padding: 16px !important; }
        }
      `}</style>
      <AvisoDemo compacto />
      {/* Cabecera blanca, como Raíces: nombre, saludo y botones redondos con dibujo (inicio, preguntas, salir) */}
      <div className="gd-header" style={{ background: C.white, color: R.petroleo, padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", width: "100%", gap: 8, borderBottom: "1px solid #E3E9EC" }}>
        <div className="gd-header-izq" style={{ display: "flex", alignItems: "center", gap: 22, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <Logo alto={68} corto />
              <div className="gd-solo-movil" style={{ fontSize: 14, lineHeight: 1.3, color: R.petroleo, marginTop: 4 }}>{CENTRO} · {sinEmoji1(perfil.label)}</div>
            </div>
          </div>
          <div className="gd-saludo-cab" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: R.petroleo, minWidth: 0, maxWidth: 560 }}>
            <Icono nombre="perfil" tam={34} />
            <span>Hola <span style={{ color: R.azul }}>{usuario}</span>, tu perfil es <span style={{ color: R.azul }}>{sinEmoji1(perfil.label)}</span> y tu centro es {CENTRO}.</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginLeft: "auto" }}>
          {perfilesPermitidos(cuentas, usuario).length > 1 && <SelectorPerfil perfiles={perfilesPermitidos(cuentas, usuario)} actual={perfil} onCambiar={cambiarPerfil} cargos={cargoDe(cuentas, usuario).label} />}
          <button className="gd-redondo" aria-label="Inicio" title="Inicio" onClick={() => {
            setTab(perfil.id === "jefatura" ? "dashboard" : perfil.id === "admin" ? "admin_panel" : "partes");
            if (perfil.id === "profesor") setModuloProfesor("alumnos");
            if (perfil.id === "jefatura") setModuloJefatura("alumnos");
          }}><Icono nombre="inicio" tam={52} /></button>
          <button className="gd-redondo" onClick={() => abrirPreguntas()} aria-label="Preguntas frecuentes" title="Preguntas frecuentes"><Icono nombre="como-se-usa" tam={52} /></button>
          <button className="gd-redondo" onClick={salir} aria-label="Salir" title="Salir"><Icono nombre="fuera-ahora" tam={52} /></button>
        </div>
      </div>

      {/* Menú: franja turquesa en el móvil; en pantallas anchas, menú lateral con las pestañas debajo del módulo elegido.
          Solo texto, como en Raíces */}
      <div className="gd-cuerpo">
      <nav className="gd-lateral no-print" aria-label="Secciones">
      {modulos.length > 0 && (
        <div className="gd-modulos">
          {modulos.map((m, i) => (
            <button key={m.id} className={"gd-modulo" + (moduloActivo === m.id ? " activo" : "")} style={{ order: 2 * i }}
              onClick={m.ir}>
              {sinEmoji1(m.label)}
            </button>
          ))}
        </div>
      )}

      {tabs.length > 0 && (
        <div className="gd-tabs" style={{ order: 2 * Math.max(0, modulos.findIndex(m => m.id === moduloActivo)) + 1 }}>
          {tabs.map(t => (
            <button key={t.id} className={"gd-tab" + (tab === t.id ? " activo" : "")} onClick={() => setTab(t.id)}>
              {sinEmoji1(t.label)}
            </button>
          ))}
        </div>
      )}
      </nav>

      {/* Contenido — centrado con max-width */}
      <div className="gd-contenido" style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "20px 24px 40px" }}>

        {/* Aviso al profesorado: alumnado con 3 o más partes para avisar a su familia */}
        {perfil.id === "profesor" && avisosPendientes > 0 && tab !== "mis_estadisticas" && (
          <div role="status" className="no-print" style={{ marginBottom: 28 }}>
            <TituloBloque titulo="Avisos" sub="Familias por avisar" icono="alertas" />
            <div style={{ background: R.mostaza, color: R.noche, padding: "10px 14px", fontSize: 16, lineHeight: 1.4 }}>
              Hay <b style={{ fontSize: 20 }}>{avisosPendientes}</b> alumno/a(s) con {UMBRAL_AVISO} o más partes este trimestre.
            </div>
            <div style={{ background: R.crema, color: R.petroleo, padding: "12px 14px", fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
              Conviene avisar a su familia. Tienes el informe y el correo preparados.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setModuloProfesor("alumnos"); setTab("mis_estadisticas"); window.scrollTo(0, 0); }}
                style={{ background: "none", color: R.azul, border: "none", minHeight: 44, padding: "0 4px", cursor: "pointer", fontSize: 18, display: "inline-flex", alignItems: "center", gap: 10 }}>Ver avisos <span aria-hidden="true" style={triangulo} /></button>
            </div>
          </div>
        )}

        {/* Ayuda de la pantalla */}
        <AyudaPantalla key={tab} id={tab} C={C} />

        {/* Alerta flotante */}
        {showAlerta && (
          <div style={{ ...caja(R.mostaza), padding: "14px 56px 14px 16px", marginBottom: 16, position: "relative" }}>
            <strong style={{ color: R.petroleo, fontSize: 16 }}>⚠️ {showAlerta.alumno} — {showAlerta.curso}</strong>
            <p style={{ margin: "4px 0 0", fontSize: 15, color: R.petroleo }}>{showAlerta.msg || showAlerta.msgs?.join(" · ")}</p>
            <button onClick={() => setShowAlerta(null)} aria-label="Cerrar aviso" style={{ position: "absolute", top: 6, right: 6, width: 44, height: 44, background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 20, color: R.petroleo }}>✕</button>
          </div>
        )}

        {/* ── Nuevo Parte ── */}
        {tab === "partes" && (
          <div>
            {/* BIENVENIDA PERSONALIZADA CON SALUDO POR HORA */}
            {(() => {
              const hora = new Date().getHours();
              let saludo = "";
              if (hora < 14) saludo = "¡Buenos días";
              else if (hora < 21) saludo = "¡Buenas tardes";
              else saludo = "¡Buenas noches";
              
              const partesHoy = partes.filter(p => p.ts.split("T")[0] === todayStr() && p.profesor === usuario).length;
              const banoHoy = banos.filter(b => (b.ts || b.salida || "").split("T")[0] === todayStr() && b.profesor === usuario).length;
              
              // Calcular guardias pendientes del profesor
              const diasES  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
              const diaHoy  = diasES[new Date().getDay()];
              const guardiasHoy = guardiasDeProfesor({ fecha: isoLocal(), profesor: usuario, profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias }).length;
              
              return (
                <div style={{ color: R.petroleo, marginBottom: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <h1 style={{ margin: 0, fontFamily: TITULO, fontSize: 26, lineHeight: 1.2, fontWeight: 400, marginBottom: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", textWrap: "balance" }}>{saludo}, {usuario}! <Icono nombre="saludo" tam={36} /></h1>
                      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
                        Hoy has registrado <strong>{partesHoy} parte{partesHoy !== 1 ? 's' : ''}</strong>
                        {banoHoy > 0 && <> y <strong>{banoHoy} salida{banoHoy !== 1 ? 's' : ''}</strong> al baño</>}
                        {partesHoy === 0 && banoHoy === 0 && <>. ¡Buen día!</>}
                      </p>
                      {guardiasHoy > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ background: R.verde, color: R.noche, padding: "8px 12px" }}><strong style={{ fontSize: 16, display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="alerta" tam={26} />Alerta: Tienes {guardiasHoy} guardia{guardiasHoy !== 1 ? 's' : ''} hoy</strong></div>
                          <div style={{ background: R.azulClaro, color: R.petroleo, padding: "8px 12px", fontSize: 15 }}>Ve a la sección "Mi Guardia Hoy" para verlas</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icono nombre="fecha" tam={32} />
                      <div style={{ fontSize: 15 }}>{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bloque como los de Raíces: título grande, línea azul y apartados sobre azul claro */}
            <TituloBloque titulo="Nuevo Parte de Incidencia" sub="Registra lo ocurrido en clase" icono="nuevo-parte" />
            <div className="gd-bloque" style={{ background: R.azulClaro, padding: 20 }}>
            {parteGenerado && (
              <Card style={{ ...caja(R.verde), borderRadius: 0, boxShadow: "none", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: R.petroleo, fontSize: 16 }}>✅ Parte generado · {fmt(parteGenerado.ts)}</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="gd-pulsable" onClick={() => setShowParte(completar(parteGenerado))} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 16px", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "inline-flex", alignItems: "center" }}><Ic n="buscar" tam={20} />Ver</button>
                  </div>
                </div>
                <MedidasDeParte key={parteGenerado.id} parte={parteGenerado} medidas={medidas} setMedidas={setMedidas} esJefatura={perfil.id === "jefatura"} usuario={usuario} />
                <ComoAvisar parte={completar(parteGenerado)} />
              </Card>
            )}
            <Card style={{ background: "transparent", boxShadow: "none", padding: 0 }}>
              <label style={etiquetaStyle}><ConIcono texto="🔍 Buscar alumno" tam={32} /></label>
              <div style={{ position: "relative" }}>
                <Icono nombre="curso" tam={28} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input value={fBusqueda} onChange={e => { setFBusqueda(e.target.value); setFAlumno(""); }} placeholder="Nombre o curso…" style={{ ...campoStyle, paddingLeft: 46 }} />
              </div>
              {fBusqueda && !fAlumno && (
                <div style={{ border: `1.5px solid ${C.gray}`, borderRadius: 10, marginTop: 6, background: C.white, maxHeight: 240, overflowY: "auto", marginBottom: 8 }}>
                  {alumnos.filter(a => a.nombre.toLowerCase().includes(fBusqueda.toLowerCase()) || a.curso.toLowerCase().includes(fBusqueda.toLowerCase())).map(a => (
                    <div key={a.id} onClick={() => { setFAlumno(a.id); setFBusqueda(a.nombre); }}
                      style={{ minHeight: 48, padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #CDE9ED", fontSize: 16, color: C.dark }}
                      onMouseOver={e => e.currentTarget.style.background = "#EBF0F6"}
                      onMouseOut={e => e.currentTarget.style.background = C.white}>
                      <strong>{a.nombre}</strong> — {a.curso}
                    </div>
                  ))}
                </div>
              )}
              {alumnoSel && (
                <div style={{ background: C.white, color: R.petroleo, padding: "12px 14px", margin: "10px 0 18px", fontSize: 15, lineHeight: 1.45, border: `1px solid ${R.turquesaClaro}` }}>
                  {(() => {
                    // Datos del alumnado: solo los ve el profesorado implicado. El tutor/a del grupo ve
                    // el contacto y todos sus partes; el resto, solo los partes que le ha puesto él/ella.
                    const tutorAl = tutorDeGrupo(tutores, alumnos, alumnoSel.curso) || alumnoSel.tutor;
                    const yo = fProfesor || usuario;
                    const esTutor = !!yo && tutorAl === yo;
                    const mios = partesDeAlumno(alumnoSel.id).filter(p => p.profesor === yo);
                    return (<>
                      <div><strong>Curso:</strong> {alumnoSel.curso} | <strong>Tutor/a:</strong> {tutorAl || "—"}</div>
                      {esTutor ? (<>
                        <div style={{ marginTop: 4 }}><Ic n="mensaje-enviar" tam={20} />{alumnoSel.email} · 📱 {alumnoSel.telefono}</div>
                        {partesLeves(alumnoSel.id) >= 3 && <div style={{ marginTop: 6, color: R.petroleo, fontWeight: 700, borderLeft: `6px solid ${R.mostaza}`, paddingLeft: 8 }}>⚠️ Acumulación: {partesLeves(alumnoSel.id)} partes leves</div>}
                        <div style={{ marginTop: 2, color: R.petroleo }}>Eres su tutor/a · Partes en total: {partesDeAlumno(alumnoSel.id).length}</div>
                      </>) : (<>
                        <div style={{ marginTop: 4, color: R.petroleo }}>Partes que le has puesto tú: <strong style={{ color: R.petroleo }}>{mios.length}</strong></div>
                        <div style={{ marginTop: 2, fontSize: 14, color: R.petroleo }}>El contacto de la familia aparece al generar el parte, para que puedas avisarla.</div>
                      </>)}
                    </>);
                  })()}
                </div>
              )}
              <div className="gd-rejilla-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 18, marginTop: 8 }}>
                <div><label style={etiquetaStyle}><ConIcono texto="⏰ Hora de clase" tam={32} /></label><select value={fHora} onChange={e => setFHora(e.target.value)} style={campoStyle}>{HORAS.map(h => <option key={h} value={h}>{conTramo(h)}</option>)}</select></div>
                <div><label style={etiquetaStyle}><ConIcono texto="📂 Tipo de parte" tam={32} /></label><select value={fTipo} onChange={e => setFTipo(e.target.value)} style={campoStyle}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={etiquetaStyle}><ConIcono texto="🎯 Gravedad" tam={32} /></label><select value={fGravedad} onChange={e => { setFGravedad(e.target.value); setFTipificacion(""); }} style={{ ...campoStyle, borderLeft: `14px solid ${COLOR_GRAVEDAD[fGravedad] || C.gray}`, fontWeight: 700 }}>{GRAVEDAD.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={etiquetaStyle}><ConIcono texto="⚖️ Tipificación normativa" tam={32} /> <span style={{ fontWeight: 400, color: R.petroleo, fontSize: 14 }}>({fGravedad === "leve" ? "Plan de Convivencia del Centro" : "Decreto 32/2019 CAM"})</span></label>
                <div style={{ position: "relative" }}>
                <Icono nombre="seleccionar" tam={28} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <select value={fTipificacion} onChange={e => setFTipificacion(e.target.value)} style={{ ...campoStyle, paddingLeft: 46, borderColor: fTipificacion ? R.azul : R.turquesa }}>
                  <option value="">— Seleccionar tipificación (opcional) —</option>
                  {(TIPIFICACION[fGravedad] || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                </div>
                {fTipificacion && (
                  <div style={{ marginTop: 8, ...caja(R.verde), padding: "8px 12px", fontSize: 15, lineHeight: 1.4, color: R.petroleo, fontWeight: 700 }}>
                    ✓ {TIPIFICACION[fGravedad]?.find(t => t.id === fTipificacion)?.label}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={etiquetaStyle}><ConIcono texto="📝 Descripción del incidente" tam={32} /></label>
                <FrasesRapidas tipo={fTipo} tipificacion={fTipificacion} texto={fDesc} setTexto={setFDesc} />
                <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} rows={4} placeholder="Describe detalladamente lo ocurrido… o pulsa las frases rápidas de arriba" style={{ ...campoStyle, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={etiquetaStyle}><ConIcono texto="👤 Profesor responsable" tam={32} /></label>
                <select value={fProfesor} onChange={e => setFProfesor(e.target.value)} style={{ ...campoStyle, ...(identidadFija ? { background: R.gris, borderColor: R.turquesaClaro } : {}) }} disabled={identidadFija}>{profesores.map(p => <option key={p}>{p}</option>)}</select>
              </div>
              {/* Acción principal: azul de Raíces con texto blanco (contraste 6,9:1) */}
              <button className="gd-pulsable" onClick={crearParte} disabled={!fAlumno || !fDesc.trim()}
                style={{ width: "100%", minHeight: 52, padding: "0 20px", borderRadius: 6, border: "none", cursor: !fAlumno || !fDesc.trim() ? "not-allowed" : "pointer", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  ...(!fAlumno || !fDesc.trim() ? { background: R.gris, color: R.petroleo, opacity: .7 } : { background: R.azul, color: "#fff" }) }}>
                <ConIcono texto="📋 Generar Parte" tam={28} />
              </button>
            </Card>
            </div>
          </div>
        )}

        {/* ── Parte de grupo ── */}
        {tab === "parte_grupo" && (
          <div>
            <TituloBloque titulo="Parte de Grupo" sub="Un parte para cada alumno/a del grupo" icono="grupos" />
            {grupoGenerado && <Card style={{ ...caja(R.verde), marginTop: 16, marginBottom: 20 }}><strong style={{ color: R.petroleo, fontSize: 16 }}>✅ {grupoGenerado.total} partes generados para {grupoGenerado.curso} · {fmt(grupoGenerado.ts)}</strong></Card>}
            <Card style={{ background: R.azulClaro, border: "none" }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}><Ic n="por-curso" tam={24} />Seleccionar curso / grupo</label>
                <select value={gCurso} onChange={e => { setGCurso(e.target.value); setGExcluidos([]); }} style={selStyle}>
                  <option value="">— Selecciona un curso —</option>
                  {cursos.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {gCurso && (() => {
                const grupo = alumnos.filter(a => a.curso === gCurso);
                const activos = grupo.filter(a => !gExcluidos.includes(a.id));
                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}><Ic n="por-alumno" tam={24} />Alumnos <span style={{ color: R.petroleo, fontWeight: 400 }}>({activos.length} de {grupo.length})</span></label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setGExcluidos(grupo.map(a => a.id))} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>Excluir todos</button>
                        <button onClick={() => setGExcluidos([])} style={{ background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 12px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>Incluir todos</button>
                      </div>
                    </div>
                    <div style={{ border: `1px solid ${R.turquesaClaro}`, overflow: "hidden", background: C.white }}>
                      {grupo.map(a => {
                        const excl = gExcluidos.includes(a.id);
                        return (
                          <div key={a.id}
                            onClick={() => setGExcluidos(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 52, padding: "8px 14px", borderBottom: `1px solid ${R.turquesaClaro}`, cursor: "pointer", background: excl ? R.gris : C.white }}
                            onMouseOver={e => e.currentTarget.style.background = excl ? "#DDE4EC" : R.azulClaro}
                            onMouseOut={e => e.currentTarget.style.background = excl ? R.gris : C.white}>
                            <span style={{ fontSize: 16, textDecoration: excl ? "line-through" : "none", color: R.petroleo }}><strong>{a.nombre}</strong></span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: excl ? R.petroleo : R.noche, background: excl ? C.white : R.verde, border: excl ? `1px solid ${R.turquesaClaro}` : "none", borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap" }}>{excl ? "Excluido" : "✔ Incluido"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div className="gd-rejilla-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
                <div><label style={labelStyle}><ConIcono texto="⏰ Hora" tam={30} /></label><select value={gHora} onChange={e => setGHora(e.target.value)} style={selStyle}>{HORAS.map(h => <option key={h} value={h}>{conTramo(h)}</option>)}</select></div>
                <div><label style={labelStyle}><ConIcono texto="📂 Tipo" tam={30} /></label><select value={gTipo} onChange={e => setGTipo(e.target.value)} style={selStyle}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}><ConIcono texto="🎯 Gravedad" tam={30} /></label><select value={gGravedad} onChange={e => { setGGravedad(e.target.value); setGTipificacion(""); }} style={{ ...selStyle, borderLeft: `14px solid ${COLOR_GRAVEDAD[gGravedad] || R.turquesa}`, fontWeight: 700 }}>{GRAVEDAD.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
                {gGravedad && TIPIFICACION[gGravedad]?.length > 0 && (
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labelStyle}><ConIcono texto="⚖️ Tipificación de la falta" tam={30} /></label>
                    <select value={gTipificacion} onChange={e => setGTipificacion(e.target.value)} style={selStyle}>
                      <option value="">— Seleccionar tipificación —</option>
                      {TIPIFICACION[gGravedad].map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    {gGravedad !== "leve" && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 6 }}>Decreto 32/2019 de la CAM</div>}
                    {gGravedad === "leve" && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 6 }}>Plan de Convivencia del Centro</div>}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}><ConIcono texto="📝 Descripción" tam={30} /></label>
                <FrasesRapidas tipo={gTipo} tipificacion={gTipificacion} texto={gDesc} setTexto={setGDesc} />
                <textarea value={gDesc} onChange={e => setGDesc(e.target.value)} rows={4} placeholder="Describe el comportamiento del grupo…" style={{ ...inpStyle, resize: "vertical" }} />
              </div>
              <Btn onClick={crearParteGrupo} disabled={!gCurso || !gDesc.trim()} style={{ width: "100%", minHeight: 52 }}>
                <Ic n="grupos" tam={20} />Generar Parte para {gCurso ? `${alumnos.filter(a => a.curso === gCurso && !gExcluidos.includes(a.id)).length} alumnos de ${gCurso}` : "el grupo"}
              </Btn>
            </Card>
          </div>
        )}

        {/* ── Baños (profesor) ── */}
        {tab === "bano" && (
          <div>
            <TituloBloque titulo="Control de Salidas al Baño" sub="Quién sale y cuándo vuelve" icono="banos" />
            <Card style={{ background: R.azulClaro, border: "none" }}>
              <label style={labelStyle}><ConIcono texto="🔍 Buscar alumno" tam={30} /></label>
              <input value={bBusqueda} onChange={e => { setBBusqueda(e.target.value); setBAlumno(""); }} placeholder="Nombre o curso…" style={{ ...inpStyle, marginBottom: 8 }} />
              {bBusqueda && !bAlumno && (
                <div style={{ border: `3px solid ${R.turquesa}`, borderRadius: 6, background: C.white, maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
                  {alumnos.filter(a => a.nombre.toLowerCase().includes(bBusqueda.toLowerCase()) || a.curso.toLowerCase().includes(bBusqueda.toLowerCase())).map(a => (
                    <div key={a.id} onClick={() => { setBAlumno(a.id); setBBusqueda(a.nombre); }}
                      style={{ minHeight: 48, padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 16, color: R.noche }}
                      onMouseOver={e => e.currentTarget.style.background = R.azulClaro}
                      onMouseOut={e => e.currentTarget.style.background = C.white}>
                      <strong>{a.nombre}</strong> — {a.curso}
                    </div>
                  ))}
                </div>
              )}
              <Btn onClick={registrarSalida} disabled={!bAlumno} style={{ width: "100%", minHeight: 52 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="banos" tam={24} />Registrar Salida</span></Btn>
            </Card>
            {banoActivos.length > 0 && (
              <Card style={{ padding: 0, border: "none" }}>
                <h3 style={{ margin: 0, padding: "10px 14px", background: R.mostaza, color: R.noche, fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="fuera-ahora" tam={32} />Fuera ahora ({banoActivos.length})</h3>
                {banoActivos.map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", background: R.crema, borderBottom: `2px solid ${C.white}` }}>
                    <div style={{ fontSize: 16, color: R.petroleo }}><strong>{b.alumno}</strong> — {b.curso} — {fmt(b.salida)}</div>
                    <button onClick={() => setBanos(prev => prev.map(x => x.id === b.id ? { ...x, regreso: new Date().toISOString() } : x))}
                      style={{ background: R.verde, color: R.noche, border: "none", borderRadius: 6, minHeight: 48, padding: "0 16px", cursor: "pointer", fontSize: 17, fontWeight: 700, flexShrink: 0 }}>✅ Regresó</button>
                  </div>
                ))}
              </Card>
            )}
            <Card>
              <h3 style={{ marginTop: 0, color: R.petroleo, fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="horario" tam={32} />Historial de hoy</h3>
              {banos.filter(b => b.fecha === todayStr()).length === 0
                ? <p style={{ color: R.petroleo }}>Sin registros hoy</p>
                : banos.filter(b => b.fecha === todayStr()).map(b => {
                  const mins = b.regreso ? Math.round((new Date(b.regreso) - new Date(b.salida)) / 60000) : null;
                  return (
                    <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 15, color: R.petroleo, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <span><strong>{b.alumno}</strong> — {b.curso}</span>
                      <span>{fmt(b.salida)} {b.regreso ? `· ${mins} min` : "· 🔴 Fuera"}</span>
                    </div>
                  );
                })}
            </Card>
          </div>
        )}

        {/* ── Planificador de Guardias ── */}
        {tab === "planificador" && (
          <PlanificadorGuardias
            profesores={profesores}
            cursos={cursos}
            inpStyle={inpStyle}
            selStyle={selStyle}
            labelStyle={labelStyle}
          />
        )}

        {/* ── Registrar Guardia ── */}
        {tab === "guardias_prof" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Registrar Guardia" icono="guardias" /></div>
            {guardiaGenerada && (
              <Card style={{ background: "#DDF0F4", border: `2px solid ${C.teal}`, marginBottom: 20 }}>
                <strong style={{ color: C.teal }}>✅ Guardia registrada · {fmt(guardiaGenerada.ts)}</strong>
                <div style={{ fontSize: 14, marginTop: 4, color: C.dark }}>{guardiaGenerada.hora} · {guardiaGenerada.curso} · Guardia: {guardiaGenerada.profesorGuardia}</div>
              </Card>
            )}
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><label style={labelStyle}>👤 Profesor ausente</label><select value={guProfesorAusente} onChange={e => setGuProfesorAusente(e.target.value)} style={selStyle}><option value="">— Seleccionar —</option>{profesores.map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label style={labelStyle}><ConIcono texto="⏰ Hora de la guardia" tam={40} /></label><select value={guHora} onChange={e => setGuHora(e.target.value)} style={selStyle}>{HORAS.map(h => <option key={h} value={h}>{conTramo(h)}</option>)}</select></div>
                <div><label style={labelStyle}>🏢 Módulo</label><select value={guModulo} onChange={e => setGuModulo(e.target.value)} style={selStyle}>{MODULOS.map(m => <option key={m}>{m}</option>)}</select></div>
                <div><label style={labelStyle}>🏫 Curso</label><select value={guCurso} onChange={e => setGuCurso(e.target.value)} style={selStyle}><option value="">— Seleccionar —</option>{cursos.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={labelStyle}><Ic n="aula" tam={20} />Materia</label><input value={guMateria} onChange={e => setGuMateria(e.target.value)} placeholder="Ej: Matemáticas" style={inpStyle} /></div>
                <div><label style={labelStyle}>🔄 Profesor de guardia</label><select value={guProfesorGuardia} onChange={e => setGuProfesorGuardia(e.target.value)} style={selStyle}><option value="">— Seleccionar —</option>{profesores.filter(p => p !== guProfesorAusente).map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label style={labelStyle}>❓ Motivo de ausencia</label><select value={guMotivo} onChange={e => setGuMotivo(e.target.value)} style={selStyle}>{MOTIVOS.map(m => <option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}><ConIcono texto="📝 Material dejado para trabajar" tam={40} /></label>
                <textarea value={guMaterial} onChange={e => setGuMaterial(e.target.value)} rows={3} placeholder="Describe el material o tarea…" style={{ ...inpStyle, resize: "vertical" }} />
              </div>
              <Btn onClick={crearGuardia} disabled={!guProfesorAusente || !guCurso || !guProfesorGuardia} color={C.blue} style={{ width: "100%", fontSize: 15, padding: "14px" }}>
                <Ic n="guardias" tam={20} />Registrar Guardia
              </Btn>
            </Card>
          </div>
        )}

        {/* ── Ahora: la hora en curso (profesorado y jefatura) ── */}
        {tab === "ahora" && (
          <AhoraGuardias profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia} ausencias={ausencias} coberturas={coberturas} setCoberturas={setCoberturas} puedeAsignar={perfil.id === "jefatura"} usuario={perfil.id === "profesor" ? (fProfesor || usuario) : ""} C={C} />
        )}

        {/* ── Ver Guardias (profesor) ── */}
        {tab === "guardias_ver" && (
          <ParteDia profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia} ausencias={ausencias} coberturas={coberturas} C={C} />
        )}

        {/* ── Mis Partes ── */}
        {tab === "historial" && (
          <div>
            <TituloBloque titulo="Mis Partes Enviados" sub="Pulsa un parte para verlo en grande" icono="documentos" />
            <div style={{ height: 16 }} />
            {partes.filter(p => p.profesor === fProfesor).length === 0
              ? <Card style={{ textAlign: "center", color: R.petroleo, padding: 40, fontSize: 16 }}>No has generado ningún parte aún</Card>
              : partes.filter(p => p.profesor === fProfesor).map(p => <ParteCard key={p.id} parte={p} medidas={medidas.filter(m => m.parteId === p.id)} onVer={() => setShowParte(completar(p))} onPrint={() => pdfParte(completar(p))} />)}
          </div>
        )}

        {/* ── Dashboard ── */}
        {tab === "dashboard" && (
          <div>
            {/* BIENVENIDA PERSONALIZADA CON SALUDO POR HORA */}
            {(() => {
              const hora = new Date().getHours();
              let saludo = "";
              if (hora < 14) saludo = "¡Buenos días";
              else if (hora < 21) saludo = "¡Buenas tardes";
              else saludo = "¡Buenas noches";
              
              const hoyISO = isoLocal();
              const guardiaHoy = Object.keys(cuadrante).filter(k => k.startsWith(`${hoyISO}|`)).length;
              const partesHoy = partes.filter(p => p.ts.split("T")[0] === todayStr()).length;
              const ausenciasHoy = ausencias.filter(a => isoLocal(a.fecha) === hoyISO).length;
              
              return (
                <div style={{ color: R.petroleo, marginBottom: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <h1 style={{ margin: 0, fontFamily: TITULO, fontSize: 26, lineHeight: 1.2, fontWeight: 400, marginBottom: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", textWrap: "balance" }}>{saludo}, {usuario}! <Icono nombre="saludo" tam={36} /></h1>
                      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
                        Hoy hay <strong>{guardiaHoy} zona{guardiaHoy !== 1 ? 's' : ''} de guardia</strong> programada{guardiaHoy !== 1 ? 's' : ''} 
                        {partesHoy > 0 && <> y <strong>{partesHoy} parte{partesHoy !== 1 ? 's' : ''}</strong> registrado{partesHoy !== 1 ? 's' : ''}</>}
                        {ausenciasHoy > 0 && <> con <strong>{ausenciasHoy} ausencia{ausenciasHoy !== 1 ? 's' : ''}</strong></>}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icono nombre="fecha" tam={32} />
                <div style={{ fontSize: 15 }}>{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Estado General" icono="dashboard" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Partes", value: partes.length,                                              color: C.dark,   emoji: "📋", ic: "partes" },
                { label: "Leves",        value: partes.filter(p => p.gravedad === "leve").length,           color: C.teal,   emoji: "🟡", ic: "leve" },
                { label: "Graves",       value: partes.filter(p => p.gravedad === "grave").length,          color: C.amber,  emoji: "⚠️", ic: "grave" },
                { label: "Muy Graves",   value: partes.filter(p => p.gravedad === "muy_grave").length,      color: C.salmon, emoji: "🔴", ic: "muy-grave" },
                { label: "Fuera Ahora",  value: banoActivos.length,                                         color: C.blue,   emoji: "🚻", ic: "banos" },
                { label: "Profes ausentes hoy", value: new Set(ausencias.filter(a => isoLocal(a.fecha) === isoLocal()).map(a => a.profesor)).size, color: "#2B647E",emoji: "🔄", ic: "profe-ausente" },
                { label: "Alertas",      value: alertasNoLeidas,                                             color: C.salmon, emoji: "🔔", ic: "alertas" },
              ].map(s => (
                <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderTop: `4px solid ${s.color}` }}>
                  <Icono nombre={s.ic} tam={52} style={{ margin: "0 auto" }} />
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 8 }}>{s.value}</div>
                  <div style={{ fontSize: 14, color: C.gray, marginTop: 8, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <h3 style={{ color: C.dark }}>Resumen por curso</h3>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {cursos.map(c => {
                const pC = partes.filter(p => p.curso === c);
                if (!pC.length) return null;
                return (
                  <div key={c} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.cream}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, color: C.dark }}><Ic n="por-curso" tam={20} />{c} <span style={{ color: C.gray, fontWeight: 400, fontSize: 14 }}>— {pC.length} parte(s)</span></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["leve", "grave", "muy_grave"].map(g => { const n = pC.filter(p => p.gravedad === g).length; if (!n) return null; const gv = gObj(g); return <span key={g} style={{ background: gv.color, color: gv.texto, borderRadius: 8, padding: "3px 10px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icono nombre={g === "muy_grave" ? "muy-grave" : g} tam={18} />×{n}</span>; })}
                    </div>
                  </div>
                );
              })}
              {partes.length === 0 && <div style={{ padding: 20, color: C.gray, textAlign: "center" }}>Sin incidencias registradas</div>}
            </Card>
            <h3 style={{ color: C.dark }}>Alumnos con más incidencias</h3>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {alumnos.filter(a => partesDeAlumno(a.id).length > 0).sort((a, b) => partesDeAlumno(b.id).length - partesDeAlumno(a.id).length).map(a => (
                <div key={a.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.cream}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: C.dark }}>{a.nombre}</strong> <span style={{ color: C.gray, fontSize: 14 }}>— {a.curso}</span>
                    {partesLeves(a.id) >= 3 && <span style={{ marginLeft: 8, background: "#FDF1D9", color: "#16333F", borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 600 }}>⚠️ Acumulación</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["leve", "grave", "muy_grave"].map(g => { const n = partesDeAlumno(a.id).filter(p => p.gravedad === g).length; if (!n) return null; const gv = gObj(g); return <span key={g} style={{ background: gv.color, color: gv.texto, borderRadius: 8, padding: "3px 8px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icono nombre={g === "muy_grave" ? "muy-grave" : g} tam={18} />×{n}</span>; })}
                    <span style={{ background: "#DDF0F4", color: C.blue, borderRadius: 8, padding: "3px 10px", fontSize: 14, fontWeight: 700 }}>Total: {partesDeAlumno(a.id).length}</span>
                  </div>
                </div>
              ))}
              {partes.length === 0 && <div style={{ padding: 20, color: C.gray, textAlign: "center" }}>Sin incidencias registradas</div>}
            </Card>
          </div>
        )}

        {/* ── Por Curso ── */}
        {tab === "por_curso" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Partes por Curso / Grupo" icono="por-curso" /></div>
            {cursos.map(curso => {
              const pC = partes.filter(p => p.curso === curso);
              const alC = alumnos.filter(a => a.curso === curso);
              return (
                <div key={curso} style={{ background: C.white, borderRadius: 14, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <div style={{ background: R.azul, color: "#fff", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{curso}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {["leve", "grave", "muy_grave"].map(g => { const n = pC.filter(p => p.gravedad === g).length; if (!n) return null; const gv = gObj(g); return <span key={g} style={{ background: gv.color, color: gv.texto, borderRadius: 8, padding: "2px 10px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icono nombre={g === "muy_grave" ? "muy-grave" : g} tam={18} />×{n}</span>; })}
                      <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 10px", fontSize: 14 }}>Total: {pC.length}</span>
                    </div>
                  </div>
                  {pC.length === 0
                    ? <div style={{ padding: "16px 20px", color: C.gray, fontSize: 14 }}>Sin partes en este curso</div>
                    : alC.map(a => {
                      const pA = partesDeAlumno(a.id);
                      if (!pA.length) return null;
                      return (
                        <div key={a.id} style={{ borderBottom: `1px solid ${C.cream}` }}>
                          <div style={{ padding: "10px 20px", background: C.cream, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{a.nombre}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {["leve", "grave", "muy_grave"].map(g => { const n = pA.filter(p => p.gravedad === g).length; if (!n) return null; const gv = gObj(g); return <span key={g} style={{ background: gv.color, color: gv.texto, borderRadius: 8, padding: "2px 8px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icono nombre={g === "muy_grave" ? "muy-grave" : g} tam={18} />×{n}</span>; })}
                            </div>
                          </div>
                          {pA.map(p => (
                            <div key={p.id} style={{ padding: "8px 20px 8px 36px", fontSize: 14, borderBottom: `1px solid ${C.cream}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "#16333F" }}><Ic n="fecha-hora" tam={20} />{fmt(p.ts)} · {p.hora} · {p.tipo}{p.esGrupal ? " · grupal" : ""}</span>
                              <div style={{ display: "flex", gap: 6 }}>
                                <Badge g={p.gravedad} />
                                <button onClick={() => setShowParte(completar(p))} style={{ background: "#DDF0F4", color: C.blue, border: "none", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Ver</button>
                                <button onClick={() => pdfParte(completar(p))} style={{ background: "#FDF1D9", color: C.salmon, border: "none", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}><Ic n="informe" tam={20} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Por Alumno ── */}
        {tab === "por_alumno" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Partes por Alumno" icono="por-alumno" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <select value={filtCurso} onChange={e => { setFiltCurso(e.target.value); setFiltAlumno(""); }} style={selStyle}><option value="">Todos los cursos</option>{cursos.map(c => <option key={c}>{c}</option>)}</select>
              <select value={filtAlumno} onChange={e => setFiltAlumno(e.target.value)} style={selStyle}><option value="">Seleccionar alumno</option>{alumnos.filter(a => !filtCurso || a.curso === filtCurso).map(a => <option key={a.id} value={a.id}>{a.nombre} — {a.curso}</option>)}</select>
            </div>
            {filtAlumno ? (() => {
              const al = alumnos.find(a => a.id === parseInt(filtAlumno));
              const pAl = partesDeAlumno(al.id);
              return (
                <div>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>{al.nombre}</div>
                        <div style={{ color: C.gray, fontSize: 14, marginTop: 4 }}>{al.curso} · Tutor: {al.tutor}</div>
                        <div style={{ fontSize: 14, marginTop: 4 }}><Ic n="mensaje-enviar" tam={20} />{al.email} · 📱 {al.telefono}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: C.dark }}>{pAl.length}</div>
                        <div style={{ fontSize: 14, color: C.gray }}>partes totales</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      {["leve", "grave", "muy_grave"].map(g => { const n = pAl.filter(p => p.gravedad === g).length; const gv = gObj(g); return <div key={g} style={{ flex: 1, background: gv.color, padding: 12, textAlign: "center" }}><div style={{ fontSize: 26, fontWeight: 700, color: gv.texto }}>{n}</div><div style={{ fontSize: 14, color: gv.texto, fontWeight: 700 }}>{gv.label}</div></div>; })}
                    </div>
                    {partesLeves(al.id) >= 3 && <div style={{ marginTop: 12, background: "#FDF1D9", border: "1px solid #F6C862", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "#16333F" }}>⚠️ Acumulación de {partesLeves(al.id)} partes leves — Considerar sanción</div>}
                  </Card>
                  {pAl.length === 0
                    ? <Card style={{ textAlign: "center", color: C.gray }}>Sin partes registrados</Card>
                    : pAl.map(p => <ParteCard key={p.id} parte={p} medidas={medidas.filter(m => m.parteId === p.id)} onVer={() => setShowParte(completar(p))} onPrint={() => pdfParte(completar(p))} />)}
                </div>
              );
            })() : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {alumnos.filter(a => (!filtCurso || a.curso === filtCurso) && partesDeAlumno(a.id).length > 0)
                  .sort((a, b) => partesDeAlumno(b.id).length - partesDeAlumno(a.id).length)
                  .map(a => (
                    <div key={a.id} onClick={() => setFiltAlumno(a.id)}
                      style={{ padding: "12px 20px", borderBottom: `1px solid ${C.cream}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseOver={e => e.currentTarget.style.background = C.cream}
                      onMouseOut={e => e.currentTarget.style.background = C.white}>
                      <div>
                        <strong style={{ color: C.dark }}>{a.nombre}</strong> <span style={{ color: C.gray, fontSize: 14 }}>— {a.curso}</span>
                        {partesLeves(a.id) >= 3 && <span style={{ marginLeft: 8, background: "#FDF1D9", color: "#16333F", borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 600 }}>⚠️</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {["leve", "grave", "muy_grave"].map(g => { const n = partesDeAlumno(a.id).filter(p => p.gravedad === g).length; if (!n) return null; const gv = gObj(g); return <span key={g} style={{ background: gv.color, color: gv.texto, borderRadius: 8, padding: "3px 8px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icono nombre={g === "muy_grave" ? "muy-grave" : g} tam={18} />×{n}</span>; })}
                        <span style={{ background: "#DDF0F4", color: C.blue, borderRadius: 8, padding: "3px 10px", fontSize: 14, fontWeight: 700 }}>{partesDeAlumno(a.id).length}</span>
                        <span style={{ color: C.gray, fontSize: 16 }}>›</span>
                      </div>
                    </div>
                  ))}
                {alumnos.filter(a => (!filtCurso || a.curso === filtCurso) && partesDeAlumno(a.id).length > 0).length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.gray }}>Sin alumnos con partes</div>}
              </Card>
            )}
          </div>
        )}

        {/* ── Todos los Partes ── */}
        {tab === "partes_todos" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Todos los Partes" icono="partes" /></div>
            <Card>
              <div style={{ fontWeight: 600, color: C.dark, marginBottom: 10 }}><Ic n="buscar" tam={20} />Filtros</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <select value={filtCurso} onChange={e => { setFiltCurso(e.target.value); setFiltAlumno(""); }} style={{ ...selStyle, padding: "8px 12px", fontSize: 14 }}><option value="">Todos los cursos</option>{cursos.map(c => <option key={c}>{c}</option>)}</select>
                <select value={filtAlumno} onChange={e => setFiltAlumno(e.target.value)} style={{ ...selStyle, padding: "8px 12px", fontSize: 14 }}><option value="">Todos los alumnos</option>{alumnos.filter(a => !filtCurso || a.curso === filtCurso).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
                <select value={filtGravedad} onChange={e => setFiltGravedad(e.target.value)} style={{ ...selStyle, padding: "8px 12px", fontSize: 14 }}><option value="">Toda gravedad</option>{GRAVEDAD.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
                <input type="date" value={filtFechaDesde} onChange={e => setFiltFechaDesde(e.target.value)} style={{ ...inpStyle, padding: "8px 12px", fontSize: 14 }} />
                <input type="date" value={filtFechaHasta} onChange={e => setFiltFechaHasta(e.target.value)} style={{ ...inpStyle, padding: "8px 12px", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: 14, color: C.gray }}>{partesFiltrados.length} parte(s)</span>
                <button onClick={() => { setFiltCurso(""); setFiltAlumno(""); setFiltGravedad(""); setFiltFechaDesde(""); setFiltFechaHasta(""); }} style={{ background: "none", border: `1px solid #CDE9ED`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14, color: C.gray }}>Limpiar</button>
              </div>
            </Card>
            {partesFiltrados.length === 0
              ? <Card style={{ textAlign: "center", color: C.gray }}>Sin partes con los filtros actuales</Card>
              : partesFiltrados.map(p => <ParteCard key={p.id} parte={p} medidas={medidas.filter(m => m.parteId === p.id)} onVer={() => setShowParte(completar(p))} onPrint={() => pdfParte(completar(p))} />)}
          </div>
        )}

        {/* ── Guardias (Jefatura) ── */}
        {tab === "guardias_jef" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Registro de Guardias" icono="guardias" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14, marginBottom: 20 }}>
              {[{ label: "Guardias Hoy", value: guardias.filter(g => g.fecha === todayStr()).length, color: C.blue }, { label: "Esta Semana", value: guardias.filter(g => weekKey(g.fecha) === weekKey(new Date())).length, color: C.teal }, { label: "Total", value: guardias.length, color: C.dark }].map(s => (
                <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderTop: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {guardias.length === 0
              ? <Card style={{ textAlign: "center", color: C.gray, padding: 40 }}>Sin guardias registradas</Card>
              : guardias.map(g => (
                <Card key={g.id} style={{ borderLeft: `4px solid ${C.blue}` }}>
                  <div style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}><Ic n="guardias" tam={20} />{g.hora} · {g.modulo} · {g.curso}{g.materia && ` · ${g.materia}`}</div>
                  <div style={{ fontSize: 14, color: C.gray, marginTop: 4 }}><Ic n="fecha-hora" tam={20} />{fmt(g.ts)}</div>
                  <div style={{ fontSize: 14, marginTop: 6 }}><span style={{ color: C.salmon, fontWeight: 600 }}>Ausente:</span> {g.profesorAusente} <span style={{ color: C.gray, marginLeft: 8 }}>({g.motivo})</span></div>
                  <div style={{ fontSize: 14, marginTop: 2 }}><span style={{ color: C.teal, fontWeight: 600 }}>Guardia:</span> {g.profesorGuardia}</div>
                  {g.material && <div style={{ fontSize: 14, marginTop: 4, background: C.cream, borderRadius: 6, padding: "6px 10px" }}><Ic n="ejercicios" tam={20} />Material: {g.material}</div>}
                </Card>
              ))}
          </div>
        )}

        {/* ── Baños live (Jefatura) ── */}
        {/* ── Mi Guardia Hoy (Profesor) ── */}
        {tab === "mi_guardia" && (
          <MiGuardiaHoy medidas={medidas} onMarcarMedida={marcarMedida} coberturas={coberturas} firmas={firmas} setFirmas={setFirmas} listas={listas} setListas={setListas} alumnos={alumnos} profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia} ausencias={ausencias} fProfesor={fProfesor} setFProfesor={setFProfesor} C={C} selStyle={selStyle} labelStyle={labelStyle} usuario={usuario} setShowCuadrante={setShowCuadrante} diaSeleccionadoGuardias={diaSeleccionadoGuardias} setDiaSeleccionadoGuardias={setDiaSeleccionadoGuardias} />
        )}

        {/* ── Notificar Ausencia (Profesor) ── */}
        {tab === "notif_ausencia" && (
          <NotificarAusencia
            usuario={usuario}
            profesores={profesores} ausencias={ausencias} setAusencias={setAusencias}
            ausProfesor={ausProfesor} setAusProfesor={setAusProfesor}
            ausMotivo={ausMotivo} setAusMotivo={setAusMotivo}
            ausFecha={ausFecha} setAusFecha={setAusFecha}
            ausHoras={ausHoras} setAusHoras={setAusHoras}
            ausTarea={ausTarea} setAusTarea={setAusTarea}
            ausEnlace={ausEnlace} setAusEnlace={setAusEnlace}
            ausUbicacion={ausUbicacion} setAusUbicacion={setAusUbicacion}
            ausAula={ausAula} setAusAula={setAusAula}
            ausAsignatura={ausAsignatura} setAusAsignatura={setAusAsignatura}
            fProfesor={fProfesor} C={C} inpStyle={inpStyle} selStyle={selStyle} labelStyle={labelStyle} fmt={fmt}
          />
        )}

        {/* ── Cuadrante de Guardias (Jefatura) ── */}
        {tab === "cuadrante" && (
          <CuadranteGuardias
            profesores={profesores} cuadrante={cuadrante} setCuadrante={setCuadrante}
            apoyosGuardia={apoyosGuardia} setApoyosGuardia={setApoyosGuardia}
            sustitutosGuardia={sustitutosGuardia} setSustitutosGuardia={setSustitutosGuardia}
            profesoresGuardia={profesoresGuardia} setProfesoresGuardia={setProfesoresGuardia}
            ausencias={ausencias}
            quinceInicio={quinceInicio} setQInicio={setQInicio}
            quinceProfesor={quinceProfesor} setQProf={setQProf}
            C={C} inpStyle={inpStyle} selStyle={selStyle} labelStyle={labelStyle}
          />
        )}

        {/* ── Parte del Día (Jefatura) ── */}
        {tab === "parte_dia" && (
          <ParteDia profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia} ausencias={ausencias} coberturas={coberturas} C={C} />
        )}

        {/* ── Coordinación Diaria de Ausencias (Jefatura) ── */}
        {tab === "coordinacion" && (
          <CoordinacionAusencias
            profesores={profesores}
            ausencias={ausencias}
            cuadrante={cuadrante}
            apoyosGuardia={apoyosGuardia}
            sustitutosGuardia={sustitutosGuardia}
            coberturas={coberturas}
            setCoberturas={setCoberturas}
            HORAS_GUARDIA={HORAS_GUARDIA}
            ZONAS_CENTRO={ZONAS_CENTRO}
            C={C}
            inpStyle={inpStyle}
            labelStyle={labelStyle}
            fechaCoordinacion={fechaCoordinacion}
            setFechaCoordinacion={setFechaCoordinacion}
          />
        )}

        {/* ── Gestión Ausencias (Jefatura) ── */}
        {tab === "firmas_jef" && (
          <FirmasYListas profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia}
            ausencias={ausencias} firmas={firmas} listas={listas} C={C} inpStyle={inpStyle} />
        )}

        {tab === "ausencias_jef" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => { setRegistroTelefono(v => !v); setAusProfesor(""); }}
                style={{ background: registroTelefono ? "#EBF0F6" : C.salmon, color: registroTelefono ? C.dark : "#fff", border: "none", borderRadius: 10, padding: "11px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                <Ti tam={22}>{registroTelefono ? "✕ Cerrar el registro" : "📞 Registrar una ausencia comunicada por teléfono"}</Ti>
              </button>
            </div>
            {registroTelefono && (
              <NotificarAusencia modoJefatura usuario={usuario}
                profesores={profesores} ausencias={ausencias} setAusencias={setAusencias}
                ausProfesor={ausProfesor} setAusProfesor={setAusProfesor}
                ausMotivo={ausMotivo} setAusMotivo={setAusMotivo}
                ausFecha={ausFecha} setAusFecha={setAusFecha}
                ausHoras={ausHoras} setAusHoras={setAusHoras}
                ausTarea={ausTarea} setAusTarea={setAusTarea}
                ausEnlace={ausEnlace} setAusEnlace={setAusEnlace}
                ausUbicacion={ausUbicacion} setAusUbicacion={setAusUbicacion}
                ausAula={ausAula} setAusAula={setAusAula}
                ausAsignatura={ausAsignatura} setAusAsignatura={setAusAsignatura}
                fProfesor={fProfesor} C={C} inpStyle={inpStyle} selStyle={selStyle} labelStyle={labelStyle} fmt={fmt} />
            )}
            <GestionAusencias ausencias={ausencias} setAusencias={setAusencias} profesores={profesores} C={C} fmt={fmt} />
          </div>
        )}

        {/* ── Galvángram (Jefatura & Profesor) ── */}
        {tab === "mensajeria" && (
          <Galvangramm 
            key={vistaGalv.k} vistaInicial={vistaGalv.v}
            mensajes={mensajes} 
            setMensajes={setMensajes}
            usuario={usuario}
            esJefatura={perfil.id === "jefatura"}
            profesores={profesores}
            horarios={horarios} cursos={cursos}
            cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia}
            ausencias={ausencias} coberturas={coberturas}
            C={C}
            inpStyle={inpStyle}
            selStyle={selStyle}
            labelStyle={labelStyle}
          />
        )}

        {tab === "bano_live" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Baños — Tiempo Real" icono="banos" /></div>
            <Card style={{ background: banoActivos.length > 0 ? "#FDF1D9" : "#DDF0F4", border: `2px solid ${banoActivos.length > 0 ? C.salmon : C.teal}` }}>
              <h3 style={{ margin: "0 0 12px", color: C.dark }}>{banoActivos.length > 0 ? <><Ic n="fuera-ahora" tam={26} />{banoActivos.length} alumno(s) fuera</> : "✅ Ningún alumno fuera"}</h3>
              {banoActivos.map(b => <div key={b.id} style={{ padding: "8px 0", borderBottom: `1px solid rgba(0,0,0,0.08)`, fontSize: 14 }}><strong>{b.alumno}</strong> — {b.curso} — {fmt(b.salida)}</div>)}
            </Card>
            <Card>
              <h3 style={{ marginTop: 0, color: C.dark }}><Ic n="partes" tam={20} />Historial completo</h3>
              {banos.length === 0
                ? <p style={{ color: C.gray }}>Sin registros</p>
                : banos.map(b => {
                  const mins = b.regreso ? Math.round((new Date(b.regreso) - new Date(b.salida)) / 60000) : null;
                  return (
                    <div key={b.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.cream}`, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
                      <span><strong>{b.alumno}</strong> — {b.curso} — {b.fecha}</span>
                      <span style={{ color: C.gray }}>{b.regreso ? `${mins} min` : "🔴 Fuera"}</span>
                    </div>
                  );
                })}
            </Card>
          </div>
        )}

        {/* ── Alertas ── */}
        {tab === "medidas" && (
          <PanelMedidas medidas={medidas} setMedidas={setMedidas} partes={partes} onMarcar={marcarMedida} guardiaDe={guardiaDe}
            onParteIncumplimiento={ponerParteIncumplimiento} onVerParte={p => setShowParte(completar(p))} />
        )}

        {tab === "alertas" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Alertas" icono="alertas" /></div>
            {alertas.length === 0
              ? <Card style={{ textAlign: "center", color: C.gray, padding: 40 }}>Sin alertas</Card>
              : alertas.map(a => {
                const config = {
                  acumulacion_leves: { icon: "⚠️", color: "#16333F", bg: "#FDF1D9", border: "#F6C862", label: "Acumulación de leves" },
                  medida_incumplida: { icon: "⚠️", color: "#16333F", bg: "#FDF1D9", border: "#F6C862", label: "Medida sin cumplir" },
                  total_partes:      { icon: "📋", color: C.blue,     bg: "#DDF0F4", border: C.blue,    label: "Límite de partes" },
                  fuera_horario:     { icon: "🕐", color: C.teal,     bg: "#DDF0F4", border: C.teal,    label: "Fuera de horario" },
                  bano:              { icon: "🚻", color: C.salmon,   bg: "#FDF1D9", border: C.salmon,  label: "Abuso de baño" },
                }[a.tipo] || { icon: "🔔", color: C.gray, bg: C.cream, border: "#ccc", label: "Alerta" };
                return (
                  <div key={a.id}
                    onClick={() => setAlertas(prev => prev.map(x => x.id === a.id ? { ...x, leida: true } : x))}
                    style={{ background: a.leida ? C.white : config.bg, border: `1px solid ${a.leida ? "#CDE9ED" : config.border}`, borderLeft: `4px solid ${a.leida ? "#CDE9ED" : config.border}`, borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer", opacity: a.leida ? .7 : 1, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Ti tam={30}>{config.icon}</Ti>
                        <div>
                          <div style={{ fontWeight: 700, color: a.leida ? C.gray : config.color }}>{config.label} — {a.alumno}</div>
                          <div style={{ fontSize: 14, color: "#16333F", marginTop: 2 }}>{a.curso} · {a.msg || a.msgs?.join(" · ")}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 14, color: C.gray }}>{fmt(a.ts)}</div>
                        {!a.leida && <div style={{ fontSize: 13, color: config.color, marginTop: 4, fontWeight: 600 }}>● Sin leer</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── Estadísticas e informes del profesorado y tutores ── */}
        {tab === "mis_estadisticas" && (
          <EstadisticasDocumentos key={usuario} modo="profesor" usuario={usuario} avisos={avisosFamilia} setAvisos={setAvisosFamilia} partes={partes.map(completar)} banos={banos} ausencias={[]} firmas={[]} listas={[]}
            alumnos={alumnos} profesores={profesores} cuadrante={{}} apoyosGuardia={{}} sustitutosGuardia={{}}
            tutores={tutores} onVerParte={p => setShowParte(completar(p))} C={C} inpStyle={inpStyle} selStyle={selStyle} labelStyle={labelStyle} />
        )}

        {/* ── Estadísticas y documentos por fecha (Jefatura) ── */}
        {tab === "estadisticas" && (
          <EstadisticasDocumentos partes={partes.map(completar)} banos={banos} ausencias={ausencias} firmas={firmas} listas={listas}
            alumnos={alumnos} profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia}
            tutores={tutores} onVerParte={p => setShowParte(completar(p))} C={C} inpStyle={inpStyle} selStyle={selStyle} labelStyle={labelStyle} />
        )}

        {/* ── Informe ── */}
        {tab === "informe" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Exportar Informe" icono="informe" /></div>
            
            {/* SELECTOR DE TIPO DE INFORME */}
            <Card style={{ marginBottom: 20 }}>
              <label style={labelStyle}><Ic n="dashboard" tam={20} />Selecciona el tipo de informe</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <button 
                  onClick={() => setInformeType("partes")}
                  style={{ padding: 16, border: `2px solid ${informeType === "partes" ? C.teal : C.cream}`, borderRadius: 10, background: informeType === "partes" ? "#DDF0F4" : C.white, cursor: "pointer", fontWeight: 600, color: informeType === "partes" ? C.teal : C.gray, transition: "all .2s" }}>
                  <Ic n="partes" tam={20} />Informe de Partes
                </button>
                <button 
                  onClick={() => setInformeType("banos")}
                  style={{ padding: 16, border: `2px solid ${informeType === "banos" ? C.teal : C.cream}`, borderRadius: 10, background: informeType === "banos" ? "#DDF0F4" : C.white, cursor: "pointer", fontWeight: 600, color: informeType === "banos" ? C.teal : C.gray, transition: "all .2s" }}>
                  <Ic n="banos" tam={20} />Informe de Salidas al Baño
                </button>
              </div>
            </Card>

            <Card>
              <div style={{ background: "#DDF0F4", borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 14, color: C.blue }}>
                <Ic n="como-exportar" tam={20} />El informe se abrirá en pantalla completa. Pulsa <strong>⬇️ Descargar PDF</strong> para guardarlo o imprimirlo.
              </div>
              
              {informeType === "partes" ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
                    <select value={filtCurso} onChange={e => { setFiltCurso(e.target.value); setFiltAlumno(""); }} style={{ ...selStyle, fontSize: 14 }}><option value="">Todos los cursos</option>{cursos.map(c => <option key={c}>{c}</option>)}</select>
                    <select value={filtAlumno} onChange={e => setFiltAlumno(e.target.value)} style={{ ...selStyle, fontSize: 14 }}><option value="">Todos los alumnos</option>{alumnos.filter(a => !filtCurso || a.curso === filtCurso).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
                    <select value={filtGravedad} onChange={e => setFiltGravedad(e.target.value)} style={{ ...selStyle, fontSize: 14 }}><option value="">Toda gravedad</option>{GRAVEDAD.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
                    <input type="date" value={filtFechaDesde} onChange={e => setFiltFechaDesde(e.target.value)} style={{ ...inpStyle, fontSize: 14 }} />
                    <input type="date" value={filtFechaHasta} onChange={e => setFiltFechaHasta(e.target.value)} style={{ ...inpStyle, fontSize: 14 }} />
                  </div>
                  {filtCurso
                    ? <TutoriasGrupos soloCurso={filtCurso} cursos={cursos} tutores={tutores} setTutores={setTutores} setAlumnos={setAlumnos} profesores={profesores} C={C} inpStyle={inpStyle} />
                    : <div style={{ fontSize: 14, color: C.gray, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Icono nombre="tutor" tam={24} />El informe incluye el tutor/a de cada grupo. Elige un curso para ver o cambiar su tutor/a.</div>}
                  <div style={{ background: C.cream, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14, color: C.dark }}>
                    El informe incluirá <strong>{partesFiltrados.length} parte(s)</strong>
                    {filtCurso && ` · ${filtCurso}`}{filtAlumno && ` · ${alumnos.find(a => a.id === parseInt(filtAlumno))?.nombre || "un alumno"}`}{filtGravedad && ` · ${GRAVEDAD.find(g => g.id === filtGravedad)?.label}`}
                    {filtFechaDesde && ` · Desde: ${fmtD(filtFechaDesde)}`}{filtFechaHasta && ` · Hasta: ${fmtD(filtFechaHasta)}`}
                  </div>
                  {(filtCurso || filtAlumno || filtGravedad || filtFechaDesde || filtFechaHasta) && (
                    <button onClick={() => { setFiltCurso(""); setFiltAlumno(""); setFiltGravedad(""); setFiltFechaDesde(""); setFiltFechaHasta(""); }}
                      style={{ border: "none", background: "transparent", color: C.blue, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 12, fontSize: 14 }}>Limpiar filtros</button>
                  )}
                  <Btn onClick={() => setPrintInforme(true)} disabled={partesFiltrados.length === 0} color={C.teal} style={{ width: "100%", fontSize: 15, padding: "14px" }}>
                    <Ic n="informe" tam={20} />Ver informe de partes y descargar PDF
                  </Btn>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
                    <select value={filtCurso} onChange={e => setFiltCurso(e.target.value)} style={{ ...selStyle, fontSize: 14 }}><option value="">Todos los cursos</option>{cursos.map(c => <option key={c}>{c}</option>)}</select>
                    <input type="date" value={filtFechaDesde} onChange={e => setFiltFechaDesde(e.target.value)} style={{ ...inpStyle, fontSize: 14 }} />
                    <input type="date" value={filtFechaHasta} onChange={e => setFiltFechaHasta(e.target.value)} style={{ ...inpStyle, fontSize: 14 }} />
                  </div>
                  <div style={{ background: C.cream, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14, color: C.dark }}>
                    El informe incluirá <strong>{banosFiltrados.length} salida(s)</strong> al baño
                    {filtCurso && ` · ${filtCurso}`}
                    {filtFechaDesde && ` · Desde: ${fmtD(filtFechaDesde)}`}{filtFechaHasta && ` · Hasta: ${fmtD(filtFechaHasta)}`}
                  </div>
                  <Btn onClick={() => setPrintInforme(true)} disabled={banosFiltrados.length === 0} color={C.teal} style={{ width: "100%", fontSize: 15, padding: "14px" }}>
                    <Ic n="informe" tam={20} />Ver informe de baños y descargar PDF
                  </Btn>
                </>
              )}
            </Card>
            <InformesGuardados informes={informes} setInformes={setInformes} partes={partes} banos={banos} tutores={tutores} C={C} />
          </div>
        )}

        {/* ── Admin Alumnos ── */}
        {tab === "admin_panel" && <DatosCentro datos={datosCentro} setDatos={setDatosCentro} />}
        {tab === "admin_panel" && <HorarioCentro horario={horarioCentro} setHorario={setHorarioCentro} />}
        {tab === "admin_panel" && <ZonasCentro zonas={zonasCentro} setZonas={setZonasCentro} />}
        {tab === "admin_panel" && (
          <TutoriasGrupos cursos={cursos} tutores={tutores} setTutores={setTutores} setAlumnos={setAlumnos} profesores={profesores} C={C} inpStyle={inpStyle} />
        )}
        {tab === "admin_panel" && (
          <AdminAlumnos alumnos={alumnos} setAlumnos={setAlumnos} inpStyle={inpStyle} C={C} />
        )}

        {/* ── Admin Profesores ── */}
        {tab === "admin_profesores" && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Gestión de Profesores" icono="perfil" /></div>
            <CorreosCentro C={C} />
            <Card>
              <h3 style={{ marginTop: 0, color: C.dark, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="anadir-profesor" tam={44} />Añadir profesor</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={nuevoProfesor} onChange={e => setNuevoProfesor(e.target.value)} placeholder="Nombre completo del profesor" style={{ ...inpStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === "Enter" && nuevoProfesor.trim()) { setProfesores(prev => [...prev, nuevoProfesor.trim()]); setNuevoProfesor(""); } }} />
                <Btn onClick={() => { 
                  if (!nuevoProfesor.trim()) return; 
                  setProfesores(prev => [...prev, nuevoProfesor.trim()]); 
                  setNuevoProfesor(""); 
                  // Feedback visual
                  setFeedbackAñadirProfesor(true);
                  setTimeout(() => setFeedbackAñadirProfesor(false), 1500);
                }} color={feedbackAñadirProfesor ? "#63CBA1" : C.teal} style={{ transition: "all .3s ease" }}>
                  {feedbackAñadirProfesor ? "✅ ¡Agregado!" : <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="grupos" tam={24} />Añadir</span>}
                </Btn>
              </div>
            </Card>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", background: C.cream, borderBottom: `1px solid #CDE9ED`, fontWeight: 600, fontSize: 14, color: C.dark, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre="profesorado" tam={30} />{profesores.length} profesor(es)</div>
              <div style={{ padding: "10px 20px", fontSize: 14, color: C.gray, borderBottom: `1px solid ${C.cream}` }}>
                Marca todos los cargos de cada persona (puede tener varios: por ejemplo Profesor/a + Coordinación TIC + Jefatura). Los cargos deciden a qué perfiles entra: Jefatura y Orientación abren «Jefatura y Dirección»; Dirección abre también Administración; Secretaría y Coordinación TIC abren Administración. Cambia de perfil en cualquier momento desde el botón de arriba a la derecha.
              </div>
              {profesores.map((p, i) => {
                const cuenta = cuentas[p] || {};
                return (
                  <div key={p} style={{ padding: "10px 20px", borderBottom: `1px solid ${C.cream}`, fontSize: 14, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ minWidth: 160, display: "flex", alignItems: "center", gap: 10 }}>
                      <Icono nombre={ICONO_CARGO[cargoDe(cuentas, p).id] || "cargo-profesor"} tam={40} />
                      <div>
                        <div style={{ fontWeight: 600, color: C.dark }}>{p}{p === usuario ? " (tú)" : ""}</div>
                        <input type="email" aria-label={`Correo de ${p}`} placeholder={MODO_DEMO ? correoDemo(p) : "correo@educa.madrid.org"} value={cuenta.email || ""}
                          onChange={e => setCuentas(prev => ({ ...prev, [p]: { ...(prev[p] || {}), email: e.target.value } }))}
                          style={{ margin: "4px 0", padding: "5px 8px", borderRadius: 6, border: `1px solid ${cuenta.email && !correoValido(cuenta.email) ? C.salmon : "#CDE9ED"}`, fontSize: 14, width: 260, maxWidth: "100%" }} />
                        <div style={{ fontSize: 13, color: cuenta.clave ? C.teal : C.gray, display: "flex", alignItems: "center", gap: 4 }}>{cuenta.clave ? "Clave creada" : <><Icono nombre="sin-clave" tam={18} />Sin clave: la creará al entrar por primera vez</>}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div role="group" aria-label={`Cargos de ${p}`} style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 520 }}>
                        {CARGOS.map(c => {
                          const ids = cargosIds(cuenta); const on = ids.includes(c.id); const fijo = c.id === "profesor";
                          return (
                            <button key={c.id} disabled={fijo} aria-pressed={on} title={fijo ? "Todo el personal docente es profesor/a" : on ? "Quitar este cargo" : "Añadir este cargo"}
                              onClick={() => {
                                const nuevos = on ? ids.filter(x => x !== c.id) : [...ids, c.id];
                                if (p === usuario && !nuevos.some(id => CARGOS.find(x => x.id === id).perfiles.includes("admin")) &&
                                    !window.confirm("Vas a quitarte el acceso a Administración. ¿Continuar?")) return;
                                setCuentas(prev => ({ ...prev, [p]: { ...(prev[p] || {}), cargos: nuevos, cargo: undefined } }));
                              }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 4px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: fijo ? "default" : "pointer",
                                border: `2px solid ${on ? C.teal : "#CDE9ED"}`, background: on ? "#DDF0F4" : "#fff", color: on ? C.dark : C.gray, opacity: fijo ? 0.85 : 1 }}>
                              <Icono nombre={ICONO_CARGO[c.id]} tam={22} />{on ? "✓ " : "+ "}{c.label}
                            </button>
                          );
                        })}
                      </div>
                      {cuenta.clave && (
                        <button onClick={() => { if (window.confirm(`¿Restablecer la clave de ${p}? La próxima vez que entre tendrá que crear una nueva.`)) setCuentas(prev => ({ ...prev, [p]: { ...(prev[p] || {}), clave: null } })); }}
                          style={{ background: "#DDF0F4", color: C.blue, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icono nombre="sin-clave" tam={20} />Restablecer clave</button>
                      )}
                      <button aria-label={`Eliminar a ${p}`} onClick={() => { if (window.confirm(`¿Eliminar a ${p} de la lista del profesorado?`)) setProfesores(prev => prev.filter((_, j) => j !== i)); }} style={{ background: "#FDF1D9", color: C.salmon, border: "none", borderRadius: 8, padding: "4px 6px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex" }} title="Eliminar"><Icono nombre="eliminar" tam={26} /></button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

      </div>
      </div>

      {/* ── Modal Ver Cuadrante Completo ── */}
      {showCuadrante && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 16, maxWidth: "95vw", width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ background: R.azul, color: "#fff", padding: "16px 24px", borderRadius: "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}><Ic n="fecha-hora" tam={20} />Cuadrante de Guardias</div>
                <button onClick={() => setSemanaCuadrante(w => w - 1)} aria-label="Semana anterior" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>←</button>
                <span style={{ fontSize: 14 }}>Semana del {sumarDias(lunesDe(), 7 * semanaCuadrante).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                <button onClick={() => setSemanaCuadrante(w => w + 1)} aria-label="Semana siguiente" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>→</button>
              </div>
              <button onClick={() => { setShowCuadrante(false); setSemanaCuadrante(0); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 20, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: C.dark }}>
                    <th style={{ padding: "10px 8px", color: "#fff", textAlign: "left", fontWeight: 600 }}>Hora</th>
                    {[0,1,2,3,4].map(i => { const f = sumarDias(lunesDe(), 7 * semanaCuadrante + i); return <th key={i} style={{ padding: "10px 8px", color: "#fff", textAlign: "center", fontWeight: 600 }}>{DIAS_ES[f.getDay()].substring(0,3)} {f.getDate()}/{f.getMonth()+1}</th>; })}
                  </tr>
                </thead>
                <tbody>
                  {HORAS_GUARDIA.map((hora, idx) => (
                    <tr key={hora} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #CDE9ED" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 700, color: C.dark, width: 90 }}>{hora}<div style={{ fontSize: 13, fontWeight: 500, color: C.gray }}>{HORARIO[hora]}</div></td>
                      {[0,1,2,3,4].map(i => {
                        const dia = isoLocal(sumarDias(lunesDe(), 7 * semanaCuadrante + i));
                        const asignaciones = [];
                        profesores.forEach(prof => {
                          const key = `${dia}|${hora}|${prof}`;
                          if (cuadrante[key]) {
                            const zona = ZONAS_CENTRO.find(z => z.id === cuadrante[key]);
                            const apoyo = apoyosGuardia[`${dia}|${hora}|${cuadrante[key]}`];
                            const sustituto = sustitutosGuardia[`${dia}|${hora}|${cuadrante[key]}`];
                            asignaciones.push({
                              profesor: prof,
                              zona: zona ? zona.label : "Zona desconocida",
                              apoyo: apoyo || null,
                              sustituto: sustituto || null
                            });
                          }
                        });
                        
                        return (
                          <td key={dia} style={{ padding: "8px", textAlign: "left", fontSize: 13, background: asignaciones.length > 0 ? "#DDF0F4" : "transparent", borderRight: "1px solid #CDE9ED" }}>
                            {asignaciones.length > 0 ? (
                              <div style={{ color: C.teal }}>
                                {asignaciones.map((a, idx) => (
                                  <div key={idx} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: idx < asignaciones.length - 1 ? "1px solid #d0e8e6" : "none" }}>
                                    <strong style={{ color: C.dark }}><Ic n="por-alumno" tam={20} />{a.profesor}</strong><br/>
                                    <span style={{ color: C.teal, fontSize: 13 }}><Ic n="edificio" tam={20} />{a.zona}</span><br/>
                                    {a.apoyo && <><span style={{ color: C.blue, fontSize: 13 }}><Ic n="grupos" tam={20} />Apoyo: {a.apoyo}</span><br/></>}
                                    {a.sustituto && <span style={{ color: "#2B647E", fontSize: 13 }}><Ic n="sustituto" tam={20} />Sustituto: {a.sustituto}</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: C.gray }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, fontSize: 13, color: C.gray, padding: "12px", background: "#f9fafb", borderRadius: 8 }}>
                <strong><Ic n="por-alumno" tam={20} /></strong> = Profesor | <strong><Ic n="edificio" tam={20} /></strong> = Lugar/Zona | <strong><Ic n="grupos" tam={20} /></strong> = Profesor de Apoyo
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ver Parte ── */}
      {showParte && (
        <div onClick={() => setShowParte(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: parteGrande ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: parteGrande ? 0 : 16, maxWidth: parteGrande ? "none" : 760, width: "100%", height: parteGrande ? "100%" : "auto", maxHeight: parteGrande ? "100%" : "92vh", overflowY: "auto", fontSize: parteGrande ? 18 : 15, zoom: parteGrande ? 1.25 : 1 }}>
            <div style={{ position: "sticky", top: 0, zIndex: 2, background: R.azul, color: "#fff", padding: "16px 24px", borderRadius: parteGrande ? 0 : "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{APP} · Parte de Incidencia</div>
                <div style={{ fontSize: 14, opacity: .9 }}>Ref: PARTE-{showParte.id}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => pdfParte(showParte)} title="Descargar PDF" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}><Ic n="informe" tam={20} />PDF</button>
                <button onClick={() => setParteGrande(v => !v)} title={parteGrande ? "Volver al tamaño normal" : "Ver a pantalla completa"} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{parteGrande ? "🗗 Reducir" : "⛶ Pantalla completa"}</button>
                <button onClick={() => setShowParte(null)} aria-label="Cerrar" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 24, maxWidth: parteGrande ? 900 : "none", margin: "0 auto" }}>
              {(() => { const g = gObj(showParte.gravedad); return <div style={{ background: g.color, padding: 12, marginBottom: 20, textAlign: "center" }}><strong style={{ color: g.texto, fontSize: 17 }}>{g.label} — {g.desc}</strong></div>; })()}
              {showParte.esGrupal && <div style={{ background: R.azulClaro, borderLeft: `8px solid ${R.turquesa}`, padding: "8px 14px", fontSize: 15, color: R.petroleo, fontWeight: 700, marginBottom: 12 }}><Ic n="grupos" tam={20} />Parte generado como parte de grupo</div>}
              {[["Alumno", showParte.alumno], ["Curso", showParte.curso], ["Tutor/a del grupo", showParte.tutor || "—"], ["Correo del tutor/a", showParte.tutorEmail || "—"], ["Tipo", showParte.tipo], ["Hora", showParte.hora || "No especificada"], ["Fecha y hora", fmt(showParte.ts)], ["Profesor", showParte.profesor]].map(([k, v]) => (
                <InfoRow key={k} label={k} value={v} />
              ))}
              {showParte.tipificacion && (() => {
                const tipObj = TIPIFICACION[showParte.gravedad]?.find(t => t.id === showParte.tipificacion);
                const fuente = showParte.gravedad === "leve" ? "Plan de Convivencia" : "Decreto 32/2019";
                return (
                  <div style={{ margin: "10px 0", padding: "10px 12px", background: R.azulClaro, borderLeft: `8px solid ${R.turquesa}`, fontSize: 15 }}>
                    <span style={{ fontWeight: 700, color: R.petroleo }}><Ic n="tipificacion" tam={22} />Tipificación </span>
                    <span style={{ color: R.petroleo }}>({fuente})</span>
                    <div style={{ marginTop: 4, color: R.noche }}>{tipObj?.label}</div>
                  </div>
                );
              })()}
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: R.petroleo, fontSize: 17, flexWrap: "wrap" }}>
                <Icono nombre="descripcion" tam={36} />Descripción del incidente
                {!rectificando && puedeRectificar(showParte) && (
                  <button onClick={empezarRectificar} style={{ marginLeft: "auto", background: C.white, color: R.petroleo, border: `2px solid ${R.azul}`, borderRadius: 6, minHeight: 44, padding: "0 14px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
                    ✏️ Rectificar <span style={{ fontWeight: 400, color: C.gray }}>(quedan {Math.max(1, Math.ceil(HORAS_RECTIFICAR - horasDesde(showParte)))} h)</span>
                  </button>
                )}
              </div>
              {rectificando ? (
                <div style={{ marginTop: 8, border: `2px solid ${C.teal}`, borderRadius: 10, padding: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Tipificación</label>
                  <select value={rTip} onChange={e => setRTip(e.target.value)} style={{ ...selStyle, margin: "4px 0 10px" }}>
                    <option value="">— Sin tipificación —</option>
                    {(TIPIFICACION[showParte.gravedad] || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <FrasesRapidas tipo={showParte.tipo} tipificacion={rTip} texto={rDesc} setTexto={setRDesc} />
                  <textarea value={rDesc} onChange={e => setRDesc(e.target.value)} rows={5} style={{ ...inpStyle, resize: "vertical" }} />
                  <div style={{ fontSize: 14, color: C.gray, margin: "6px 0 10px" }}>Se guardará el texto original y quedará anotado quién rectifica y cuándo.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Btn onClick={guardarRectificacion} disabled={!rDesc.trim()} color={C.teal}>💾 Guardar rectificación</Btn>
                    <Btn onClick={() => setRectificando(false)} color={C.gray}>Cancelar</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8, background: C.cream, borderRadius: 8, padding: 14, fontSize: 14, lineHeight: 1.6, color: C.dark }}>{showParte.descripcion}</div>
              )}
              {!rectificando && showParte.rectificaciones?.length > 0 && (
                <details style={{ marginTop: 8, background: "#FDF1D9", border: "1px solid #F6C862", borderRadius: 8, padding: "8px 12px", fontSize: 14, color: C.dark }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, color: "#16333F" }}>
                    ✏️ Parte rectificado {showParte.rectificaciones.length > 1 ? `${showParte.rectificaciones.length} veces` : ""} · última vez el {fmt(showParte.rectificaciones.at(-1).ts)} por {showParte.rectificaciones.at(-1).por}{showParte.rectificaciones.at(-1).perfil === "jefatura" ? " (Jefatura)" : ""}
                  </summary>
                  {showParte.rectificaciones.map((r, i) => (
                    <div key={i} style={{ marginTop: 8, paddingTop: 8, borderTop: i ? "1px dashed #F6C862" : "none" }}>
                      <div style={{ fontSize: 14, color: C.gray }}>Texto antes de la rectificación del {fmt(r.ts)} ({r.por}):</div>
                      <div style={{ marginTop: 4, fontStyle: "italic" }}>{r.descripcionAnterior}</div>
                      {r.tipificacionAnterior !== undefined && r.tipificacionAnterior !== (showParte.rectificaciones[i + 1]?.tipificacionAnterior ?? showParte.tipificacion) && (
                        <div style={{ marginTop: 4, fontSize: 14, color: C.gray }}>Tipificación anterior: {TIPIFICACION[showParte.gravedad]?.find(t => t.id === r.tipificacionAnterior)?.label || "sin tipificación"}</div>
                      )}
                    </div>
                  ))}
                </details>
              )}
              <div style={{ marginTop: 12, background: "#DDF0F4", borderRadius: 8, padding: 12, fontSize: 14 }}>
                <strong style={{ color: C.blue }}>📬 Familia:</strong> <Ic n="mensaje-enviar" tam={20} />{showParte.email} · 📱 {showParte.telefono}
              </div>
              <MedidasDeParte key={showParte.id} parte={showParte} medidas={medidas} setMedidas={setMedidas} esJefatura={perfil.id === "jefatura"} usuario={usuario} />
              <ComoAvisar parte={showParte} />
            </div>
          </div>
        </div>
      )}

      {/* ── Coordinación Diaria de Ausencias ── */}
      {showCoordinacion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, overflowY: "auto" }}>
          <div style={{ background: C.white, borderRadius: 16, maxWidth: "95vw", width: "100%", maxHeight: "90vh", overflowY: "auto", marginY: 20 }}>
            <div style={{ background: R.azul, color: "#fff", padding: "16px 24px", borderRadius: "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}><Ic n="eventos" tam={24} />Coordinación Diaria de Ausencias</div>
              <button onClick={() => setShowCoordinacion(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <CoordinacionAusencias 
                profesores={profesores}
                ausencias={ausencias} 
                cuadrante={cuadrante} 
                apoyosGuardia={apoyosGuardia} 
                sustitutosGuardia={sustitutosGuardia}
                coberturas={coberturas}
                setCoberturas={setCoberturas}
                HORAS_GUARDIA={HORAS_GUARDIA}
                ZONAS_CENTRO={ZONAS_CENTRO}
                C={C} 
                inpStyle={inpStyle} 
                labelStyle={labelStyle}
                fechaCoordinacion={fechaCoordinacion}
                setFechaCoordinacion={setFechaCoordinacion}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </CorreosCentroCtx.Provider>
  );
}
