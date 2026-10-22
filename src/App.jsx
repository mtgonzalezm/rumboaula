import { Component, useState, useEffect, useRef, createContext, useContext } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// ─── Paleta de colores ───────────────────────────────────────────────────────
// ─── Nombre de la aplicación y del centro (cámbialos aquí para otro instituto) ─
const APP = "RumboAula";
// Nombre y localidad del centro: se cambian en Secretaría › Centro › «Datos del centro».
// Se guardan con los demás datos y se aplican aquí para que los usen también los PDF y los correos.
const CENTRO_POR_DEFECTO = { nombre: "Centro educativo", ciudad: "Madrid" };
let CENTRO = CENTRO_POR_DEFECTO.nombre;
let CIUDAD = CENTRO_POR_DEFECTO.ciudad;
let LOGO_CENTRO = null; // { data, w, h }: imagen que el centro pone al pie de los PDF
let POSITIVAS_PDF = []; // conductas positivas, para el informe a la familia (las pone la app al cargar)
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
  // Del camino de la portada: morado para cubrir clases y verde para «la cubres tú»
  morado: "#8A4ECC", moradoClaro: "#F1E9FA", verdeCamino: "#5ABE4C", verdeCaminoClaro: "#E6F6E2", verdeOscuro: "#2E7D23",
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
// Las horas de cada franja se cambian en Jefatura › Organización › «Horario y zonas».
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
  { id: "admin",    label: "🗂 Secretaría" },
  { id: "conserjeria", label: "🔑 Conserjería" },
];
const tabInicial = id => id === "jefatura" ? "dashboard" : id === "admin" ? "admin_panel" : id === "conserjeria" ? "llaves" : "partes";
// Pantalla y módulo con los que se entra en un perfil (Coordinación TIC empieza en Material del centro)
const inicioDe = p => p?.id === "admin" && !funcionesDe(p).secretaria ? { tab: "material_avisos", modulo: "material" }
  : { tab: tabInicial(p?.id), modulo: p?.id === "admin" ? "centro" : "alumnos" };

// ─── Cargos y acceso ─────────────────────────────────────────────────────────
// Cada profesor tiene un cargo, y el cargo decide a qué perfiles puede entrar.
const CARGOS = [
  { id: "profesor",   label: "Profesor/a",           perfiles: ["profesor"], funciones: "Lo tiene todo el claustro, tenga o no otros cargos. Partes y conductas positivas, pasar lista y justificantes, hacer sus guardias, sus ausencias, reservar espacios y pedir llaves (cualquier profesor/a puede hacerlo), avisos de material y Rumbogram. Si es tutor/a de un grupo (se asigna en Alumnos › Tutorías), además los partes, la asistencia y las familias de su grupo." },
  { id: "jefatura",   label: "Jefatura de Estudios", perfiles: ["profesor", "jefatura"], funciones: "Organiza las guardias de todo el profesorado (cuadrante, coordinación y coberturas), las ausencias y justificantes del profesorado, convivencia del centro (partes, medidas, alertas, asistencia y estadísticas) y la organización: horarios y aulas, horario de las franjas, zonas de guardia y la lista de espacios del centro (reservarlos y pedir las llaves lo puede hacer cualquier profesor/a)." },
  { id: "direccion",  label: "Dirección",            perfiles: ["profesor", "jefatura", "admin"], funciones: "Además de lo de Profesor/a, todo lo de Jefatura de Estudios, Secretaría y Coordinación TIC." },
  { id: "secretaria", label: "Secretaría",           perfiles: ["profesor", "admin"], funciones: "Las cuentas del centro: el material que hace falta y su coste, y el mantenimiento. También el profesorado, sus cargos y claves, el personal de Conserjería, el alumnado y las tutorías, y los datos del centro." },
  { id: "tic",        label: "Coordinación TIC",     perfiles: ["profesor", "admin"], funciones: "La tecnología del centro: averías informáticas y audiovisuales, incidencias de los puestos y aulas con ordenadores." },
  { id: "orientacion", label: "Orientación",         perfiles: ["profesor", "jefatura"], funciones: "Convivencia y orientación del alumnado: partes, medidas, alertas, asistencia y estadísticas. Hace sus guardias como el resto del profesorado, pero no las organiza: eso es de Jefatura de Estudios." },
  { id: "jefe_depto", label: "Jefatura de departamento", perfiles: ["profesor"], funciones: "De momento, lo mismo que el profesorado." },
  { id: "conserjeria", label: "Conserjería",         perfiles: ["conserjeria"], funciones: "Entrega y recogida de llaves y consulta de las reservas de los espacios. Sus cuentas van aparte del profesorado." },
];
// Cargos de ejemplo (profesorado ficticio); el resto es Profesor/a
const CUENTAS_DEMO = { "Luis García": { cargos: ["profesor", "direccion"] }, "Ana Jiménez": { cargos: ["profesor", "jefatura"] }, "Elena Vega": { cargos: ["profesor", "tic"] }, "Beatriz Navarro": { cargos: ["profesor", "secretaria"] }, "Conserjería": { cargos: ["conserjeria"], noDocente: true } };
// Personal no docente (Conserjería): tiene cuenta y clave, pero no está en la lista del profesorado
const personalNoDocente = cuentas => Object.keys(cuentas || {}).filter(n => cuentas[n]?.noDocente).sort((a, b) => a.localeCompare(b, "es"));
// Una persona puede tener varios cargos a la vez (p. ej. Profesor/a + Coordinación TIC)
const cargosIds = cuenta => { const l = cuenta?.cargos?.length ? cuenta.cargos : [cuenta?.cargo || "profesor"];
  // Conserjería no es profesorado: solo entra a las llaves
  if (l.length && l.every(c => c === "conserjeria")) return ["conserjeria"];
  return ["profesor", ...l.filter(c => c !== "profesor" && CARGOS.some(x => x.id === c))]; };
const cargoDe = (cuentas, nombre) => {
  const ids = cargosIds(cuentas?.[nombre]); const lista = ids.map(id => CARGOS.find(c => c.id === id));
  return { id: ids[ids.length - 1], ids, label: lista.map(c => c.label).join(" · "), perfiles: [...new Set(lista.flatMap(c => c.perfiles))] };
};
// Un perfil por cada cargo de la persona (Profesor/a, Jefatura, Orientación, TIC…)
const NOMBRE_PERFIL = { profesor: "Profesor/a", jefatura: "Convivencia y estadísticas", admin: "Secretaría y TIC" };
const perfilesPermitidos = (cuentas, nombre) => cargoDe(cuentas, nombre).ids.flatMap(cid => {
  const c = CARGOS.find(x => x.id === cid);
  const ps = cid === "profesor" ? ["profesor"] : c.perfiles.filter(x => x !== "profesor");
  return ps.map(pid => ({ id: pid, key: `${cid}-${pid}`, cargo: cid, label: ps.length > 1 ? `${c.label} · ${NOMBRE_PERFIL[pid]}` : c.label }));
});
// Qué lleva cada cargo dentro de su perfil:
// Secretaría: profesorado y cuentas, alumnado, datos del centro y material que hace falta.
// Coordinación TIC: averías informáticas y aulas con puestos.
// Jefatura de Estudios: organiza guardias, cuadrante, zonas y horario, partes y convivencia. Orientación: convivencia (hace guardias, no las organiza).
// Dirección: todo. (Las sesiones antiguas sin cargo se tratan como antes: Secretaría y TIC o Jefatura completas.)
function funcionesDe(perfil) {
  const c = perfil?.cargo, dir = c === "direccion" || (!c && perfil?.id === "admin");
  return {
    secretaria: dir || c === "secretaria",
    tic: dir || c === "tic",
    guardias: c === "direccion" || c === "jefatura" || (!c && perfil?.id === "jefatura"),
    convivencia: ["direccion", "jefatura", "orientacion"].includes(c) || (!c && perfil?.id === "jefatura"),
    direccion: c === "direccion",
  };
}
// El perfil (con su cargo) con el que entra una persona
const perfilDe = (cuentas, nombre, id) => perfilesPermitidos(cuentas, nombre).find(p => p.id === id) || PERFILES.find(p => p.id === id);
const MIN_CLAVE = 6;
// Las claves nunca se guardan tal cual: solo su huella SHA-256 (requiere conexión segura HTTPS).
// En esta versión de demostración se guardan en el navegador; en el servidor del centro irán al servidor.
// «sal» distingue las claves creadas antes de octubre de 2026 (con el nombre antiguo del proyecto)
async function hashClave(nombre, clave, sal = "rumboaula") {
  if (!window.crypto?.subtle) throw new Error("sin-https");
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${sal}|${nombre}|${clave}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Pantalla de entrada: nombre → clave → perfil ───────────────────────────
// Reflejo de la ilustración en la portada: se ve junto a la tarjeta y se desvanece hacia abajo
const REFLEJO = "linear-gradient(to bottom, #000 0%, rgba(0,0,0,.45) 40%, transparent 92%), linear-gradient(to right, transparent 0, #000 15%, #000 85%, transparent 100%)";
function PantallaEntrada({ profesores, cuentas, setCuentas, onEntrar, onCargarEjemplo, nombreSugerido, tutoraDemo, sinLeerPor = {} }) {
  // Demostración: globo de bienvenida con los pasos, la primera vez en esta pestaña
  const [globo, setGlobo] = useState(() => { try { return MODO_DEMO && !sessionStorage.getItem("rumboaula:globo"); } catch { return MODO_DEMO; } });
  const [ejemploListo, setEjemploListo] = useState(() => { try { return !!sessionStorage.getItem("rumboaula:ejemplo"); } catch { return false; } });
  const cerrarGlobo = () => { setGlobo(false); try { sessionStorage.setItem("rumboaula:globo", "1"); } catch { /* sin almacenamiento */ } };
  const cargarEjemplo = () => { onCargarEjemplo(); setEjemploListo(true); try { sessionStorage.setItem("rumboaula:ejemplo", "1"); } catch { /* sin almacenamiento */ } };
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
    if (!profesores.includes(n) && !cuentas[n]?.noDocente) { setError("Ese nombre no está en la lista del profesorado ni del personal del centro. Elígelo de la lista o pide a Secretaría que te añada."); return; }
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
        // Clave creada antes del cambio de nombre: si coincide, se guarda ya con el formato nuevo
        const h = await hashClave(nombre, clave);
        if (await hashClave(nombre, clave, "galvandesk") !== cuentas[nombre].clave) { setError("Clave incorrecta."); setClave(""); return; }
        setCuentas(prev => ({ ...prev, [nombre]: { ...(prev[nombre] || {}), clave: h } }));
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
    { txt: "👨‍🏫 Profesor/a", sub: `${nombreSugerido || "María Fernández"} · poner partes, guardias y Rumbogram`, accion: () => onEntrar(nombreSugerido || "María Fernández", PERFILES[0]) },
    { txt: "🏫 Tutor/a de un grupo", sub: `${tutora.nombre} · tutoría de ${tutora.curso} y familias`, accion: () => onEntrar(tutora.nombre, PERFILES[0]) },
    { txt: "📊 Jefatura de Estudios", sub: "Ana Jiménez · guardias, ausencias, convivencia, horarios y aulas", accion: () => onEntrar("Ana Jiménez", perfilDe(cuentas, "Ana Jiménez", "jefatura")) },
    { txt: "🗂 Secretaría", sub: "Beatriz Navarro · compras y material, profesorado, alumnado y centro", accion: () => onEntrar("Beatriz Navarro", perfilDe(cuentas, "Beatriz Navarro", "admin")) },
    { txt: "💻 Coordinación TIC", sub: "Elena Vega · averías informáticas y aulas con puestos", accion: () => onEntrar("Elena Vega", perfilDe(cuentas, "Elena Vega", "admin")) },
    { txt: "🔑 Conserjería", sub: "Entrega y recogida de llaves", accion: () => onEntrar("Conserjería", perfilDe(cuentas, "Conserjería", "conserjeria")) },
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
      {/* Entrar como cualquier profe (p. ej. quien ha recibido un aviso de Rumbogram) */}
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
          ["Elige qué quieres probar", "Profesor/a, Tutor/a, Jefatura de Estudios, Secretaría, Coordinación TIC o Conserjería, en la tarjeta «Acceso». Solo tienes que pulsar: se cargan datos de ejemplo. No escribas nombre ni clave."],
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
    { txt: "¿Qué es?", corto: "¿Qué es?", icono: "como-se-usa", accion: () => abrirPreguntas("que-es") },
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
      // Fondo limpio, como el de Rayuela: gris muy claro arriba y «suelo» blanco abajo
      background: "linear-gradient(#E4EAEE 0%, #F3F6F8 58%, #FFFFFF 58%)" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }
        .gd-portada-menu a, .gd-portada-menu button { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 6px; background: none; border: none; color: ${R.noche}; font-size: 17px; font-family: inherit; cursor: pointer; text-decoration: none; }
        .gd-portada-menu a:hover, .gd-portada-menu button:hover { color: ${R.azul}; text-decoration: underline; }
        .gd-corto { display: none; }
        @media (max-width: 860px) {
          .gd-portada-escena { padding: 0 !important; align-items: stretch !important; justify-content: flex-start !important; }
          .gd-portada-reflejo { height: 110px !important; }
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
      <div className="gd-portada-escena" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px 0" }}>
      <div className="gd-portada-tarjeta" style={{ width: "100%", maxWidth: 1000, background: "#fff", boxShadow: "0 22px 40px rgba(22, 51, 63, .22)", position: "relative", zIndex: 1 }}>
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
                <datalist id="lista-profesores">{[...profesores, ...personalNoDocente(cuentas)].map(p => <option key={p} value={p} />)}</datalist>
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
            {verOlvido && <div style={{ fontSize: 15, color: R.noche, background: R.crema, padding: "8px 12px" }}>Pide a Secretaría del centro que restablezca tu clave. La próxima vez que entres crearás una nueva.</div>}
          </div>
        </div>
      </div>
      {/* La ilustración del camino, suave y reflejada en el «suelo» bajo la tarjeta */}
      <div aria-hidden="true" className="gd-portada-reflejo" style={{ width: "100%", maxWidth: 1100, height: "clamp(120px, 24vh, 240px)", overflow: "hidden", marginTop: -2,
        maskImage: REFLEJO, WebkitMaskImage: REFLEJO, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}>
        <img src="/portada-ilustracion.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 78%", display: "block", opacity: .4, transform: "scaleY(-1)" }} />
      </div>
      <PieAutoria />
      </div>
    </div>
  );
}
// Autoría y licencia (texto completo en el archivo LICENSE del repositorio)
const AUTORA = "María Teresa González Muñoz";
const PieAutoria = ({ claro = false }) => (
  <div data-autoria style={{ fontSize: 13, lineHeight: 1.5, color: claro ? "rgba(255,255,255,.9)" : R.petroleo, textAlign: "center", padding: "10px 16px" }}>
    © 2026 {AUTORA} · RumboAula · Uso educativo libre y sin fines comerciales ·{" "}
    <button type="button" onClick={() => abrirPreguntas("licencia")} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", textDecoration: "underline", cursor: "pointer" }}>Licencia</button>
  </div>
);
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
const PREFIJO = "rumboaula:";
// Hasta octubre de 2026 los datos se guardaban con el prefijo «galvandesk:». Se pasan una vez al nuevo, sin perder nada.
(() => {
  try {
    for (const almacen of [localStorage, sessionStorage]) {
      for (let i = almacen.length - 1; i >= 0; i--) {
        const k = almacen.key(i);
        if (k && k.startsWith("galvandesk:")) {
          const nuevo = "rumboaula:" + k.slice(11);
          if (almacen.getItem(nuevo) === null) almacen.setItem(nuevo, almacen.getItem(k));
          almacen.removeItem(k);
        }
      }
    }
  } catch { /* sin almacenamiento */ }
})();
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
  "👨‍🏫": "profesorado", "🔑": "llave", "🗓": "horario", "🖥": "ordenador", "✅": "pasar-lista", "🟡": "leve", "⚠": "grave", "🔴": "muy-grave",
  "🔍": "buscar", "⏰": "hora", "📂": "tipo-parte", "🎯": "gravedad-campo", "⚖": "tipificacion", "📝": "descripcion",
  "⚡": "parte-expres", "🗒": "notas-aula", "🤝": "compromiso", "📑": "resumen-tutoria",
};
const ICONO_TEXTO = [[/^Secretaría/, "cargo-secretaria"], [/^Coordinación TIC/, "cargo-tic"], [/^Jefatura de Estudios/, "cargo-jefatura"], [/^Profesor\/a$/, "cargo-profesor"], [/^Tutor\/a de un grupo/, "tutor"], [/^Como tutor\/a/, "tutor"], [/^Como profesor\/a/, "cargo-profesor"], [/^Profesor responsable/, "profesor"], [/^Generar Parte/, "generar"], [/^Coordinación/, "eventos"], [/^Parte del Día/, "estado-general"], [/^Ver Guardias/, "horario"], [/^Ausencias de Profesores/, "profe-ausente"]];
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
    // Logotipo del centro al pie (Secretaría › Datos del centro): 1 cm de alto como mucho
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

// En la demostración, recordatorio justo donde es más fácil meter datos reales sin darse cuenta
const AvisoSoloFicticios = ({ que = "" }) => MODO_DEMO ? (
  <div role="note" data-aviso-ficticios style={{ margin: "0 0 14px", padding: "12px 14px", background: R.crema, borderLeft: `6px solid ${R.mostaza}`, color: R.noche, fontSize: 15, lineHeight: 1.5 }}>
    <strong>⚠️ Solo datos ficticios.</strong> Esta es una versión de demostración: no importes ni escribas datos reales {que}. Para usar datos reales, cada centro necesita su propia instalación en un servidor del instituto y la autorización de la Delegación de Protección de Datos.
  </div>
) : null;

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
      <AvisoSoloFicticios que="del alumnado ni de las familias" />
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
// Zonas de guardia: Jefatura de Estudios puede renombrarlas, cambiarlas de edificio, añadir y ocultar
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
  return ausencias.filter(a => isoLocal(a.fecha) === fecha && a.horas.includes(g.hora)).map(a => enHora(a, g.hora)).filter(a =>
    a.profesor === g.sit?.sustituyeA || !a.edificio || !g.edificio || g.edificio === "-" || a.edificio === g.edificio);
}
// Tarjeta con lo que ha dejado el profesor ausente
const TareaAusente = ({ a, C }) => (
  <div style={{ background: "#FDF1D9", border: "1px solid #F6C862", borderRadius: 8, padding: 10, fontSize: 14, color: "#78350F", lineHeight: 1.5 }}>
    <div style={{ fontWeight: 700, marginBottom: 4 }}><Ic n="profe-ausente" tam={22} />Deja {a.profesor}{a.asignatura ? ` · ${a.asignatura}` : ""}</div>
    {(a.aula || a.edificio) && <div><Ic n="aula" tam={20} />{a.aula || "?"}{a.sala ? ` · ${a.sala}` : ""}{a.edificio ? ` · Edificio ${a.edificio}` : ""}</div>}
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
// Clases cubiertas por un profesor en lo que va de curso (desde el 1 de septiembre)
const inicioCurso = (fecha = isoLocal(new Date())) => {
  const [a, m] = fecha.split("-").map(Number);
  return `${m >= 9 ? a : a - 1}-09-01`;
};
const clasesCubiertasCurso = (fecha, profesor, coberturas) => {
  const desde = inicioCurso(fecha);
  return Object.entries(coberturas).filter(([k, p]) => p === profesor && k.slice(0, 10) >= desde && k.slice(0, 10) <= fecha).length;
};
// ¿Se la asignó él mismo? (si luego la asigna jefatura a otra persona, deja de serlo)
const esPropia = (clave, coberturas, propias = {}) => !!coberturas[clave] && propias[clave] === coberturas[clave];
// Clase que cubre un profesor a una hora (la ausencia) o null
function claseQueCubre(fecha, hora, profesor, coberturas, ausencias) {
  const k = Object.keys(coberturas).find(k => coberturas[k] === profesor && k.startsWith(`${fecha}|${hora}|`));
  const a = k ? ausencias.find(x => String(x.id) === k.split("|")[2]) : null;
  return a ? enHora(a, hora) : null;
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
    enCurso: clasesCubiertasCurso(fecha, c.profesor, otras),
    guardias: guardiasDelDia(fecha, c.profesor, cuadrante, apoyos, sustitutos),
  })).sort((a, b) => a.peso - b.peso || a.cubiertas - b.cubiertas || a.enCurso - b.enCurso || a.guardias - b.guardias || a.profesor.localeCompare(b.profesor));
}

// Botones del profesorado de guardia: «Me la asigno» y «Soltarla».
// Puede asignársela quien sale entre los candidatos, si nadie la cubre y la hora no ha terminado.
// Solo puede soltarla quien se la asignó él mismo, antes de que empiece la hora.
function MeLaAsigno({ fecha, hora, ausencia, equipo, coberturas = {}, setCoberturas, propias = {}, setPropias, usuario, C }) {
  if (!usuario || !setCoberturas) return null;
  const clave = claveCob(fecha, hora, ausencia.id);
  const asignado = coberturas[clave];
  const btn = { border: "none", borderRadius: 8, padding: "10px 14px", minHeight: 44, fontWeight: 700, fontSize: 14, cursor: "pointer" };
  if (asignado === usuario) {
    if (!esPropia(clave, coberturas, propias) || horaEmpezada(fecha, hora)) return null;
    const soltar = () => {
      setCoberturas(prev => { const n = { ...prev }; delete n[clave]; return n; });
      setPropias?.(prev => { const n = { ...prev }; delete n[clave]; return n; });
    };
    return <button onClick={soltar} style={{ ...btn, background: "#fff", color: C.dark, border: `1px solid ${R.verdeCamino}` }}>Soltarla</button>;
  }
  if (asignado || horaTerminada(fecha, hora)) return null;
  const puedo = candidatosClase({ fecha, hora, ausencia, ...equipo, coberturas }).some(c => c.profesor === usuario);
  if (!puedo) return null;
  const asignarme = () => {
    setCoberturas(prev => ({ ...prev, [clave]: usuario }));
    setPropias?.(prev => ({ ...prev, [clave]: usuario }));
  };
  return <button onClick={asignarme} style={{ ...btn, background: R.morado, color: "#fff" }}>✋ Me la asigno</button>;
}

// Quién cubre una clase a una hora: sugerencias, botón de asignar (jefatura) y «Me la asigno» (guardia)
function CubrirClase({ fecha, hora, ausencia: ausenciaDia, equipo, coberturas = {}, setCoberturas, propias = {}, setPropias, puedeAsignar = false, usuario = "", C }) {
  const ausencia = enHora(ausenciaDia, hora);
  const [verTodos, setVerTodos] = useState(false);
  const clave = claveCob(fecha, hora, ausencia.id);
  const asignado = coberturas[clave];
  const propia = esPropia(clave, coberturas, propias);
  const candidatos = candidatosClase({ fecha, hora, ausencia, ...equipo, coberturas });
  const quitarMarca = () => setPropias?.(prev => { if (!(clave in prev)) return prev; const n = { ...prev }; delete n[clave]; return n; });
  const asignar = p => { setCoberturas?.(prev => ({ ...prev, [clave]: p })); quitarMarca(); };
  const quitar = () => { setCoberturas?.(prev => { const n = { ...prev }; delete n[clave]; return n; }); quitarMarca(); };
  const btn = { border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const lista = verTodos ? candidatos : candidatos.slice(0, 3);
  const mia = asignado && asignado === usuario;
  const botonPropio = !puedeAsignar && <MeLaAsigno fecha={fecha} hora={hora} ausencia={ausencia} equipo={equipo} coberturas={coberturas} setCoberturas={setCoberturas} propias={propias} setPropias={setPropias} usuario={usuario} C={C} />;
  return (
    <div data-cubrir={clave} style={{ background: mia ? R.verdeCaminoClaro : asignado ? "#DDF0F4" : "#fff", border: `1px solid ${mia ? R.verdeCamino : asignado ? C.teal : R.morado}`, borderLeft: `5px solid ${mia ? R.verdeCamino : asignado ? C.teal : R.morado}`, borderRadius: 8, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
          <Ic n="hora-reloj" tam={20} />{conTramo(hora)}
          {mia
            ? <span style={{ color: R.verdeOscuro }}> · ✅ La cubres tú{propia ? " (te la has asignado)" : ""}</span>
            : asignado
            ? <span style={{ color: C.teal }}> · ✅ Cubre {asignado}{propia ? " · se la asignó"  : ""}</span>
            : <span style={{ color: R.morado }}> · Sin cubrir</span>}
        </div>
        {asignado && puedeAsignar && <button onClick={quitar} style={{ ...btn, background: C.light, color: C.dark }}>Cambiar</button>}
        {mia && botonPropio}
      </div>
      {!asignado && (
        candidatos.length === 0 ? (
          <div style={{ fontSize: 14, color: C.salmon, fontWeight: 600, marginTop: 6 }}>No hay nadie de guardia libre a esta hora sin dejar una zona vacía.</div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {!puedeAsignar && <div style={{ fontSize: 13, color: C.gray }}>Si estás de guardia y puedes, asígnatela; si no, Jefatura confirmará quién la cubre. Sugerencias:</div>}
            {botonPropio && <div>{botonPropio}</div>}
            {lista.map((c, i) => {
              const pr = PRIORIDADES_COB[c.prioridad];
              return (
                <div key={c.profesor} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, background: i === 0 ? R.moradoClaro : C.light, borderRadius: 8, padding: "6px 10px" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{i === 0 ? "⭐ " : ""}{c.profesor}{c.profesor === usuario ? " (tú)" : ""}</div>
                    <div style={{ fontSize: 13, color: C.gray }}>
                      <span style={{ color: pr.color, background: pr.bg, borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>{pr.txt}</span>
                      {" "}{c.zona} · {c.cubiertas} hoy · {c.enCurso} en el curso · {c.guardias} guardia(s)
                    </div>
                  </div>
                  {puedeAsignar && <button onClick={() => asignar(c.profesor)} style={{ ...btn, background: i === 0 ? R.morado : C.dark, color: "#fff" }}>Asignar</button>}
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

// Historial de las clases que ha cubierto un profesor: este mes, en el curso y las próximas
function MisCoberturas({ usuario, coberturas = {}, propias = {}, ausencias = [], C }) {
  const hoy = isoLocal(new Date());
  const mes = hoy.slice(0, 7), desde = inicioCurso(hoy);
  const filas = Object.entries(coberturas).filter(([, p]) => p === usuario).map(([clave]) => {
    const [fecha, hora, id] = clave.split("|");
    const a = ausencias.find(x => String(x.id) === id);
    return a ? { clave, fecha, hora, a: enHora(a, hora), propia: esPropia(clave, coberturas, propias) } : null;
  }).filter(Boolean).sort((x, y) => y.fecha.localeCompare(x.fecha) || HORAS.indexOf(y.hora) - HORAS.indexOf(x.hora));
  const hechas = filas.filter(f => horaEmpezada(f.fecha, f.hora));
  const proximas = filas.filter(f => !horaEmpezada(f.fecha, f.hora)).reverse();
  const totales = [
    { label: "Hoy", value: hechas.filter(f => f.fecha === hoy).length },
    { label: "Este mes", value: hechas.filter(f => f.fecha.startsWith(mes)).length },
    { label: "En el curso", value: hechas.filter(f => f.fecha >= desde).length },
    { label: "Próximas", value: proximas.length },
  ];
  const fechaLarga = f => { const t = parseISO(f).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const tarjeta = { background: C.white, borderRadius: 12, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 14 };
  const Fila = ({ f, proxima }) => (
    <div data-cobertura={f.clave} style={{ display: "grid", gap: 4, padding: "10px 12px", borderRadius: 10, background: proxima ? R.verdeCaminoClaro : C.light, borderLeft: `5px solid ${proxima ? R.verdeCamino : R.morado}`, fontSize: 14, color: C.dark }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <strong>{fechaLarga(f.fecha)} · {conTramo(f.hora)}</strong>
        <span style={{ fontSize: 13, fontWeight: 700, color: f.propia ? R.morado : C.gray }}>{f.propia ? "✋ Te la asignaste" : "📋 Asignada por Jefatura"}</span>
      </div>
      <div>Clase de <strong>{f.a.profesor}</strong>{f.a.aula ? ` · ${f.a.aula}` : ""}{f.a.asignatura ? ` · ${f.a.asignatura}` : ""}{f.a.sala ? ` · ${f.a.sala}` : ""}{f.a.edificio ? ` · Edificio ${f.a.edificio}` : ""}</div>
      <div style={{ color: C.gray }}>{f.a.tarea ? `Consigna: ${f.a.tarea}` : "Sin consigna"}</div>
    </div>
  );
  return (
    <div>
      <TituloBloque titulo="Mis coberturas" sub={usuario ? `Clases que has cubierto, ${usuario}` : "Elige tu nombre en «Mi guardia hoy»"} icono="historial" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, margin: "16px 0 14px" }}>
        {totales.map(t => (
          <div key={t.label} data-total={t.label} style={{ background: C.white, borderRadius: 10, padding: 12, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${t.label === "Próximas" ? R.verdeCamino : R.morado}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.dark }}>{t.value}</div>
            <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{t.label}</div>
          </div>
        ))}
      </div>
      {proximas.length > 0 && (
        <div style={tarjeta}>
          <div style={{ fontWeight: 800, color: C.dark, fontSize: 15, marginBottom: 10 }}><Ic n="hora-reloj" tam={22} />Próximas clases que cubres</div>
          <div style={{ display: "grid", gap: 8 }}>{proximas.map(f => <Fila key={f.clave} f={f} proxima />)}</div>
        </div>
      )}
      <div style={tarjeta}>
        <div style={{ fontWeight: 800, color: C.dark, fontSize: 15, marginBottom: 10 }}><Ic n="historial" tam={22} />Clases cubiertas</div>
        {hechas.length === 0
          ? <div style={{ padding: 18, textAlign: "center", color: C.gray, fontSize: 14 }}>Todavía no has cubierto ninguna clase.</div>
          : <div style={{ display: "grid", gap: 8 }}>{hechas.map(f => <Fila key={f.clave} f={f} />)}</div>}
      </div>
    </div>
  );
}

// ─── Conductas positivas: lo que el alumnado hace bien ────────────────────────
const TIPOS_POSITIVA = ["Ayuda a un compañero/a", "Esfuerzo o mejora notable", "Participación destacada", "Buen comportamiento", "Responsabilidad con sus tareas", "Resolución pacífica de un conflicto", "Otra"];
// Ideas para el detalle: se tocan para copiarlas y se pueden retocar
const FRASES_POSITIVA = {
  "Ayuda a un compañero/a": ["Ha ayudado a un compañero/a a entender la tarea sin que se lo pidieran.", "Ha acogido con amabilidad a un compañero/a nuevo en el grupo.", "Ha compartido su material con quien lo necesitaba."],
  "Esfuerzo o mejora notable": ["Ha mejorado mucho en la entrega de las tareas en las últimas semanas.", "Se ha esforzado por terminar el trabajo aunque le costaba.", "Ha superado una dificultad con constancia y buena actitud."],
  "Participación destacada": ["Ha participado activamente con aportaciones muy interesantes.", "Ha presentado su trabajo ante la clase con seguridad.", "Ha animado al grupo a participar en la actividad."],
  "Buen comportamiento": ["Ha mantenido una actitud respetuosa y tranquila durante toda la clase.", "Ha respetado el turno de palabra y ha escuchado a los demás.", "Ha cuidado el material y el aula."],
  "Responsabilidad con sus tareas": ["Ha traído las tareas hechas y el material preparado.", "Ha organizado bien su trabajo y ha cumplido los plazos.", "Ha asumido con responsabilidad su papel en el trabajo en grupo."],
  "Resolución pacífica de un conflicto": ["Ha resuelto un desacuerdo hablando, con calma y respeto.", "Ha pedido ayuda a un adulto en lugar de responder a una provocación.", "Ha ayudado a que dos compañeros/as se entendieran."],
  "Otra": ["Ha tenido un gesto de amabilidad que merece reconocerse.", "Ha representado muy bien al centro en una actividad.", "Ha mostrado una actitud ejemplar en una salida o actividad."],
};
function positivasEjemplo(alumnos, profesores) {
  const hoy = new Date(), l = [];
  alumnos.slice(0, 18).forEach((a, i) => {
    if (i % 3 === 2) return;
    const d = new Date(hoy); d.setDate(d.getDate() - (i * 2 + 1)); d.setHours(10 + (i % 4), 15);
    l.push({ id: 5000 + i, alumnoId: a.id, alumno: a.nombre, curso: a.curso, tipo: TIPOS_POSITIVA[i % (TIPOS_POSITIVA.length - 1)],
      detalle: ["Ha ayudado a un compañero nuevo a ponerse al día.", "", "Gran mejora en la entrega de tareas este mes.", "Ha mediado en una discusión en el recreo."][i % 4],
      profesor: profesores[(i * 5) % profesores.length], ts: d.toISOString() });
  });
  return l;
}
function textoPositiva(x) {
  return `RECONOCIMIENTO DE CONDUCTA POSITIVA — ${CENTRO} (${CIUDAD})
Ref.: POSITIVA-${x.id}

Alumno/a: ${x.alumno}
Curso: ${x.curso}
Tutor/a del grupo: ${x.tutor || "-"}${x.tutorEmail ? ` (${x.tutorEmail})` : ""}
Fecha: ${fmt(x.ts)}
Profesor/a que lo anota: ${x.profesor}

Conducta positiva: ${x.tipo}${x.detalle ? `\n\n${x.detalle}` : ""}

Queremos compartir con ustedes este reconocimiento y animar a ${x.alumno.split(" ")[0]} a seguir así.
Para cualquier aclaración pueden contactar con el tutor/a del grupo o con Jefatura de Estudios.`;
}
function pdfPositiva(x) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, "Reconocimiento de conducta positiva", `Ref. POSITIVA-${x.id}`);
  autoTable(doc, { ...estiloTabla, startY: y, theme: "grid", styles: { ...estiloTabla.styles, fontSize: 13 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, fillColor: [230, 246, 226] } },
    body: [["Alumno/a", x.alumno], ["Curso", x.curso], ["Tutor/a del grupo", x.tutor || "-"], ["Fecha", fmt(x.ts)], ["Profesor/a", x.profesor], ["Conducta positiva", x.tipo]].map(([k, v]) => [k, sinEmoji(v)]) });
  y = doc.lastAutoTable.finalY + 8;
  const w = doc.internal.pageSize.getWidth();
  if (x.detalle) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Qué ha hecho", 14, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const l = doc.splitTextToSize(sinEmoji(x.detalle), w - 28); doc.text(l, 14, y + 6); y += 6 + l.length * 5 + 6;
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const cierre = doc.splitTextToSize(`Queremos compartir con la familia este reconocimiento y animar a ${x.alumno.split(" ")[0]} a seguir así.`, w - 28);
  doc.text(cierre, 14, y); y += cierre.length * 5;
  firmasPDF(doc, y, [{ cargo: "El profesor/a", nombre: x.profesor }, { cargo: "El tutor/a", nombre: x.tutor }, { cargo: "Recibí: la familia" }]);
  guardarPDF(doc, `conducta-positiva-${nombreArchivo(x.alumno)}-${isoLocal(x.ts)}.pdf`);
}
// Las mismas vías que un parte: PDF, texto y correo a familia, tutor/a, Jefatura y Orientación
function ComoComunicarPositiva({ x, C }) {
  return (
    <div data-comunicar style={{ marginTop: 14, textAlign: "left", border: `1px solid ${R.turquesaClaro}`, background: C.white }}>
      <div style={{ background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.noche, padding: "10px 14px", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="mensaje-enviar" tam={34} />Comunicarlo a la familia, al tutor/a, a Jefatura y a Orientación</div>
      <div style={{ padding: "12px 14px 0", fontSize: 16, color: R.petroleo, lineHeight: 1.5 }}>
        Elige abajo a quién se lo envías y pulsa «Abrir en mi correo». Para el contenido, <strong>descarga el PDF</strong> y adjúntalo, o <strong>copia el texto</strong> y pégalo en el correo.
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => pdfPositiva(x)} style={{ background: R.azul, color: "#fff", border: "none", borderRadius: 6, minHeight: 48, padding: "0 18px", cursor: "pointer", fontWeight: 700, fontSize: 17 }}>⬇️ Descargar PDF</button>
          <CopyBtn getText={() => textoPositiva(x)} label="📋 Copiar texto" />
        </div>
        <ElegirDestinatarios key={x.id} alumno={{ nombre: x.alumno, email: x.email }} tutorNombre={x.tutor} tutorEmail={x.tutorEmail}
          asunto={`Conducta positiva · ${x.alumno} (${x.curso})`} cuerpo={textoPositiva(x)} porDefecto={["familia", "tutor", "jefatura", "orientacion"]} C={C} />
        <div style={{ fontSize: 14, color: R.petroleo, marginTop: 10 }}>La app no envía correos: se mandan desde tu correo del centro, que es el canal oficial.</div>
      </div>
    </div>
  );
}
function PositivasAlumno({ lista, C }) {
  if (!lista.length) return null;
  const orden = [...lista].sort((a, b) => b.ts.localeCompare(a.ts));
  return (
    <div data-positivas style={{ marginTop: 12, background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, padding: "10px 14px" }}>
      <div style={{ fontWeight: 700, color: R.verdeOscuro, fontSize: 15, marginBottom: 6 }}>⭐ {lista.length} {lista.length === 1 ? "conducta positiva" : "conductas positivas"}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {orden.map(x => (
          <div key={x.id} style={{ fontSize: 14, color: C.dark }}>
            <strong>{x.tipo}</strong> · {fmtD(x.ts)} · {x.profesor}{x.detalle ? <span style={{ color: C.gray }}> — {x.detalle}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
function ConductasPositivas({ alumnos, positivas, setPositivas, usuario, tutores = {}, setMensajes, C, inpStyle, labelStyle }) {
  const [comunicar, setComunicar] = useState(null); // anotación cuyo aviso se está preparando
  const [busca, setBusca] = useState("");
  const [alumnoId, setAlumnoId] = useState(null);
  const [tipo, setTipo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [hecho, setHecho] = useState("");
  const al = alumnos.find(a => a.id === alumnoId);
  const coinciden = busca && !al ? alumnos.filter(a => `${a.nombre} ${a.curso}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 30) : [];
  const anotar = () => {
    if (!al || !tipo) return;
    const tutor = tutores[al.curso]?.tutor || al.tutor || "";
    const x = { id: Date.now(), alumnoId: al.id, alumno: al.nombre, curso: al.curso, email: al.email || "", tutor, tutorEmail: tutores[al.curso]?.email || "",
      tipo, detalle: detalle.trim(), profesor: usuario, ts: new Date().toISOString() };
    setPositivas(prev => [x, ...prev]);
    // El tutor/a se entera también dentro de la app, por Rumbogram
    if (tutor && tutor !== usuario && setMensajes) setMensajes(prev => [{ id: x.id + 1, aviso: x.id + 1, remitente: "RumboAula", destinatario: tutor, conCopia: [], leido: false, urgente: false, ts: x.ts, lugar: null,
      texto: `⭐ ${usuario} ha anotado una conducta positiva de ${al.nombre} (${al.curso}): ${tipo}.${x.detalle ? ` «${x.detalle}»` : ""}` }, ...prev]);
    setComunicar(x);
    setHecho(`Anotado: ${tipo} · ${al.nombre}`); setBusca(""); setAlumnoId(null); setTipo(""); setDetalle("");
    setTimeout(() => setHecho(""), 4000);
  };
  const mias = positivas.filter(x => x.profesor === usuario).sort((a, b) => b.ts.localeCompare(a.ts));
  return (
    <div>
      <TituloBloque titulo="Conducta positiva" sub="Anota también lo que el alumnado hace bien" icono="saludo" />
      {hecho && <div role="status" style={{ margin: "14px 0 0", padding: "10px 14px", background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
      {comunicar && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ color: R.petroleo, fontSize: 16 }}>⭐ {comunicar.tipo} · {comunicar.alumno} — {comunicar.curso}</strong>
            <button onClick={() => setComunicar(null)} style={{ minHeight: 44, padding: "0 14px", border: `1px solid ${R.turquesaClaro}`, borderRadius: 6, background: "#fff", color: R.petroleo, cursor: "pointer" }}>Cerrar</button>
          </div>
          {comunicar.tutor && comunicar.tutor !== usuario && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 6 }}>Su tutor/a, {comunicar.tutor}, ya lo ha recibido en Rumbogram.</div>}
          <ComoComunicarPositiva x={comunicar} C={C} />
        </Card>
      )}
      <Card style={{ background: R.azulClaro, border: "none", marginTop: 16 }}>
        <label htmlFor="gd-pos-busca" style={labelStyle}><ConIcono texto="🔍 Alumno o alumna" tam={30} /></label>
        <input id="gd-pos-busca" value={busca} onChange={e => { setBusca(e.target.value); setAlumnoId(null); }} placeholder="Nombre o grupo…" style={{ ...inpStyle, marginBottom: 8 }} />
        {coinciden.length > 0 && (
          <div style={{ border: `3px solid ${R.turquesa}`, background: C.white, maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
            {coinciden.map(a => (
              <button key={a.id} onClick={() => { setAlumnoId(a.id); setBusca(`${a.nombre} — ${a.curso}`); }}
                style={{ display: "block", width: "100%", textAlign: "left", minHeight: 48, padding: "12px 14px", border: "none", borderBottom: `1px solid ${R.turquesaClaro}`, background: "none", cursor: "pointer", fontSize: 16, color: R.noche, fontFamily: "inherit" }}>
                <strong>{a.nombre}</strong> — {a.curso}
              </button>
            ))}
          </div>
        )}
        <div style={{ ...labelStyle, marginTop: 6 }}>¿Qué ha hecho bien?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {TIPOS_POSITIVA.map(t => (
            <button key={t} aria-pressed={tipo === t} onClick={() => setTipo(t)}
              style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `2px solid ${tipo === t ? R.verdeCamino : R.turquesaClaro}`, background: tipo === t ? R.verdeCaminoClaro : "#fff", color: tipo === t ? R.verdeOscuro : R.noche, fontWeight: tipo === t ? 700 : 400, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              {tipo === t ? "✓ " : ""}{t}
            </button>
          ))}
        </div>
        {tipo && (
          <div data-frases style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: R.petroleo, marginBottom: 6 }}>💡 Ideas para el detalle: toca una para usarla y retócala si quieres.</div>
            <div style={{ display: "grid", gap: 6 }}>
              {FRASES_POSITIVA[tipo].map(f => (
                <button key={f} onClick={() => setDetalle(f)} aria-pressed={detalle === f}
                  style={{ textAlign: "left", minHeight: 44, padding: "8px 12px", border: `1px dashed ${detalle === f ? R.verdeCamino : R.turquesa}`, borderRadius: 6, background: detalle === f ? R.verdeCaminoClaro : "#fff", color: R.noche, fontSize: 15, fontStyle: "italic", cursor: "pointer", fontFamily: "inherit" }}>
                  «{f}»
                </button>
              ))}
            </div>
          </div>
        )}
        <label htmlFor="gd-pos-detalle" style={labelStyle}>Detalle (opcional)</label>
        <textarea id="gd-pos-detalle" value={detalle} onChange={e => setDetalle(e.target.value)} rows={2} placeholder="Por ejemplo: ha ayudado a un compañero a entender el ejercicio." style={{ ...inpStyle, marginBottom: 12, resize: "vertical" }} />
        <Btn onClick={anotar} disabled={!al || !tipo} style={{ width: "100%", minHeight: 52 }}>⭐ Anotar</Btn>
        {(!al || !tipo) && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}>{!al ? "Elige primero al alumno o alumna." : "Elige qué ha hecho bien."}</div>}
      </Card>
      <Card>
        <h3 style={{ marginTop: 0, color: R.petroleo, fontSize: 18 }}>Mis anotaciones ({mias.length})</h3>
        {mias.length === 0 ? <p style={{ color: R.petroleo, margin: 0 }}>Todavía no has anotado ninguna.</p> : mias.map(x => (
          <div key={x.id} data-positiva={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 15, color: R.noche }}>
            <div><strong>{x.alumno}</strong> — {x.curso}<div style={{ color: R.verdeOscuro, fontWeight: 700 }}>⭐ {x.tipo}</div>{x.detalle && <div style={{ color: C.gray, fontSize: 14 }}>{x.detalle}</div>}<div style={{ color: C.gray, fontSize: 13 }}>{fmtD(x.ts)}</div></div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={() => { const al2 = alumnos.find(a => a.id === x.alumnoId); setComunicar({ ...x, email: x.email || al2?.email || "", tutor: x.tutor || tutores[x.curso]?.tutor || al2?.tutor || "", tutorEmail: x.tutorEmail || tutores[x.curso]?.email || "" }); window.scrollTo(0, 0); }}
                style={{ minHeight: 44, padding: "0 12px", border: `2px solid ${R.azul}`, borderRadius: 6, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer" }}>Comunicar</button>
              <button onClick={() => { setPositivas(prev => prev.filter(y => y.id !== x.id)); if (comunicar?.id === x.id) setComunicar(null); }} aria-label={`Borrar la anotación de ${x.alumno}`} style={{ minHeight: 44, padding: "0 12px", border: `1px solid ${R.turquesaClaro}`, borderRadius: 6, background: "#fff", color: R.petroleo, cursor: "pointer" }}>Borrar</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Convivencia ágil: compromisos, notas de aula, alerta temprana y resumen de tutoría ───
// Nada de esto genera partes ni medidas: es seguimiento y prevención.
const ESTADOS_COMPROMISO = {
  en_proceso:  { label: "En proceso",  color: R.crema, borde: R.mostaza },
  cumplido:    { label: "Cumplido",    color: R.verdeCaminoClaro, borde: R.verdeCamino },
  no_cumplido: { label: "No cumplido", color: R.gris,  borde: R.petroleo },
};
const TIPOS_COMPROMISO = [
  { id: "compromiso", label: "Compromiso de convivencia" },
  { id: "mediacion",  label: "Acuerdo de mediación" },
];
const CATEGORIAS_NOTA = ["Olvido de material", "Despiste puntual", "No trae la tarea", "Cansancio o desánimo", "Mejora o buen día", "Otra"];
const DIAS_ALERTA_TEMPRANA = 14;
// Parte leve exprés: cuatro motivos que llevan a una tipificación del Plan de Convivencia
const MOTIVOS_EXPRES = [
  { id: "interrupcion", label: "Interrupción de clase", icono: "interrupcion", tip: "1L", tipo: "Comportamiento" },
  { id: "respeto", label: "Falta de respeto o de material", icono: "falta-respeto", opciones: [
    { tip: "6L", label: "Falta de respeto", tipo: "Comportamiento" },
    { tip: "2L", label: "Falta de material", tipo: "Académico" },
  ] },
  { id: "movil", label: "Móvil o dispositivos", icono: "movil", tip: "8L", tipo: "Comportamiento" },
  { id: "otros", label: "Otros", icono: "otros", tip: "10L", tipo: "Otro" },
];

const tutorDe = (tutores, curso) => tutores?.[curso]?.tutor || "";
const verCompromiso = (c, usuario, tutores, convivencia) =>
  convivencia || c.creadoPor === usuario || c.alumnos.some(a => tutorDe(tutores, a.curso) === usuario);
// Las notas de aula solo las ven quien la escribe y el tutor/a del alumno (ni Jefatura)
const verNota = (n, usuario, tutores) => n.profesor === usuario || tutorDe(tutores, n.curso) === usuario;

// Asignatura de un parte: la que tiene el profesor a esa hora en su horario; si no consta, su clase
function materiaDeParte(p, horarios = {}) {
  if (p.materia) return p.materia;
  const c = horarios[`${DIAS_ES[new Date(p.ts).getDay()]}|${p.hora}|${p.profesor}`];
  return c?.materia || `Clase de ${p.profesor}`;
}
// Alerta temprana: 2 o más partes leves en asignaturas distintas en los últimos 14 días
function alertaTempranaDe(partesAlumno, horarios, hoy = new Date()) {
  const desde = isoLocal(sumarDias(hoy, -(DIAS_ALERTA_TEMPRANA - 1)));
  const leves = partesAlumno.filter(p => p.gravedad === "leve" && isoLocal(p.ts) >= desde).sort((a, b) => b.ts.localeCompare(a.ts));
  const materias = [...new Set(leves.map(p => materiaDeParte(p, horarios)))];
  return materias.length >= 2 ? { partes: leves, materias } : null;
}
function alertasTempranas({ partes, horarios, tutores, usuario, hoy = new Date() }) {
  const grupos = Object.entries(tutores).filter(([, t]) => t?.tutor === usuario).map(([c]) => c);
  const porAlumno = new Map();
  partes.filter(p => grupos.includes(p.curso)).forEach(p => { const k = p.alumnoId ?? p.alumno; if (!porAlumno.has(k)) porAlumno.set(k, []); porAlumno.get(k).push(p); });
  const lista = [];
  porAlumno.forEach((ps, k) => {
    const a = alertaTempranaDe(ps, horarios, hoy);
    if (a) lista.push({ id: `${k}|${a.partes[0].id}`, alumnoId: ps[0].alumnoId, alumno: ps[0].alumno, curso: ps[0].curso, ...a });
  });
  return lista.sort((a, b) => b.partes[0].ts.localeCompare(a.partes[0].ts));
}

// Buscador de alumnado reutilizable (mismo aspecto que en «Conducta positiva»)
function BuscarAlumno({ alumnos, onElegir, id, placeholder = "Nombre o grupo…", C, inpStyle }) {
  const [busca, setBusca] = useState("");
  const coinciden = busca ? alumnos.filter(a => `${a.nombre} ${a.curso}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 30) : [];
  return (
    <>
      <input id={id} value={busca} onChange={e => setBusca(e.target.value)} placeholder={placeholder} style={{ ...inpStyle, marginBottom: 8 }} />
      {coinciden.length > 0 && (
        <div style={{ border: `3px solid ${R.turquesa}`, background: C.white, maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
          {coinciden.map(a => (
            <button key={a.id} onClick={() => { onElegir(a); setBusca(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", minHeight: 48, padding: "12px 14px", border: "none", borderBottom: `1px solid ${R.turquesaClaro}`, background: "none", cursor: "pointer", fontSize: 16, color: R.noche, fontFamily: "inherit" }}>
              <strong>{a.nombre}</strong> — {a.curso}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
const chipEleccion = (activo, colorActivo = R.azul) => ({ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `2px solid ${activo ? colorActivo : R.turquesaClaro}`, background: activo ? R.azulClaro : "#fff", color: R.noche, fontWeight: activo ? 700 : 400, fontSize: 15, cursor: "pointer", fontFamily: "inherit" });
const NotaSinSancion = ({ children }) => (
  <div style={{ margin: "14px 0 0", padding: "10px 14px", background: R.azulClaro, borderLeft: `5px solid ${R.azul}`, color: R.noche, fontSize: 15, lineHeight: 1.45 }}>{children}</div>
);

const primerGrupo = alumnos => { const c = [...new Set(alumnos.map(a => a.curso))].sort()[0]; return alumnos.filter(a => a.curso === c); };
function compromisosEjemplo(todos, profesores, tutores) {
  const alumnos = primerGrupo(todos);
  if (alumnos.length < 2) return [];
  const hace = d => { const x = new Date(); x.setDate(x.getDate() - d); return x; };
  const al = i => { const a = alumnos[i % alumnos.length]; return { id: a.id, nombre: a.nombre, curso: a.curso }; };
  const tut = i => tutores[al(i).curso]?.tutor || profesores[i % profesores.length];
  return [
    { id: 8800, tipo: "mediacion", alumnos: [al(0), al(1)], mediador: "Equipo de mediación (alumnado de 4º ESO)", acuerdo: "Hablar con respeto en clase y en el recreo. Si surge un problema, acudir al equipo de mediación antes de discutir.", revisar: isoLocal(sumarDias(new Date(), 3)), estado: "en_proceso", creadoPor: tut(0), ts: hace(11).toISOString(), seguimiento: [{ ts: hace(4).toISOString(), por: tut(0), texto: "Primera semana sin incidentes entre ellos." }] },
    { id: 8801, tipo: "compromiso", alumnos: [al(2)], mediador: "", acuerdo: "Traer el material todos los días y apuntar las tareas en la agenda. La familia firma la agenda los viernes.", revisar: isoLocal(sumarDias(new Date(), -1)), estado: "en_proceso", creadoPor: tut(2), ts: hace(15).toISOString(), seguimiento: [] },
    { id: 8802, tipo: "compromiso", alumnos: [al(5)], mediador: "", acuerdo: "Llegar puntual a primera hora durante dos semanas.", revisar: isoLocal(sumarDias(new Date(), -6)), estado: "cumplido", creadoPor: tut(5), ts: hace(24).toISOString(), seguimiento: [{ ts: hace(6).toISOString(), por: tut(5), texto: "Ha llegado puntual todos los días. ¡Bien!" }] },
  ];
}
function notasEjemplo(todos, profesores, tutores) {
  const alumnos = primerGrupo(todos);
  if (!alumnos.length) return [];
  const hace = (d, h) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 20, 0, 0); return x.toISOString(); };
  const datos = [[0, 1, "Olvido de material", "Sin el libro ni el cuaderno de Matemáticas.", 9], [2, 3, "Despiste puntual", "Muy distraído hoy, le cuesta seguir la explicación.", 11], [0, 4, "No trae la tarea", "", 10], [3, 2, "Cansancio o desánimo", "Dice que ha dormido poco. Lo comento con su tutor/a.", 12], [7, 6, "Mejora o buen día", "Participa y ayuda a su compañero de mesa.", 13]];
  return datos.map(([i, d, categoria, texto, h], k) => {
    const a = alumnos[i % alumnos.length];
    const tutor = tutores[a.curso]?.tutor;
    const prof = profesores.filter(p => p !== tutor)[(k * 3) % (profesores.length - 1)];
    return { id: 8900 + k, alumnoId: a.id, alumno: a.nombre, curso: a.curso, profesor: prof, materia: "", categoria, texto, ts: hace(d, h) };
  });
}

// Dos partes leves recientes en asignaturas distintas, para que se vea la alerta temprana
function partesAlertaEjemplo(todos, profesores, tutores) {
  const grupo = primerGrupo(todos), a = grupo[grupo.length - 1];
  if (!a) return [];
  const tutor = tutores[a.curso]?.tutor || "";
  const otros = profesores.filter(p => p !== tutor);
  const hace = (d, h) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 10, 0, 0); return x.toISOString(); };
  const base = { alumnoId: a.id, alumno: a.nombre, curso: a.curso, tutor, tutorEmail: tutores[a.curso]?.email || "", email: a.email, telefono: a.telefono, gravedad: "leve" };
  return [
    { ...base, id: 8990, tipo: "Comportamiento", tipificacion: "8L", descripcion: "Móvil o dispositivos. Usa el móvil en clase sin permiso.", profesor: otros[2], materia: "Inglés", hora: "2ª hora", ts: hace(2, 9), expres: true },
    { ...base, id: 8991, tipo: "Comportamiento", tipificacion: "1L", descripcion: "Interrupción de clase. Interrumpe la explicación con comentarios en voz alta.", profesor: otros[5], materia: "Matemáticas", hora: "4ª hora", ts: hace(6, 12), expres: true },
  ];
}

// ─── Mediación y compromisos ──────────────────────────────────────────────────
function MediacionCompromisos({ alumnos, compromisos, setCompromisos, usuario, tutores = {}, convivencia = false, setMensajes, C, inpStyle, labelStyle }) {
  const [tipo, setTipo] = useState("compromiso");
  const [elegidos, setElegidos] = useState([]);
  const [mediador, setMediador] = useState("");
  const [acuerdo, setAcuerdo] = useState("");
  const [revisar, setRevisar] = useState(isoLocal(sumarDias(new Date(), 14)));
  const [filtro, setFiltro] = useState("en_proceso");
  const [nota, setNota] = useState({});
  const [hecho, setHecho] = useState("");
  const minimo = tipo === "mediacion" ? 2 : 1;
  const listo = elegidos.length >= minimo && acuerdo.trim();
  const registrar = () => {
    if (!listo) return;
    const c = { id: Date.now(), tipo, alumnos: elegidos.map(a => ({ id: a.id, nombre: a.nombre, curso: a.curso })), mediador: mediador.trim(), acuerdo: acuerdo.trim(), revisar, estado: "en_proceso", creadoPor: usuario, ts: new Date().toISOString(), seguimiento: [] };
    setCompromisos(prev => [c, ...prev]);
    // Aviso discreto al tutor/a de cada alumno, si no es quien lo registra
    const tutoresAvisar = [...new Set(c.alumnos.map(a => tutorDe(tutores, a.curso)).filter(t => t && t !== usuario))];
    if (setMensajes && tutoresAvisar.length) setMensajes(prev => [...tutoresAvisar.map((t, k) => mensajeRumbo(t, `🤝 ${usuario} ha registrado un ${TIPOS_COMPROMISO.find(x => x.id === tipo).label.toLowerCase()} con ${c.alumnos.map(a => `${a.nombre} (${a.curso})`).join(", ")}: «${c.acuerdo}». Revisión: ${fmtD(c.revisar)}. No es un parte.`, k)), ...prev]);
    setHecho(`Registrado: ${c.alumnos.map(a => a.nombre).join(", ")}`); setElegidos([]); setMediador(""); setAcuerdo(""); setRevisar(isoLocal(sumarDias(new Date(), 14)));
    setFiltro("en_proceso");
    setTimeout(() => setHecho(""), 4000);
  };
  const cambiar = (id, cambios) => setCompromisos(prev => prev.map(c => c.id === id ? { ...c, ...cambios } : c));
  const cambiarEstado = (c, estado) => cambiar(c.id, { estado, seguimiento: [...(c.seguimiento || []), { ts: new Date().toISOString(), por: usuario, texto: `Estado: ${ESTADOS_COMPROMISO[estado].label}` }] });
  const anadirNota = c => { const t = (nota[c.id] || "").trim(); if (!t) return; cambiar(c.id, { seguimiento: [...(c.seguimiento || []), { ts: new Date().toISOString(), por: usuario, texto: t }] }); setNota(v => ({ ...v, [c.id]: "" })); };
  const visibles = compromisos.filter(c => verCompromiso(c, usuario, tutores, convivencia)).sort((a, b) => (a.revisar || "").localeCompare(b.revisar || ""));
  const filtrados = visibles.filter(c => !filtro || c.estado === filtro);
  const hoy = isoLocal();
  return (
    <div>
      <TituloBloque titulo="Mediación y compromisos" sub="Acuerdos con el alumnado y su seguimiento, sin partes ni sanciones" icono="compromiso" />
      <NotaSinSancion><Ic n="compromiso" tam={26} />Un compromiso o una mediación <b>no es un parte</b>: no cuenta para los avisos a familias ni genera medidas correctoras. Lo ven quien lo registra, el tutor/a de cada alumno y Jefatura y Orientación.</NotaSinSancion>
      {hecho && <div role="status" style={{ margin: "14px 0 0", padding: "10px 14px", background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
      <Card style={{ background: R.azulClaro, border: "none", marginTop: 16 }}>
        <div style={labelStyle}>¿Qué quieres registrar?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {TIPOS_COMPROMISO.map(t => <button key={t.id} aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)} style={chipEleccion(tipo === t.id)}>{tipo === t.id ? "✓ " : ""}{t.label}</button>)}
        </div>
        <label htmlFor="gd-comp-busca" style={labelStyle}><ConIcono texto={tipo === "mediacion" ? "🔍 Alumnos que participan (dos o más)" : "🔍 Alumno o alumna"} tam={30} /></label>
        <BuscarAlumno id="gd-comp-busca" alumnos={alumnos.filter(a => !elegidos.some(e => e.id === a.id))} onElegir={a => setElegidos(v => [...v, a])} C={C} inpStyle={inpStyle} />
        {elegidos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {elegidos.map(a => (
              <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `2px solid ${R.azul}`, borderRadius: 22, padding: "4px 4px 4px 12px", fontSize: 15, color: R.noche }}>
                {a.nombre} — {a.curso}
                <button onClick={() => setElegidos(v => v.filter(x => x.id !== a.id))} aria-label={`Quitar a ${a.nombre}`} style={{ minWidth: 36, minHeight: 36, border: "none", borderRadius: "50%", background: R.gris, cursor: "pointer", fontSize: 16 }}>✕</button>
              </span>
            ))}
          </div>
        )}
        {tipo === "mediacion" && (<>
          <label htmlFor="gd-comp-mediador" style={labelStyle}>Quién media (opcional)</label>
          <input id="gd-comp-mediador" value={mediador} onChange={e => setMediador(e.target.value)} placeholder="Por ejemplo: equipo de mediación, Orientación…" style={{ ...inpStyle, marginBottom: 12 }} />
        </>)}
        <label htmlFor="gd-comp-acuerdo" style={labelStyle}>Acuerdo</label>
        <textarea id="gd-comp-acuerdo" value={acuerdo} onChange={e => setAcuerdo(e.target.value)} rows={3} placeholder={tipo === "mediacion" ? "Qué se comprometen a hacer las partes." : "Qué se compromete a hacer el alumno o la alumna."} style={{ ...inpStyle, marginBottom: 12, resize: "vertical" }} />
        <label htmlFor="gd-comp-revisar" style={labelStyle}>Revisar el</label>
        <input id="gd-comp-revisar" type="date" value={revisar} onChange={e => setRevisar(e.target.value)} style={{ ...inpStyle, marginBottom: 12 }} />
        <Btn onClick={registrar} disabled={!listo} style={{ width: "100%", minHeight: 52 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="compromiso" tam={30} />Registrar</span></Btn>
        {!listo && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}>{elegidos.length < minimo ? (minimo === 2 ? "Elige al menos dos alumnos." : "Elige al alumno o alumna.") : "Escribe el acuerdo."}</div>}
      </Card>
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, color: R.petroleo, fontSize: 18, flex: "1 1 auto" }}>Seguimiento ({filtrados.length})</h3>
          {[["en_proceso", "En proceso"], ["cumplido", "Cumplidos"], ["no_cumplido", "No cumplidos"], ["", "Todos"]].map(([id, l]) => (
            <button key={id || "todos"} aria-pressed={filtro === id} onClick={() => setFiltro(id)} style={chipEleccion(filtro === id)}>{l} ({id ? visibles.filter(c => c.estado === id).length : visibles.length})</button>
          ))}
        </div>
        {filtrados.length === 0 && <p style={{ color: R.petroleo, margin: 0 }}>No hay ninguno{filtro ? " en este estado" : ""}.</p>}
        {filtrados.map(c => {
          const e = ESTADOS_COMPROMISO[c.estado];
          const tocaRevisar = c.estado === "en_proceso" && c.revisar && c.revisar <= hoy;
          return (
            <div key={c.id} data-compromiso={c.id} style={{ border: `1px solid ${R.turquesaClaro}`, borderLeft: `10px solid ${e.borde}`, padding: 12, marginBottom: 10, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, color: R.noche, fontSize: 16 }}>{c.alumnos.map(a => `${a.nombre} (${a.curso})`).join(" · ")}</div>
                <span style={{ background: e.color, border: `1px solid ${e.borde}`, borderRadius: 4, padding: "2px 10px", fontSize: 14, fontWeight: 700, color: R.noche, whiteSpace: "nowrap" }}>{e.label}</span>
              </div>
              <div style={{ fontSize: 14, color: R.petroleo, marginTop: 2 }}>{TIPOS_COMPROMISO.find(t => t.id === c.tipo)?.label}{c.mediador ? ` · media: ${c.mediador}` : ""} · {c.creadoPor} · {fmtD(c.ts)}</div>
              <div style={{ fontSize: 15, color: R.noche, margin: "6px 0" }}>«{c.acuerdo}»</div>
              <div style={{ fontSize: 14, color: tocaRevisar ? R.noche : R.petroleo, fontWeight: tocaRevisar ? 700 : 400 }}>{tocaRevisar ? "⏰ Toca revisarlo: " : "Revisión: "}{c.revisar ? fmtD(c.revisar) : "sin fecha"}</div>
              {(c.seguimiento || []).length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14, color: R.petroleo }}>
                  {c.seguimiento.map((s, i) => <li key={i}>{fmtD(s.ts)} · {s.por}: {s.texto}</li>)}
                </ul>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {Object.entries(ESTADOS_COMPROMISO).map(([id, x]) => (
                  <button key={id} aria-pressed={c.estado === id} onClick={() => c.estado !== id && cambiarEstado(c, id)} style={chipEleccion(c.estado === id, x.borde)}>{c.estado === id ? "✓ " : ""}{x.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input aria-label={`Anotar seguimiento de ${c.alumnos.map(a => a.nombre).join(" y ")}`} value={nota[c.id] || ""} onChange={ev => setNota(v => ({ ...v, [c.id]: ev.target.value }))} onKeyDown={ev => ev.key === "Enter" && anadirNota(c)} placeholder="Anotar cómo va…" style={{ ...inpStyle, flex: 1, minWidth: 0, marginBottom: 0 }} />
                <button onClick={() => anadirNota(c)} disabled={!(nota[c.id] || "").trim()} style={{ minHeight: 44, padding: "0 14px", border: `2px solid ${R.azul}`, borderRadius: 6, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer" }}>Anotar</button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ─── Notas de aula: bitácora sin carga disciplinaria ──────────────────────────
function NotasAula({ alumnos, notas, setNotas, usuario, tutores = {}, horarios = {}, C, inpStyle, labelStyle }) {
  const [al, setAl] = useState(null);
  const [categoria, setCategoria] = useState("");
  const [texto, setTexto] = useState("");
  const [hecho, setHecho] = useState("");
  const guardar = () => {
    if (!al || !categoria) return;
    const ahora = new Date(), hora = horaEnCurso(ahora);
    const materia = hora ? horarios[`${DIAS_ES[ahora.getDay()]}|${hora}|${usuario}`]?.materia || "" : "";
    setNotas(prev => [{ id: Date.now(), alumnoId: al.id, alumno: al.nombre, curso: al.curso, profesor: usuario, materia, categoria, texto: texto.trim(), ts: ahora.toISOString() }, ...prev]);
    setHecho(`Nota guardada: ${categoria} · ${al.nombre}`); setAl(null); setCategoria(""); setTexto("");
    setTimeout(() => setHecho(""), 4000);
  };
  const visibles = notas.filter(n => verNota(n, usuario, tutores)).sort((a, b) => b.ts.localeCompare(a.ts));
  const mias = visibles.filter(n => n.profesor === usuario);
  const deTutoria = visibles.filter(n => n.profesor !== usuario);
  const fila = n => (
    <div key={n.id} data-nota={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 15, color: R.noche }}>
      <div><strong>{n.alumno}</strong> — {n.curso}<div style={{ color: R.petroleo, fontWeight: 700 }}><Ic n="notas-aula" tam={22} />{n.categoria}</div>{n.texto && <div style={{ color: C.gray, fontSize: 14 }}>{n.texto}</div>}<div style={{ color: C.gray, fontSize: 13 }}>{fmt(n.ts)}{n.profesor !== usuario ? ` · ${n.profesor}` : ""}{n.materia ? ` · ${n.materia}` : ""}</div></div>
      {n.profesor === usuario && <button onClick={() => setNotas(prev => prev.filter(y => y.id !== n.id))} aria-label={`Borrar la nota de ${n.alumno}`} style={{ minHeight: 44, padding: "0 12px", border: `1px solid ${R.turquesaClaro}`, borderRadius: 6, background: "#fff", color: R.petroleo, cursor: "pointer", flexShrink: 0 }}>Borrar</button>}
    </div>
  );
  return (
    <div>
      <TituloBloque titulo="Notas de aula" sub="Apuntes del día a día, sin carga disciplinaria" icono="notas-aula" />
      <NotaSinSancion><Ic n="privado" tam={26} />Solo las ves <b>tú y el tutor/a</b> del alumno. <b>No son partes</b>: no cuentan para avisos ni medidas. Sirven para el seguimiento y salen en el resumen de tutoría.</NotaSinSancion>
      {hecho && <div role="status" style={{ margin: "14px 0 0", padding: "10px 14px", background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
      <Card style={{ background: R.azulClaro, border: "none", marginTop: 16 }}>
        <label htmlFor="gd-nota-busca" style={labelStyle}><ConIcono texto="🔍 Alumno o alumna" tam={30} /></label>
        {al
          ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "#fff", border: `2px solid ${R.azul}`, padding: "8px 12px", marginBottom: 12, fontSize: 16, color: R.noche }}><span><strong>{al.nombre}</strong> — {al.curso}</span><button onClick={() => setAl(null)} style={{ minHeight: 40, padding: "0 12px", border: `1px solid ${R.turquesaClaro}`, borderRadius: 6, background: "#fff", cursor: "pointer" }}>Cambiar</button></div>
          : <BuscarAlumno id="gd-nota-busca" alumnos={alumnos} onElegir={setAl} C={C} inpStyle={inpStyle} />}
        <div style={labelStyle}>¿Qué ha pasado?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {CATEGORIAS_NOTA.map(t => <button key={t} aria-pressed={categoria === t} onClick={() => setCategoria(t)} style={chipEleccion(categoria === t)}>{categoria === t ? "✓ " : ""}{t}</button>)}
        </div>
        <label htmlFor="gd-nota-texto" style={labelStyle}>Detalle (opcional)</label>
        <input id="gd-nota-texto" value={texto} onChange={e => setTexto(e.target.value)} maxLength={200} placeholder="Una frase basta." style={{ ...inpStyle, marginBottom: 12 }} />
        <Btn onClick={guardar} disabled={!al || !categoria} style={{ width: "100%", minHeight: 52 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="notas-aula" tam={30} />Guardar nota</span></Btn>
      </Card>
      <Card>
        <h3 style={{ marginTop: 0, color: R.petroleo, fontSize: 18 }}>Mis notas ({mias.length})</h3>
        {mias.length === 0 ? <p style={{ color: R.petroleo, margin: 0 }}>Todavía no has escrito ninguna.</p> : mias.map(fila)}
      </Card>
      {deTutoria.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, color: R.petroleo, fontSize: 18 }}>Notas del profesorado sobre tu tutoría ({deTutoria.length})</h3>
          {deTutoria.map(fila)}
        </Card>
      )}
    </div>
  );
}

// ─── Resumen de tutoría en un clic ────────────────────────────────────────────
function trimestresDelCurso(hoy = new Date()) {
  const y = hoy.getMonth() >= 8 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  return [trimestreDe(new Date(y, 9, 1)), trimestreDe(new Date(y + 1, 1, 1)), trimestreDe(new Date(y + 1, 4, 1))];
}
function datosResumenTutoria({ alumno, periodo, partes, positivas, medidas, notas, compromisos }) {
  const enP = ts => { const f = isoLocal(ts); return f >= periodo.desde && f <= periodo.hasta; };
  const delAl = x => x.alumnoId === alumno.id;
  return {
    positivas: positivas.filter(x => delAl(x) && enP(x.ts)).sort((a, b) => a.ts.localeCompare(b.ts)),
    partes: partes.filter(x => delAl(x) && enP(x.ts)).sort((a, b) => a.ts.localeCompare(b.ts)),
    medidas: medidas.filter(x => delAl(x) && enP(x.ts)),
    notas: notas.filter(x => delAl(x) && enP(x.ts)).sort((a, b) => a.ts.localeCompare(b.ts)),
    compromisos: compromisos.filter(c => c.alumnos.some(a => a.id === alumno.id) && (enP(c.ts) || c.estado === "en_proceso")),
  };
}
function pdfResumenTutoria(alumno, periodo, d, tutor) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, "Resumen de tutoría", `${alumno.nombre} · ${alumno.curso} · ${periodo.texto}`);
  const tabla = (titulo, head, body) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`${titulo} (${body.length})`, 14, y + 4);
    if (!body.length) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Nada en este periodo.", 14, y + 10); y += 16; return; }
    autoTable(doc, { ...estiloTabla, startY: y + 7, head: [head], body: body.map(r => r.map(sinEmoji)) });
    y = doc.lastAutoTable.finalY + 6;
  };
  tabla("Conductas positivas", ["Fecha", "Conducta", "Profesor/a", "Detalle"], d.positivas.map(x => [fmtD(x.ts), x.tipo, x.profesor, x.detalle || ""]));
  tabla("Partes", ["Fecha", "Gravedad", "Tipificación", "Profesor/a", "Descripción"], d.partes.map(p => [fmtD(p.ts), GRAVEDAD.find(g => g.id === p.gravedad)?.label || p.gravedad, etiquetaTip(p), p.profesor, p.descripcion]));
  tabla("Medidas correctoras", ["Medida", "Estado", "Puesta por"], d.medidas.map(m => [tipoMedida(m.tipo).label, ESTADO_MEDIDA[estadoMedida(m)].label, m.puestaPor || ""]));
  tabla("Notas de observación", ["Fecha", "Nota", "Profesor/a", "Detalle"], d.notas.map(n => [fmtD(n.ts), n.categoria, n.profesor, n.texto || ""]));
  tabla("Compromisos y mediaciones", ["Desde", "Tipo", "Acuerdo", "Estado"], d.compromisos.map(c => [fmtD(c.ts), TIPOS_COMPROMISO.find(t => t.id === c.tipo)?.label || "", c.acuerdo, ESTADOS_COMPROMISO[c.estado].label]));
  firmasPDF(doc, y, [{ cargo: "El tutor/a", nombre: tutor }]);
  guardarPDF(doc, `resumen-tutoria-${nombreArchivo(alumno.nombre)}-${periodo.clave}.pdf`);
}
function ResumenTutoria({ alumnos, partes, positivas, medidas, notas, compromisos, usuario, tutores = {}, horarios = {}, alertasVistas = {}, setAlertasVistas, C, selStyle, labelStyle }) {
  const grupos = Object.entries(tutores).filter(([, t]) => t?.tutor === usuario).map(([c]) => c).sort();
  const misAlumnos = alumnos.filter(a => grupos.includes(a.curso)).sort((a, b) => a.curso.localeCompare(b.curso) || a.nombre.localeCompare(b.nombre));
  const tris = trimestresDelCurso();
  const [alumnoId, setAlumnoId] = useState("");
  const [triClave, setTriClave] = useState(trimestreDe().clave);
  const periodo = tris.find(t => t.clave === triClave) || trimestreDe();
  const alumno = misAlumnos.find(a => String(a.id) === String(alumnoId));
  const alertas = alertasTempranas({ partes, horarios, tutores, usuario });
  const pendientes = alertas.filter(a => !alertasVistas[a.id]);
  const d = alumno ? datosResumenTutoria({ alumno, periodo, partes, positivas, medidas, notas: notas.filter(n => verNota(n, usuario, tutores)), compromisos }) : null;
  const bloque = (icono, titulo, lista, color, pinta, vacio = "Nada en este periodo.") => (
    <div style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, borderTop: `6px solid ${color}`, padding: 12 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 17, color: R.noche, display: "flex", alignItems: "center", gap: 8 }}><Icono nombre={icono} tam={30} />{titulo} ({lista.length})</h3>
      {lista.length === 0 ? <div style={{ fontSize: 14, color: R.petroleo }}>{vacio}</div> : <div style={{ display: "grid", gap: 6 }}>{lista.map(pinta)}</div>}
    </div>
  );
  const linea = (key, principal, sec) => <div key={key} style={{ fontSize: 14, color: R.noche, lineHeight: 1.4 }}><strong>{principal}</strong>{sec ? <span style={{ color: R.petroleo }}> · {sec}</span> : null}</div>;
  return (
    <div>
      <TituloBloque titulo="Resumen de tutoría" sub="Todo lo del trimestre de un alumno, en una sola vista y en PDF" icono="resumen-tutoria" />
      {alertas.length > 0 && (
        <div data-alerta-temprana style={{ marginTop: 14, background: R.crema, borderLeft: `6px solid ${R.mostaza}`, padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, color: R.noche, fontSize: 16 }}><Ic n="alertas" tam={26} />Alerta temprana{pendientes.length ? ` · ${pendientes.length} nueva(s)` : ""}</div>
          <div style={{ fontSize: 14, color: R.petroleo, margin: "2px 0 8px" }}>Alumnado de tu tutoría con 2 o más partes leves en asignaturas distintas en los últimos {DIAS_ALERTA_TEMPRANA} días. Es un aviso para prevenir, no una sanción.</div>
          {alertas.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${R.mostaza}` }}>
              <div style={{ fontSize: 15, color: R.noche }}><strong>{a.alumno}</strong> — {a.curso} · {a.partes.length} partes leves en {a.materias.join(", ")}{alertasVistas[a.id] ? " · vista" : ""}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAlumnoId(String(a.alumnoId))} style={{ minHeight: 44, padding: "0 12px", border: `2px solid ${R.azul}`, borderRadius: 6, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer" }}>Ver resumen</button>
                {!alertasVistas[a.id] && <button onClick={() => setAlertasVistas(v => ({ ...v, [a.id]: new Date().toISOString() }))} style={{ minHeight: 44, padding: "0 12px", border: `1px solid ${R.turquesaClaro}`, borderRadius: 6, background: "#fff", color: R.petroleo, cursor: "pointer" }}>Visto</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Card style={{ background: R.azulClaro, border: "none", marginTop: 16 }}>
        <div className="gd-rejilla-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <label htmlFor="gd-resumen-alumno" style={labelStyle}><Ic n="por-alumno" tam={24} />Alumno o alumna</label>
            <select id="gd-resumen-alumno" value={alumnoId} onChange={e => setAlumnoId(e.target.value)} style={selStyle}>
              <option value="">— Elige de tu tutoría —</option>
              {misAlumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} — {a.curso}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gd-resumen-tri" style={labelStyle}><Ic n="fecha" tam={24} />Trimestre</label>
            <select id="gd-resumen-tri" value={triClave} onChange={e => setTriClave(e.target.value)} style={selStyle}>
              {tris.map(t => <option key={t.clave} value={t.clave}>{t.n}º trimestre</option>)}
            </select>
          </div>
        </div>
      </Card>
      {alumno && d && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div><div style={{ fontWeight: 700, fontSize: 18, color: R.noche }}>{alumno.nombre} — {alumno.curso}</div><div style={{ fontSize: 14, color: R.petroleo }}>{periodo.texto}</div></div>
            <Btn onClick={() => pdfResumenTutoria(alumno, periodo, d, usuario)} style={{ minHeight: 48 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="informe" tam={30} />Descargar PDF</span></Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {bloque("estrella", "Conductas positivas", d.positivas, R.verdeCamino, x => linea(x.id, x.tipo, `${fmtD(x.ts)} · ${x.profesor}${x.detalle ? ` — ${x.detalle}` : ""}`))}
            {bloque("partes", "Partes", d.partes, R.mostaza, p => linea(p.id, `${fmtD(p.ts)} · ${GRAVEDAD.find(g => g.id === p.gravedad)?.label || p.gravedad}`, `${etiquetaTip(p) || p.tipo} · ${p.profesor}`))}
            {bloque("tipificacion", "Medidas correctoras", d.medidas, R.azul, m => <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, color: R.noche }}><strong>{tipoMedida(m.tipo).label}</strong><ChipMedida m={m} /></div>)}
            {bloque("notas-aula", "Notas de observación", d.notas, R.turquesa, n => linea(n.id, n.categoria, `${fmtD(n.ts)} · ${n.profesor}${n.texto ? ` — ${n.texto}` : ""}`))}
            {bloque("compromiso", "Compromisos y mediaciones", d.compromisos, R.morado, c => linea(c.id, ESTADOS_COMPROMISO[c.estado].label, `«${c.acuerdo}»`))}
          </div>
        </Card>
      )}
      {!misAlumnos.length && <Card><p style={{ margin: 0, color: R.petroleo }}>No tienes ninguna tutoría asignada.</p></Card>}
    </div>
  );
}

// ─── Parte leve exprés: pestaña propia; genera un parte leve como los demás ───
function ParteExpres({ alumnos, usuario, tutores = {}, horarios = {}, onCrear, medidas, setMedidas, C, inpStyle, labelStyle }) {
  const [al, setAl] = useState(null);
  const [motivo, setMotivo] = useState(null); // { motivo, tip, tipo, label }
  const [obs, setObs] = useState("");
  const [hora, setHora] = useState(() => horaEnCurso() || HORAS[0]);
  const [hecho, setHecho] = useState(null);
  const listo = al && motivo?.tip && !(motivo.motivo === "otros" && !obs.trim());
  const generar = () => {
    if (!listo) return;
    const ahora = new Date(), o = obs.trim();
    const materia = horarios[`${DIAS_ES[ahora.getDay()]}|${hora}|${usuario}`]?.materia || "";
    const p = { id: ahora.getTime(), alumnoId: al.id, alumno: al.nombre, curso: al.curso, tutor: tutorDeGrupo(tutores, alumnos, al.curso) || al.tutor || "", tutorEmail: tutores[al.curso]?.email || "", email: al.email, telefono: al.telefono,
      tipo: motivo.tipo, gravedad: "leve", tipificacion: motivo.tip, descripcion: o ? `${motivo.label}. ${o}` : `${motivo.label}.`, profesor: usuario, hora, ...(materia ? { materia } : {}), expres: true, ts: ahora.toISOString() };
    onCrear(p);
    setHecho(p); setAl(null); setMotivo(null); setObs("");
  };
  return (
    <div>
      <TituloBloque titulo="Parte leve exprés" sub="Un parte leve en segundos: alumno, motivo y listo" icono="parte-expres" />
      {hecho && (
        <Card style={{ ...caja(R.verde), borderRadius: 0, boxShadow: "none", marginTop: 16 }}>
          <strong style={{ color: R.petroleo, fontSize: 16 }}>✅ Parte generado · {hecho.alumno} — {hecho.curso} · {fmt(hecho.ts)}</strong>
          <div style={{ fontSize: 15, color: R.petroleo, marginTop: 4 }}>{TIPIFICACION.leve.find(t => t.id === hecho.tipificacion)?.label}</div>
          <MedidasDeParte key={hecho.id} parte={hecho} medidas={medidas} setMedidas={setMedidas} esJefatura={false} usuario={usuario} />
          <ComoAvisar parte={hecho} />
        </Card>
      )}
      <Card style={{ background: R.azulClaro, border: "none", marginTop: 16 }}>
        <label htmlFor="gd-expres-busca" style={labelStyle}><ConIcono texto="🔍 Alumno o alumna" tam={30} /></label>
        {al
          ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "#fff", border: `2px solid ${R.azul}`, padding: "8px 12px", marginBottom: 12, fontSize: 16, color: R.noche }}><span><strong>{al.nombre}</strong> — {al.curso}</span><button onClick={() => setAl(null)} style={{ minHeight: 40, padding: "0 12px", border: `1px solid ${R.turquesaClaro}`, borderRadius: 6, background: "#fff", cursor: "pointer" }}>Cambiar</button></div>
          : <BuscarAlumno id="gd-expres-busca" alumnos={alumnos} onElegir={a => { setAl(a); setHecho(null); }} C={C} inpStyle={inpStyle} />}
        <div style={labelStyle}>Motivo</div>
        <div data-parte-expres style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {MOTIVOS_EXPRES.map(m => {
            const activo = motivo?.motivo === m.id;
            return (
              <button key={m.id} className="gd-pulsable" aria-pressed={activo}
                onClick={() => setMotivo(m.opciones ? { motivo: m.id, tip: "", tipo: "", label: "" } : { motivo: m.id, tip: m.tip, tipo: m.tipo, label: m.label })}
                style={{ minHeight: 72, padding: "8px 10px", borderRadius: 8, border: `3px solid ${activo ? R.azul : R.turquesaClaro}`, background: activo ? "#fff" : "#fff", boxShadow: activo ? `inset 0 0 0 2px ${R.azul}` : "none", color: R.noche, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", lineHeight: 1.25 }}>
                <Icono nombre={m.icono} tam={40} />{m.label}
              </button>
            );
          })}
        </div>
        {motivo?.motivo === "respeto" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {MOTIVOS_EXPRES.find(m => m.id === "respeto").opciones.map(o => (
              <button key={o.tip} aria-pressed={motivo.tip === o.tip} onClick={() => setMotivo({ motivo: "respeto", tip: o.tip, tipo: o.tipo, label: o.label })} style={chipEleccion(motivo.tip === o.tip)}>{motivo.tip === o.tip ? "✓ " : ""}{o.label}</button>
            ))}
          </div>
        )}
        {motivo?.tip && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}><Ic n="tipificacion" tam={22} />{TIPIFICACION.leve.find(t => t.id === motivo.tip)?.label}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 10, marginTop: 12 }}>
          <div>
            <label htmlFor="gd-expres-obs" style={labelStyle}>Observaciones {motivo?.motivo === "otros" ? "" : "(opcional)"}</label>
            <input id="gd-expres-obs" value={obs} onChange={e => setObs(e.target.value)} maxLength={200} placeholder={motivo?.motivo === "otros" ? "Qué ha pasado, en una frase" : "Una frase, si hace falta"} style={{ ...inpStyle, marginBottom: 0 }} />
          </div>
          <div>
            <label htmlFor="gd-expres-hora" style={labelStyle}>Hora</label>
            <select id="gd-expres-hora" value={hora} onChange={e => setHora(e.target.value)} style={{ ...inpStyle, marginBottom: 0 }}>{HORAS.map(h => <option key={h}>{h}</option>)}</select>
          </div>
        </div>
        <Btn onClick={generar} disabled={!listo} style={{ width: "100%", minHeight: 52, marginTop: 14 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icono nombre="parte-expres" tam={30} />Generar parte leve</span></Btn>
        {!listo && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}>{!al ? "Busca primero al alumno o alumna." : !motivo?.tip ? (motivo?.motivo === "respeto" ? "Elige si es falta de respeto o de material." : "Toca el motivo.") : "Escribe qué ha pasado."}</div>}
        <div style={{ fontSize: 14, color: R.petroleo, marginTop: 10 }}>Es un parte leve como los de «Nuevo Parte»: sale en Mis partes, en Jefatura y en los avisos a familias. Para un parte grave o con más detalle, usa «Nuevo Parte».</div>
      </Card>
    </div>
  );
}

// ─── Jefatura: reparto de coberturas y ausencias de un mes o del curso ───────
function datosResumenGuardias({ profesores, ausencias, coberturas, propias, desde, hasta }) {
  const dentro = f => f >= desde && f <= hasta;
  const cob = Object.entries(coberturas).filter(([k]) => dentro(k.slice(0, 10)));
  const reparto = profesores.map(p => {
    const mias = cob.filter(([, x]) => x === p);
    return { profesor: p, cubiertas: mias.length, propias: mias.filter(([k]) => esPropia(k, coberturas, propias)).length,
      ultima: mias.map(([k]) => k.slice(0, 10)).sort().pop() || "" };
  }).sort((a, b) => b.cubiertas - a.cubiertas || a.profesor.localeCompare(b.profesor, "es"));
  const ausPeriodo = ausencias.filter(a => dentro(isoLocal(a.fecha)));
  const clasesDe = a => a.horas.filter(h => h !== "Recreo");
  const cubiertaA = (a, h) => !!coberturas[claveCob(isoLocal(a.fecha), h, a.id)];
  const porProfesor = Object.values(ausPeriodo.reduce((acc, a) => {
    const r = acc[a.profesor] || (acc[a.profesor] = { profesor: a.profesor, ausencias: 0, horas: 0, clases: 0, cubiertas: 0, motivos: {} });
    r.ausencias++; r.horas += a.horas.length; r.clases += clasesDe(a).length; r.cubiertas += clasesDe(a).filter(h => cubiertaA(a, h)).length;
    r.motivos[a.motivo || "Sin motivo"] = (r.motivos[a.motivo || "Sin motivo"] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b.horas - a.horas || a.profesor.localeCompare(b.profesor, "es"));
  const porMotivo = Object.entries(ausPeriodo.reduce((acc, a) => { const m = a.motivo || "Sin motivo"; acc[m] = (acc[m] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const clases = porProfesor.reduce((n, r) => n + r.clases, 0), cubiertas = porProfesor.reduce((n, r) => n + r.cubiertas, 0);
  return { reparto, porProfesor, porMotivo, totalCob: cob.length, ausencias: ausPeriodo.length, clases, cubiertas,
    media: profesores.length ? cob.length / profesores.length : 0 };
}
const motivosTxt = m => Object.entries(m).map(([k, n]) => n > 1 ? `${k} (${n})` : k).join(", ");

function pdfResumenGuardias(d, periodoTxt) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, "Coberturas y ausencias", `${periodoTxt} · Jefatura de Estudios`);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...OSCURO);
  doc.text(`${d.totalCob} clases cubiertas · ${d.ausencias} ausencias · ${d.cubiertas} de ${d.clases} clases sin profesor cubiertas`, 14, y);
  autoTable(doc, { ...estiloTabla, startY: y + 4, head: [["Profesor/a", "Clases cubiertas", "Se las asignó", "Última"]],
    body: d.reparto.map(r => [r.profesor, String(r.cubiertas), String(r.propias), r.ultima ? fmtD(parseISO(r.ultima)) : "-"].map(sinEmoji)),
    columnStyles: { 1: { halign: "center", cellWidth: 34 }, 2: { halign: "center", cellWidth: 30 }, 3: { cellWidth: 30 } } });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text("Ausencias por profesor/a", 14, y);
  autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Profesor/a", "Ausencias", "Horas", "Clases cubiertas", "Motivos"]],
    body: d.porProfesor.length ? d.porProfesor.map(r => [r.profesor, String(r.ausencias), String(r.horas), `${r.cubiertas} de ${r.clases}`, motivosTxt(r.motivos)].map(sinEmoji)) : [["Sin ausencias en este periodo", "", "", "", ""]],
    columnStyles: { 1: { halign: "center", cellWidth: 28 }, 2: { halign: "center", cellWidth: 20 }, 3: { halign: "center", cellWidth: 30 } } });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text("Ausencias por motivo", 14, y);
  autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Motivo", "Ausencias"]], body: d.porMotivo.length ? d.porMotivo.map(([k, n]) => [k, String(n)]) : [["-", "0"]],
    columnStyles: { 1: { halign: "center", cellWidth: 30 } } });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text("Documento interno del centro. Las ausencias oficiales se tramitan por la vía establecida (Raíces).", 14, doc.lastAutoTable.finalY + 6);
  guardarPDF(doc, `coberturas-ausencias-${periodoTxt.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, "-")}.pdf`);
}

function ResumenGuardias({ profesores, ausencias = [], coberturas = {}, propias = {}, C }) {
  const hoy = isoLocal(new Date());
  const [mes, setMes] = useState(hoy.slice(0, 7)); // "" = todo el curso
  const desde = mes ? `${mes}-01` : inicioCurso(hoy);
  const hasta = mes ? `${mes}-31` : hoy;
  const nombreMes = m => { const t = parseISO(`${m}-01`).toLocaleDateString("es-ES", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const periodoTxt = mes ? nombreMes(mes) : `Curso ${desde.slice(0, 4)}-${Number(desde.slice(0, 4)) + 1} (hasta hoy)`;
  const d = datosResumenGuardias({ profesores, ausencias, coberturas, propias, desde, hasta });
  const max = Math.max(1, ...d.reparto.map(r => r.cubiertas));
  const meses = (() => { const l = [], [a, m] = inicioCurso(hoy).split("-").map(Number); for (let i = 0; i < 12; i++) { const mm = ((m - 1 + i) % 12) + 1, aa = a + Math.floor((m - 1 + i) / 12), k = `${aa}-${String(mm).padStart(2, "0")}`; if (k > hoy.slice(0, 7)) break; l.push(k); } return l.reverse(); })();
  const tarjeta = { background: C.white, borderRadius: 12, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 14 };
  const th = { textAlign: "left", padding: "8px 10px", background: R.gris, color: R.noche, fontSize: 14, whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${R.gris}`, fontSize: 14, color: R.noche, verticalAlign: "top" };
  return (
    <div>
      <TituloBloque titulo="Coberturas y ausencias" sub="Reparto de las clases cubiertas y ausencias del profesorado" icono="estadisticas" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", margin: "16px 0 14px" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Periodo
          <select id="gd-resumen-mes" value={mes} onChange={e => setMes(e.target.value)} style={{ minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 4, fontSize: 16, color: R.noche, background: "#fff" }}>
            {meses.map(m => <option key={m} value={m}>{nombreMes(m)}</option>)}
            <option value="">Todo el curso</option>
          </select>
        </label>
        <button onClick={() => pdfResumenGuardias(d, periodoTxt)} style={{ minHeight: 44, padding: "0 16px", border: "none", borderRadius: 6, background: R.azul, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Descargar PDF</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
        {[["Clases cubiertas", d.totalCob, R.morado], ["Media por profesor/a", d.media.toLocaleString("es-ES", { maximumFractionDigits: 1 }), R.morado], ["Ausencias", d.ausencias, R.azul], ["Clases sin profesor cubiertas", `${d.cubiertas} de ${d.clases}`, R.verdeCamino]].map(([t, v, col]) => (
          <div key={t} data-total={t} style={{ background: C.white, borderRadius: 10, padding: 12, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${col}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.dark }}>{v}</div>
            <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={tarjeta}>
        <div style={{ fontWeight: 800, color: C.dark, fontSize: 15, marginBottom: 4 }}><Ic n="profe-ausente" tam={22} />Reparto de coberturas · {periodoTxt}</div>
        <div style={{ fontSize: 13, color: C.gray, marginBottom: 10 }}>Sirve para que el reparto sea equilibrado: al proponer quién cubre, la app da prioridad a quien ha cubierto menos en el curso.</div>
        <div style={{ overflowX: "auto" }}>
          <table data-tabla="reparto" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Profesor/a</th><th style={{ ...th, width: "40%" }}>Clases cubiertas</th><th style={th}>Se las asignó</th><th style={th}>Última</th></tr></thead>
            <tbody>{d.reparto.map(r => (
              <tr key={r.profesor} data-profesor={r.profesor}>
                <td style={td}>{r.profesor}</td>
                <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div aria-hidden="true" style={{ height: 10, borderRadius: 5, background: R.morado, width: `${(r.cubiertas / max) * 100}%`, minWidth: r.cubiertas ? 6 : 0 }} />
                  <strong>{r.cubiertas}</strong></div></td>
                <td style={td}>{r.propias || "-"}</td>
                <td style={td}>{r.ultima ? fmtD(parseISO(r.ultima)) : "-"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div style={tarjeta}>
        <div style={{ fontWeight: 800, color: C.dark, fontSize: 15, marginBottom: 10 }}><Ic n="fecha" tam={22} />Ausencias del profesorado · {periodoTxt}</div>
        {d.porProfesor.length === 0 ? <div style={{ padding: 16, textAlign: "center", color: C.gray, fontSize: 14 }}>No hay ausencias en este periodo.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table data-tabla="ausencias" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Profesor/a</th><th style={th}>Ausencias</th><th style={th}>Horas</th><th style={th}>Clases cubiertas</th><th style={th}>Motivos</th></tr></thead>
              <tbody>{d.porProfesor.map(r => (
                <tr key={r.profesor}>
                  <td style={td}>{r.profesor}</td><td style={td}>{r.ausencias}</td><td style={td}>{r.horas}</td>
                  <td style={{ ...td, color: r.cubiertas < r.clases ? R.morado : R.noche, fontWeight: r.cubiertas < r.clases ? 700 : 400 }}>{r.cubiertas} de {r.clases}</td>
                  <td style={td}>{motivosTxt(r.motivos)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {d.porMotivo.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {d.porMotivo.map(([k, n]) => <span key={k} style={{ background: R.azulClaro, color: R.noche, borderRadius: 4, padding: "4px 10px", fontSize: 14 }}><strong>{n}</strong> · {k}</span>)}
          </div>
        )}
      </div>
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
              {["Hora", "Grupo", "Profesor", "Faltas", ""].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 14, color: C.gray }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {listasDia.map(l => (
                <tr key={l.id} style={{ borderTop: `1px solid ${C.cream}` }}>
                  <td style={{ padding: "8px 14px", fontWeight: 600 }}>{l.hora}</td>
                  <td style={{ padding: "8px 14px" }}>{l.curso}{l.ausente && <div style={{ fontSize: 13, color: C.gray }}>Clase de {l.ausente}{l.materia ? ` · ${l.materia}` : ""}</div>}</td>
                  <td style={{ padding: "8px 14px" }}>{l.profesor}<div style={{ fontSize: 13, color: C.gray }}>a las {horaCorta(l.ts)}</div></td>
                  <td style={{ padding: "8px 14px" }}>{l.ausentes.length === 0 ? <span style={{ color: C.teal }}>Sin faltas</span> : l.ausentes.map(a => a.nombre).join(", ")}</td>
                  <td style={{ padding: "8px 14px" }}><button onClick={() => pdfListaGuardia(l)} style={{ minHeight: 36, padding: "0 10px", border: `1px solid ${C.blue}`, borderRadius: 6, background: "#fff", color: C.blue, fontWeight: 700, cursor: "pointer" }}>PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: "8px 14px", fontSize: 13, color: C.gray }}>Las listas de guardia llegan por Rumbogram al profesor/a que faltaba y a Jefatura, y cuentan para la asistencia del alumnado. Las faltas oficiales se registran en Raíces.</div>
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
    "Si hay una clase sin profesor y puedes cubrirla, pulsa «Me la asigno». Si cambias de idea, «Soltarla» antes de que empiece.",
    "Si cubres una clase, pulsa «Pasar lista» y marca solo a quien falta.",
    "Pulsa un día del calendario para ver tus guardias de ese día."] },
  notif_ausencia: { titulo: "Avisar de una ausencia", pasos: [
    "Elige la fecha y marca las horas en que vas a faltar, o pulsa «Día completo». Las horas con clase en tu horario llevan un punto.",
    "Cada clase sale con su grupo, materia y aula. Deja una consigna para cada una, o una tarea general para todas.",
    "Pulsa «Notificar». En «Mis ausencias» verás quién cubre cada clase; puedes modificarla o borrarla hasta que empiece.",
    "Esto completa, no sustituye, el aviso oficial al instituto."] },
  positivas: { titulo: "Conducta positiva", pasos: [
    "Busca al alumno o alumna por su nombre o su grupo.",
    "Elige qué ha hecho bien. Te saldrán ideas de frases: toca una para usarla y retócala, o escribe la tuya.",
    "Pulsa «Anotar». Su tutor/a recibe un aviso en Rumbogram, lo ven Jefatura y el tutor/a en su ficha, y sale en el informe para la familia.",
    "Después, como con un parte, puedes descargar el PDF o copiar el texto y enviarlo por correo a la familia, al tutor/a, a Jefatura y a Orientación.",
    "Debajo tienes tus anotaciones: «Comunicar» para enviarla más tarde y «Borrar» si te has equivocado."] },
  parte_expres: { titulo: "Parte leve exprés", pasos: [
    "Busca al alumno o alumna y toca el motivo: interrupción de clase, falta de respeto o de material, móvil o dispositivos, u otros.",
    "Añade una frase si hace falta (en «Otros» es obligatoria). La hora es la de ahora; cámbiala si no es la correcta.",
    "Pulsa «Generar parte leve». La tipificación se pone sola y el parte es como los de «Nuevo Parte»: sale en Mis partes, en Jefatura y en los avisos a familias.",
    "Para un parte grave o con más detalle, usa «Nuevo Parte»."] },
  notas_aula: { titulo: "Notas de aula", pasos: [
    "Para lo del día a día que no merece un parte: un olvido de material, un despiste, un mal día… o algo bueno.",
    "Busca al alumno o alumna, toca qué ha pasado y, si quieres, añade una frase. Pulsa «Guardar nota».",
    "Solo la ves tú y su tutor/a. No es un parte: no cuenta para los avisos a familias ni para las medidas.",
    "Su tutor/a la ve en «Resumen de tutoría», junto con el resto del trimestre."] },
  compromisos: { titulo: "Mediación y compromisos", pasos: [
    "Elige si es un compromiso de convivencia (un alumno o alumna) o un acuerdo de mediación (dos o más).",
    "Añade al alumnado, escribe el acuerdo y la fecha para revisarlo. Pulsa «Registrar»: su tutor/a recibe un aviso en Rumbogram.",
    "En «Seguimiento», anota cómo va y márcalo En proceso, Cumplido o No cumplido. Cuando toca revisarlo, avisa en la campana.",
    "No es un parte ni una sanción: no genera medidas correctoras ni cuenta para los avisos a familias."] },
  resumen_tutoria: { titulo: "Resumen de tutoría", pasos: [
    "Elige un alumno o alumna de tu tutoría y el trimestre.",
    "Sale todo en una vista: conductas positivas, partes, medidas correctoras, notas de aula y compromisos.",
    "Pulsa «Descargar PDF» para la sesión de evaluación, una reunión con la familia o el archivo de tutoría.",
    "Arriba, la «Alerta temprana» avisa si alguien de tu grupo suma 2 o más partes leves en asignaturas distintas en 14 días. Es para prevenir, no una sanción: pulsa «Visto» cuando lo tengas en cuenta."] },
  mis_coberturas: { titulo: "Mis coberturas", pasos: [
    "Aquí están las clases que has cubierto: las de hoy, las del mes y las del curso, desde el 1 de septiembre.",
    "Arriba, las próximas clases que tienes que cubrir. Cada una dice si te la asignaste tú o Jefatura.",
    "Para asignarte una clase sin profesor, ve a «Ahora» o a «Mi guardia hoy» y pulsa «Me la asigno». Puedes soltarla mientras no haya empezado."] },
  guardias_ver: { titulo: "Guardias del día", pasos: [
    "Todas las zonas de guardia de hoy, hora a hora, con quién está en cada una.",
    "En naranja, las zonas en las que entra el sustituto; en rojo, las que se han quedado sin nadie."] },
  mensajeria: { titulo: "Rumbogram", pasos: [
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
  pasar_lista: { titulo: "Pasar lista", pasos: [
    "Elige el día y la hora: el grupo y la materia salen de tu horario. Si a esa hora no tienes clase (por ejemplo, en una guardia), elige el grupo.",
    "Toca a quien falta: una vez, falta; dos veces, retraso; tres, vuelve a presente.",
    "Pulsa «Guardar la lista». Puedes corregirla después.",
    "Con estas listas, la app avisa al tutor/a y a Jefatura de quién se acerca al protocolo de absentismo o a la pérdida de la evaluación continua. Las faltas oficiales se siguen poniendo en Raíces."] },
  justificantes: { titulo: "Justificantes del alumnado", pasos: [
    "Cuando un alumno/a te entregue un justificante, elige su grupo y su nombre, las fechas y el motivo.",
    "Pulsa «Registrar el justificante»: las faltas de esos días quedan justificadas y su tutor/a recibe un aviso.",
    "El papel se entrega al tutor/a como siempre; aquí solo queda constancia."] },
  asistencia_tutoria: { titulo: "Asistencia de tu tutoría", pasos: [
    "Faltas de tu grupo: quién está en situación de absentismo, quién se acerca y quién puede perder la evaluación continua en alguna materia.",
    "Los límites los fija Jefatura de Estudios."] },
  asistencia_jef: { titulo: "Asistencia del alumnado", pasos: [
    "Arriba, los límites del centro: porcentaje de faltas sin justificar al mes para el protocolo de absentismo y porcentaje por materia para la evaluación continua. Ajústalos según el Plan de convivencia.",
    "Los roscos muestran las faltas del mes por grupo y por materia, y cuántas están justificadas.",
    "Abajo, el alumnado al que conviene prestar atención. Se avisa también al acercarse al 75 % del límite."] },
  horarios_aulas: { titulo: "Horarios y aulas", pasos: [
    "En «Por profesor/a», elige a la persona y toca una hora para poner el grupo, la materia, el aula y el edificio. «Hora libre» la deja vacía.",
    "Si un aula o un grupo queda asignado a dos personas a la misma hora, sale un aviso arriba y la casilla se marca con ⚠️.",
    "«Por grupo» y «Por aula» muestran la semana de un grupo o la ocupación de un aula.",
    "Estos horarios se usan al pasar lista, en las ausencias (clases que se quedan sin profesor) y para saber dónde está cada profe en Rumbogram."] },
  espacios_centro: { titulo: "Espacios del centro", pasos: [
    "Las aulas especiales y otros espacios: nombre, edificio, si se reservan, si tienen llave y si la llave se guarda en Conserjería o en Dirección.",
    "Añade los que falten; «Ocultar» los quita sin perder lo ya anotado."] },
  horario_zonas: { titulo: "Horario y zonas de guardia", pasos: [
    "Las horas de inicio y fin de cada franja: se usan en guardias, partes, reservas y listas.",
    "Las zonas de guardia por edificio y planta, y las del recreo. «Ocultar» quita una zona del cuadrante sin perder lo ya hecho."] },
  material_sesion: { titulo: "Sesión en el aula", pasos: [
    "Elige el aula, el grupo, el día y la hora. Si el grupo ya ha estado en esa aula, sale colocado igual que la última vez (su plantilla).",
    "La primera vez, pulsa «Por orden de lista» o toca cada puesto y elige quién se sienta. El plano se ve desde tu mesa: el puesto 01 queda a tu izquierda.",
    "Si falta alguien hoy, toca su puesto y elige «Nadie (libre)».",
    "Si algo está roto, toca el puesto, escríbelo y pulsa «Anotar incidencia»: verás quién lo usó antes y con qué profesor/a.",
    "Pulsa «Guardar la sesión». Queda constancia de quién se ha sentado en cada puesto y contigo."] },
  material_historial: { titulo: "Historial de puestos", pasos: [
    "Elige el aula: el plano muestra la última sesión.",
    "Toca un puesto para ver todos sus usos: día, hora, alumno/a, grupo y profesor/a, y sus incidencias.",
    "Escribe el nombre de un alumno/a para ver dónde se ha sentado.",
    "Abajo, todas las sesiones del aula, con su PDF."] },
  material_avisos: { titulo: "Necesidades y avisos", pasos: [
    "Elige si es algo roto o que no funciona, o material que hace falta.",
    "Indica el tipo de material, dónde y qué pasa (y la cantidad, si es una necesidad). Marca «Urgente» si impide dar clase.",
    "Pulsa «Enviar aviso»: las averías informáticas llegan a Coordinación TIC; el material que hace falta y el resto de averías, a Secretaría. Si es urgente, también a Dirección.",
    "Abajo ves tus avisos y su estado. Cuando te contesten, te llega un mensaje y sale aquí la respuesta.",
    "Coordinación TIC y Secretaría ven los avisos que les tocan, responden, los marcan «En curso» o «Resuelto» y pueden descargar la lista en PDF."] },
  material_incidencias: { titulo: "Incidencias de puestos", pasos: [
    "Lo que se ha roto o falta en cada puesto, con quién se sentaba y quién lo usó antes.",
    "Coordinación TIC pulsa «Marcar resuelta» cuando se arregla."] },
  reservas: { titulo: "Reservas de espacios", pasos: [
    "Elige el espacio: laboratorio, aula de informática, sala de usos múltiples, salón de actos…",
    "Verás la semana con las horas libres y las reservadas. Usa ‹ › para cambiar de semana.",
    "Pulsa «+ Reservar» en una hora libre, indica el grupo y la actividad si quieres y pulsa «Confirmar reserva».",
    "Para una clase fija, marca «Repetir cada semana» y elige hasta qué fecha: se reserva el mismo día y hora todas las semanas lectivas.",
    "Abajo tienes tus próximas reservas; puedes anularlas hasta que termine la hora. «Descargar PDF» saca la semana del espacio, por ejemplo para ponerla en la puerta."] },
  llaves: { titulo: "Llaves", pasos: [
    "La tabla muestra cada aula con llave especial, dónde se guarda (Conserjería o Dirección) y quién la tiene ahora.",
    "Profesorado: pulsa «Me la llevo» al recogerla y «La devuelvo» al dejarla.",
    "Conserjería y Jefatura: elige quién se la lleva y pulsa «Se la lleva»; al devolverla, «Devuelta».",
    "Abajo, quién coge y quién deja cada llave, con la hora. Elige otro día para ver su registro o descarga el PDF.",
    "Si una llave sigue fuera al acabar la jornada, sale como «Sin devolver» y avisa en la campana."] },
  resumen_cob: { titulo: "Coberturas y ausencias", pasos: [
    "Elige un mes o «Todo el curso».",
    "Arriba, el reparto de coberturas: cuántas clases ha cubierto cada profesor/a y cuántas se asignó él mismo. Ayuda a que el reparto sea equilibrado.",
    "Debajo, las ausencias del profesorado: cuántas, cuántas horas, cuántas de sus clases se cubrieron y los motivos.",
    "Pulsa «Descargar PDF» para archivarlo o llevarlo a una reunión."] },
  firmas_jef: { titulo: "Firmas y listas", pasos: [
    "Elige una fecha.",
    "Verás quién ha firmado cada guardia y a qué hora; las que faltan salen en naranja.",
    "Debajo, las listas pasadas en guardia con las faltas. Pulsa «Descargar PDF» para el archivo."] },
  admin_panel: { titulo: "Datos del centro", pasos: [
    "Nombre, localidad y logotipo del centro: salen en la entrada, en los PDF y en los correos.",
    "El horario, las aulas, las zonas de guardia y los espacios del centro los organiza Jefatura de Estudios."] },
  admin_aulas: { titulo: "Aulas con puestos", pasos: [
    "Para cada aula: su función, el espacio al que pertenece, cuántas filas y cuántos puestos a cada lado del pasillo.",
    "Pulsa «Ver plano» para comprobar la numeración: desde la izquierda del profesor/a hasta su derecha, fila a fila."] },
  admin_alumnos: { titulo: "Alumnado", pasos: [
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
  // Clases cubiertas en semanas pasadas, para el historial «Mis coberturas»
  const coberturas = {}, propias = {};
  const clasesPasadas = [["1º ESO A", "Lengua", "A"], ["2º ESO B", "Geografía", "A"], ["3º ESO A", "Física y Química", "B"], ["4º ESO C", "Biología", "B"], ["1º ESO B", "Inglés", "A"], ["2º ESO A", "Tecnología", "B"]];
  const consignas = ["Ejercicios del tema en el cuaderno.", "Lectura en silencio del capítulo 4.", "Terminar la ficha de repaso.", "Ver el vídeo del aula virtual y resumirlo.", ""];
  const horasClase = HORAS.filter(h => h !== "Recreo");
  const desde = inicioCurso(diaISO);
  let idx = 0;
  for (let atras = 1; atras <= 45 && idx < 16; atras++) {
    const d = sumarDias(dia, -atras), f = isoLocal(d);
    if (f < desde) break;
    if (!esLectivo(d) || atras % 2) continue;
    const otros = profesores.filter(p => p !== sugerido);
    const ausente = otros[(idx * 7 + 3) % otros.length];
    const cubre = idx % 3 === 0 ? sugerido : otros.filter(p => p !== ausente)[(idx * 5 + 1) % 7];
    const hora = horasClase[(idx * 3 + 1) % horasClase.length];
    const [grupo, materia, edificio] = clasesPasadas[idx % clasesPasadas.length];
    const id = 100 + idx;
    ausencias.push({ id, profesor: ausente, motivo: ["Enfermedad", "Formación", "Asunto personal", "Enfermedad", "Baja médica"][idx % 5], fecha: f, horas: [hora], edificio, aula: grupo, asignatura: materia, tarea: consignas[idx % consignas.length], ts, leida: true,
      // Justificantes: la mayoría entregados y revisados; alguno entregado sin revisar y alguno pendiente
      ...(idx % 5 === 2 ? {} : { justificante: { tipo: TIPOS_JUSTIFICANTE_PROF[idx % 3], nota: "", ts: new Date(d).toISOString(), ...(idx % 5 === 1 ? {} : { revisado: { por: "Ana Jiménez", ts } }) } }) });
    coberturas[claveCob(f, hora, id)] = cubre;
    if (idx % 2 === 0) propias[claveCob(f, hora, id)] = cubre;
    idx++;
  }
  return { cuadrante, apoyos, sustitutos, ausencias, coberturas, propias, firmas, sugerido, ausentes: [ausente1, ausente2] };
}

// ═══════════════════════════════════════════════════════════════════════════
// MI GUARDIA HOY (Profesor)
// ═══════════════════════════════════════════════════════════════════════════
// PDF de una lista pasada en guardia, para el profesor/a que faltaba y para Jefatura
function pdfListaGuardia(l) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const y = cabeceraPDF(doc, `Lista de ${l.curso}`, `${parseISO(l.fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${conTramo(l.hora)}`);
  autoTable(doc, { ...estiloTabla, startY: y, theme: "grid", columnStyles: { 0: { fontStyle: "bold", cellWidth: 60, fillColor: [238, 245, 248] } },
    body: [["Grupo", l.curso], ["Materia", l.materia || "-"], ["Profesor/a que faltaba", l.ausente || "-"], ["Pasó la lista (guardia)", l.profesor], ["Hora en que se pasó", horaCorta(l.ts)], ["Faltas", String(l.ausentes.length)]].map(r => r.map(sinEmoji)) });
  autoTable(doc, { ...estiloTabla, startY: doc.lastAutoTable.finalY + 6, head: [["Alumnado que falta"]],
    body: l.ausentes.length ? l.ausentes.map(a => [sinEmoji(a.nombre)]) : [["No falta nadie"]] });
  firmasPDF(doc, doc.lastAutoTable.finalY + 4, [{ cargo: "Profesor/a de guardia", nombre: l.profesor }]);
  guardarPDF(doc, `lista-${nombreArchivo(l.curso)}-${l.fecha}-${l.hora.replace(/\W+/g, "")}.pdf`);
}

function MiGuardiaHoy({ setAsistencia, setMensajes, cuentas = {}, medidas = [], onMarcarMedida, coberturas = {}, setCoberturas, propias = {}, setPropias, firmas = [], setFirmas, listas = [], setListas, alumnos = [], profesores, cuadrante, apoyosGuardia, sustitutosGuardia = {}, ausencias, fProfesor, setFProfesor, C, selStyle, labelStyle, usuario, setShowCuadrante, diaSeleccionadoGuardias, setDiaSeleccionadoGuardias }) {
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
    // La clase que se cubre: de quién era y qué materia
    const aus = ausencias.find(a => isoLocal(a.fecha) === hoyISO && a.horas.includes(hora) && enHora(a, hora).aula === curso);
    const materia = aus ? enHora(aus, hora).asignatura || "" : "";
    const l = { id: Date.now(), fecha: hoyISO, hora, curso, profesor: fProfesor, ausente: aus?.profesor || "", materia, ausentes, ts: new Date().toISOString() };
    setListas(prev => [...prev.filter(x => !(x.fecha === hoyISO && x.hora === hora && x.curso === curso && x.profesor === fProfesor)), l]);
    // Cuenta también para la asistencia del alumnado
    setAsistencia?.(prev => [...prev.filter(r => !(r.fecha === hoyISO && r.hora === hora && r.grupo === curso)),
      { id: l.id, fecha: hoyISO, hora, grupo: curso, materia: materia || "Guardia", profesor: fProfesor, faltas: ausentes.map(a => a.id), retrasos: [], deGuardia: true, ts: l.ts }]);
    // Llega al profesor/a que faltaba y a Jefatura de Estudios
    const jefatura = profesores.filter(p => cargosIds(cuentas[p]).includes("jefatura"));
    const destinos = [...new Set([aus?.profesor, ...jefatura].filter(d => d && d !== fProfesor))];
    const txt = `📋 Lista de ${curso} (${hora}${aus ? `, clase de ${aus.profesor}` : ""}) pasada en guardia por ${fProfesor}: ${ausentes.length ? `faltan ${ausentes.map(a => a.nombre).join(", ")}` : "no falta nadie"}.`;
    if (setMensajes && destinos.length) setMensajes(prev => [...destinos.map((d, k) => mensajeRumbo(d, txt, k)), ...prev]);
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
                {g.cubre && (esPropia(claveCob(hoyISO, g.hora, g.cubre.id), coberturas, propias)
                  ? <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, fontSize:14, fontWeight:800, background:R.verdeCaminoClaro, border:`2px solid ${R.verdeCamino}`, color:R.verdeOscuro }}>✋ Te la has asignado: cubres la clase de {g.cubre.profesor}{g.cubre.aula ? ` en ${g.cubre.aula}` : ""}</div>
                  : <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, fontSize:14, fontWeight:800, background:"#DDF0F4", border:`2px solid ${C.blue}`, color:C.blue }}>📋 Jefatura te ha asignado: cubres la clase de {g.cubre.profesor}{g.cubre.aula ? ` en ${g.cubre.aula}` : ""}</div>)}
                {aviso && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, fontSize:14, fontWeight:700, ...aviso.estilo }}><Ti tam={22}>{aviso.txt}</Ti></div>}
                <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:6, fontSize:14, color:C.gray }}>
                  <div><Ic n="titular" tam={22} />Titular: {nombre(sit.titular, sit.tA)}</div>
                  <div><Ic n="apoyo" tam={22} />Apoyo: {nombre(sit.apoyo, sit.aA)}</div>
                  <div><Ic n="sustituto" tam={22} />Sustituto: {nombre(sit.sustituto, sit.sA)}</div>
                </div>
                {g.ausencias.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#16333F", marginBottom: 6 }}><Ic n="deberes" tam={22} />Deberes y tareas de las clases sin profesor</div>
                    <div style={{ display: "grid", gap: 8 }}>{g.ausencias.map(a => (
                      <div key={a.id} style={{ display: "grid", gap: 6 }}>
                        <TareaAusente a={a} C={C} />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <MeLaAsigno fecha={hoyISO} hora={g.hora} ausencia={a} equipo={equipo} coberturas={coberturas} setCoberturas={setCoberturas} propias={propias} setPropias={setPropias} usuario={fProfesor} C={C} />
                        </div>
                      </div>
                    ))}</div>
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
                          <span key={curso} style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => setListaAbierta({ hora: g.hora, curso })}
                              style={{ ...btn, background: l ? "#DDF0F4" : C.blue, color: l ? C.blue : "#fff" }}>
                              <Ic n="pasar-lista" tam={22} />{l ? `Lista de ${curso}: ${l.ausentes.length} ${l.ausentes.length === 1 ? "falta" : "faltas"}` : `Pasar lista · ${curso}`}
                            </button>
                            {l && <button onClick={() => pdfListaGuardia(l)} style={{ ...btn, background: "#fff", color: C.blue, border: `1px solid ${C.blue}` }} aria-label={`Descargar el PDF de la lista de ${curso}`}>⬇️ PDF</button>}
                          </span>
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
// Datos de una ausencia a una hora concreta: las clases que salen del horario (grupo, aula, materia)
// y la consigna de esa hora. Las ausencias antiguas, sin «sesiones», se quedan como estaban.
function enHora(a, hora) {
  const s = a?.sesiones?.[hora];
  if (!s) return a;
  return { ...a, aula: s.grupo || a.aula, sala: s.aula || "", edificio: s.edificio || a.edificio, asignatura: s.materia || a.asignatura, tarea: s.consigna || a.tarea };
}
const horaTerminada = (fecha, hora, ahora = new Date()) => {
  const hoy = isoLocal(ahora);
  if (fecha !== hoy) return fecha < hoy;
  const fin = (HORARIO[hora] || "0:00 – 0:00").split("–")[1].trim();
  return ahora.getHours() * 60 + ahora.getMinutes() >= minutosDe(fin);
};
// Una ausencia está «comunicada» mientras no haya empezado ninguna de sus horas; luego queda «consolidada»
const ausenciaConsolidada = a => (a.horas || []).some(h => horaEmpezada(isoLocal(a.fecha), h));
// Clases del horario de un profe un día: { hora: { grupo, aula, edificio, materia } }
function clasesDelDia(horarios, profesor, fecha) {
  if (!profesor || !fecha) return {};
  const dia = DIAS_ES[parseISO(fecha).getDay()];
  const r = {};
  HORAS_GUARDIA.forEach(h => { const c = horarios[`${dia}|${h}|${profesor}`]; if (c) r[h] = c; });
  return r;
}
// Estado de cobertura y de consignas de una ausencia (solo cuentan las horas con clase)
function resumenAusencia(a, coberturas) {
  const conClase = (a.horas || []).filter(h => h !== "Recreo");
  const cubiertas = conClase.filter(h => coberturas[claveCob(isoLocal(a.fecha), h, a.id)]);
  const conConsigna = conClase.filter(h => (a.sesiones?.[h]?.consigna || a.tarea || "").trim());
  const nivel = (n, total, si, parcial, no) => !total ? "—" : n === total ? si : n ? parcial : no;
  return {
    cobertura: nivel(cubiertas.length, conClase.length, "Sí", "Parcialmente", "No"),
    consigna: nivel(conConsigna.length, conClase.length, "Registrada", "Parcialmente registrada", "Sin registro"),
  };
}

const TIPOS_JUSTIFICANTE_PROF = ["Parte o informe médico", "Justificante de cita médica", "Permiso o licencia", "Formación o actividad oficial", "Otro documento"];
// Justificante de una ausencia del profesorado: quien falta lo entrega; Jefatura de Estudios lo revisa
function JustificanteAusencia({ a, onEntregar, onRevisar }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_JUSTIFICANTE_PROF[0]);
  const [nota, setNota] = useState("");
  const j = a.justificante;
  const campo = { minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 15, color: R.noche, background: "#fff", fontFamily: "inherit" };
  const boton = (fondo, letra, borde) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: borde ? `2px solid ${borde}` : "none", background: fondo, color: letra, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" });
  if (j) return (
    <div data-justificante-prof style={{ marginTop: 10, padding: "8px 12px", background: j.revisado ? R.verdeCaminoClaro : R.azulClaro, borderLeft: `5px solid ${j.revisado ? R.verdeCamino : R.azul}`, fontSize: 14, color: R.noche, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
      <span>📄 <strong>Justificante entregado</strong>: {j.tipo}{j.nota ? ` · ${j.nota}` : ""} · {fmt(j.ts)}{j.revisado ? ` · ✓ revisado por ${j.revisado.por}` : " · pendiente de revisar en Jefatura"}</span>
      {onRevisar && !j.revisado && <button type="button" onClick={onRevisar} style={boton(R.verde, R.noche)}>Marcar revisado</button>}
    </div>
  );
  if (onRevisar) return <div data-justificante-prof style={{ marginTop: 10, padding: "8px 12px", background: R.crema, borderLeft: `5px solid ${R.mostaza}`, fontSize: 14, color: R.noche }}>📄 Justificante: <strong>pendiente de entregar</strong></div>;
  return (
    <div style={{ marginTop: 10 }}>
      {!abierto ? <button type="button" onClick={() => setAbierto(true)} style={boton("#fff", R.petroleo, R.azul)}>📄 Entregar justificante a Jefatura</button> : (
        <div data-form-justificante style={{ display: "grid", gap: 8, background: R.azulClaro, padding: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Tipo de documento
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>{TIPOS_JUSTIFICANTE_PROF.map(t => <option key={t}>{t}</option>)}</select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Nota (opcional)
            <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Por ejemplo: lo dejo en el casillero de Jefatura" style={campo} />
          </label>
          <div style={{ fontSize: 13, color: R.petroleo }}>Aquí solo queda constancia de la entrega. El documento se entrega en Jefatura por la vía habitual; no lo subas a la app.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { onEntregar({ tipo, nota: nota.trim() }); setAbierto(false); }} style={boton(R.azul, "#fff")}>Marcar como entregado</button>
            <button type="button" onClick={() => setAbierto(false)} style={boton("#fff", R.petroleo, R.turquesa)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificarAusencia({ usuario, modoJefatura = false, profesores, ausencias, setAusencias, cuentas = {}, horarios = {}, coberturas = {}, setCoberturas, setMensajes, ausProfesor, setAusProfesor, ausMotivo, setAusMotivo, ausFecha, setAusFecha, ausHoras, setAusHoras, ausTarea, setAusTarea, ausEnlace, setAusEnlace, ausUbicacion, setAusUbicacion, ausAula, setAusAula, ausAsignatura, setAusAsignatura, fProfesor, C, inpStyle, selStyle, labelStyle }) {
  const [enviado, setEnviado] = useState("");
  const [ausEdificio, setAusEdificio] = useState("");
  const [consignas, setConsignas] = useState({});      // consigna de cada hora
  const [editando, setEditando] = useState(null);      // id de la ausencia que se está modificando
  const [errores, setErrores] = useState([]);
  const [borrando, setBorrando] = useState(null);
  const hoy = isoLocal();
  const clases = clasesDelDia(horarios, ausProfesor, ausFecha);
  const horasClase = Object.keys(clases);
  const tieneHorario = Object.keys(horarios).some(k => k.endsWith(`|${ausProfesor}`));
  const sinHorario = ausHoras.filter(h => h !== "Recreo" && !clases[h]);

  function toggleHora(h) {
    setErrores([]);
    setAusHoras(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  }
  const ordenar = hs => [...hs].sort((x, y) => HORAS_GUARDIA.indexOf(x) - HORAS_GUARDIA.indexOf(y));
  const diaCompleto = () => { setErrores([]); setAusHoras(horasClase.length ? horasClase : HORAS_GUARDIA.filter(h => h !== "Recreo")); };

  function limpiar() {
    setAusFecha(""); setAusHoras([]); setAusTarea(""); setAusEnlace(""); setAusUbicacion(""); setAusAula(""); setAusAsignatura(""); setAusEdificio("");
    setConsignas({}); setEditando(null); setErrores([]);
  }

  // Comprobaciones antes de guardar, como en Rayuela
  function comprobar() {
    const e = [];
    if (!ausProfesor) e.push("Elige el profesor o la profesora.");
    if (!ausFecha) e.push("Elige la fecha de la ausencia.");
    if (!ausHoras.length) e.push("Marca al menos una hora.");
    if (ausFecha && ausFecha < hoy) e.push("No se puede avisar de una ausencia en un día que ya ha pasado.");
    if (ausFecha === hoy) {
      const pasadas = ausHoras.filter(h => modoJefatura ? horaTerminada(ausFecha, h) : horaEmpezada(ausFecha, h));
      if (pasadas.length) e.push(`${modoJefatura ? "Ya han terminado" : "Ya han empezado"}: ${ordenar(pasadas).join(", ")}. Quita esas horas.`);
    }
    const solapes = ausencias.filter(a => a.id !== editando && a.profesor === ausProfesor && isoLocal(a.fecha) === ausFecha && a.horas.some(h => ausHoras.includes(h)));
    if (solapes.length) {
      const horas = ordenar([...new Set(solapes.flatMap(a => a.horas.filter(h => ausHoras.includes(h))))]);
      e.push(`Ya hay una ausencia de ${ausProfesor === usuario ? "ti" : ausProfesor} ese día a ${horas.join(", ")}. Modifica la que ya existe.`);
    }
    if (tieneHorario && ausHoras.length && !ausHoras.some(h => clases[h])) e.push("Ninguna de esas horas tiene clase en el horario: la ausencia no afecta a ningún grupo.");
    return e;
  }

  // Avisa por Rumbogram a quien tenía asignada una clase que ya no hace falta cubrir
  function avisarCoberturasQuitadas(a, horasQuitadas) {
    const fecha = isoLocal(a.fecha);
    const quitadas = horasQuitadas.map(h => [h, coberturas[claveCob(fecha, h, a.id)]]).filter(([, p]) => p);
    if (!quitadas.length) return;
    setCoberturas?.(prev => { const n = { ...prev }; horasQuitadas.forEach(h => delete n[claveCob(fecha, h, a.id)]); return n; });
    const vivas = quitadas.filter(([h]) => !horaTerminada(fecha, h));
    if (!vivas.length || !setMensajes) return;
    const base = Date.now(), ts = new Date(base).toISOString();
    setMensajes(prev => [...vivas.map(([h, p], i) => ({
      id: base + i, aviso: base + i, remitente: "RumboAula", destinatario: p, conCopia: [], leido: false, urgente: false, ts, lugar: null,
      texto: `Ya no tienes que cubrir la clase de ${a.profesor} (${fmtD(parseISO(fecha))}, ${conTramo(h)}): se ha anulado su ausencia a esa hora.`,
    })), ...prev]);
  }

  // Aviso por Rumbogram a Jefatura de Estudios y Dirección cuando un profesor registra, cambia o anula su ausencia
  function avisarJefatura(texto) {
    if (modoJefatura || !setMensajes) return;
    const destinos = profesores.filter(p => p !== ausProfesor && p !== usuario && cargosIds(cuentas[p]).some(c => c === "jefatura" || c === "direccion"));
    if (!destinos.length) return;
    const base = Date.now() + 100, ts = new Date().toISOString();
    setMensajes(prev => [...destinos.map((p, i) => ({
      id: base + i, aviso: base + i, remitente: "RumboAula", destinatario: p, conCopia: [], leido: false, urgente: false, ts, lugar: null, texto,
    })), ...prev]);
  }
  // El profesor/a deja constancia de que ha entregado el justificante de su ausencia a Jefatura
  function entregarJustificante(a, j) {
    setAusencias(prev => prev.map(x => x.id === a.id ? { ...x, justificante: { ...j, ts: new Date().toISOString() } } : x));
    avisarJefatura(`${a.profesor} ha entregado el justificante (${j.tipo}) de su ausencia del ${fmtD(parseISO(isoLocal(a.fecha)))}.`);
  }
  const resumenHoras = horas => horas.length === HORAS.length ? "todo el día" : horas.join(", ");

  function enviar() {
    const e = comprobar();
    setErrores(e);
    if (e.length) return;
    const sesiones = {};
    ordenar(ausHoras).forEach(h => {
      const c = clases[h];
      sesiones[h] = { grupo: c?.grupo || ausAula || "", aula: c?.aula || "", edificio: c?.edificio || ausEdificio || "", materia: c?.materia || ausAsignatura || "", consigna: (consignas[h] || "").trim() };
    });
    const primera = sesiones[ordenar(ausHoras).find(h => h !== "Recreo")] || {};
    const datos = { profesor: ausProfesor, motivo: ausMotivo, fecha: ausFecha, horas: ordenar(ausHoras), tarea: ausTarea, enlace: ausEnlace, ubicacion: ausUbicacion,
      aula: primera.grupo || ausAula, asignatura: primera.materia || ausAsignatura, edificio: primera.edificio || ausEdificio, sesiones };
    if (editando) {
      const antes = ausencias.find(a => a.id === editando);
      if (antes) avisarCoberturasQuitadas(antes, antes.horas.filter(h => !ausHoras.includes(h)));
      setAusencias(prev => prev.map(a => a.id === editando ? { ...a, ...datos, modificada: new Date().toISOString() } : a));
      avisarJefatura(`${ausProfesor} ha modificado su ausencia del ${fmtD(parseISO(ausFecha))}: ahora falta a ${resumenHoras(ordenar(ausHoras))}.`);
      setEnviado("Ausencia modificada. Jefatura ha recibido un aviso con los cambios.");
    } else {
      setAusencias(prev => [{ id: Date.now(), ...datos, ts: new Date().toISOString(), leida: false, ...(modoJefatura && ausProfesor !== usuario ? { registradaPor: usuario } : {}) }, ...prev]);
      const sinConsigna = !ausTarea.trim() && ordenar(ausHoras).some(h => h !== "Recreo" && !sesiones[h].consigna);
      avisarJefatura(`Nueva ausencia: ${ausProfesor} faltará el ${fmtD(parseISO(ausFecha))} a ${resumenHoras(ordenar(ausHoras))} (${ausMotivo}).${sinConsigna ? " Alguna clase no tiene consigna." : ""}`);
      setEnviado("Ausencia notificada. Jefatura ha recibido un aviso.");
    }
    limpiar();
    setTimeout(() => setEnviado(""), 4000);
  }

  function modificar(a) {
    setEditando(a.id); setErrores([]);
    setAusProfesor(a.profesor); setAusFecha(isoLocal(a.fecha)); setAusMotivo(a.motivo || MOTIVOS[0]); setAusHoras(a.horas);
    setAusTarea(a.tarea || ""); setAusEnlace(a.enlace || ""); setAusUbicacion(a.ubicacion || ""); setAusAula(a.aula || ""); setAusAsignatura(a.asignatura || ""); setAusEdificio(a.edificio || "");
    setConsignas(Object.fromEntries(Object.entries(a.sesiones || {}).map(([h, s]) => [h, s.consigna || ""])));
    window.scrollTo(0, 0);
  }
  function borrar(a) {
    avisarCoberturasQuitadas(a, a.horas);
    avisarJefatura(`${a.profesor} ha anulado su ausencia del ${fmtD(parseISO(isoLocal(a.fecha)))} (${resumenHoras(a.horas)}).`);
    setAusencias(prev => prev.filter(x => x.id !== a.id));
    if (editando === a.id) limpiar();
    setBorrando(null);
    setEnviado("Ausencia borrada. Si alguien tenía que cubrir tu clase, ya le ha llegado el aviso.");
    setTimeout(() => setEnviado(""), 4000);
  }

  const misAusencias = modoJefatura ? [] : ausencias.filter(a => a.profesor === fProfesor).sort((x, y) => isoLocal(y.fecha).localeCompare(isoLocal(x.fecha)));
  const boton = (fondo, letra) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: fondo === C.white ? `2px solid ${R.azul}` : "none", background: fondo, color: letra, fontSize: 15, fontWeight: 700, cursor: "pointer" });
  const chip = (txt, fondo, letra = R.noche) => <span style={{ background: fondo, color: letra, borderRadius: 4, padding: "2px 10px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{txt}</span>;
  const colorNivel = v => v === "Sí" || v === "Registrada" ? R.verde : v === "—" ? R.gris : R.mostaza;

  return (
    <div>
      <div style={{ marginBottom: 16 }}><TituloBloque titulo={modoJefatura ? "Registrar una ausencia comunicada por teléfono" : editando ? "Modificar la ausencia" : "Notificar Ausencia"} icono="profe-ausente" /></div>
      {modoJefatura && <p style={{ marginTop: -6, color: C.gray, fontSize: 14 }}>Para cuando un profesor llama al instituto y no puede avisar desde la app. Su guardia y la tarea llegan igual a quien le cubre.</p>}
      {enviado && <div role="status" style={{ ...caja(R.verde), padding: 14, marginBottom: 16, fontWeight: 700, color: R.petroleo, fontSize: 16 }}>✅ {enviado}</div>}
      <div style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="gd-aus-profe">Soy el/la profesor/a *</label>
            <select id="gd-aus-profe" value={ausProfesor} onChange={e => { setAusProfesor(e.target.value); setErrores([]); }} style={selStyle} disabled={!!editando || (!modoJefatura && profesores.includes(usuario))}>
              <option value="">— Seleccionar —</option>
              {profesores.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="gd-aus-fecha">Fecha de ausencia *</label>
            <input id="gd-aus-fecha" type="date" min={hoy} value={ausFecha} onChange={e => { setAusFecha(e.target.value); setAusHoras([]); setConsignas({}); setErrores([]); }} style={inpStyle} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle} htmlFor="gd-aus-motivo">Motivo</label>
            <select id="gd-aus-motivo" value={ausMotivo} onChange={e => setAusMotivo(e.target.value)} style={selStyle}>
              {MOTIVOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Horas afectadas *</label>
            {ausFecha && ausProfesor && <button type="button" onClick={diaCompleto} style={boton(C.white, R.petroleo)}>Día completo</button>}
          </div>
          {ausFecha && ausProfesor && (
            <div style={{ fontSize: 15, color: R.petroleo, margin: "6px 0 2px" }}>
              {horasClase.length ? <>Tus clases ese día: <b>{horasClase.join(", ")}</b>. Las horas con clase llevan un punto.</> : tieneHorario ? "Ese día no tienes clases en tu horario." : "No hay horario de clases cargado: indica abajo el aula y la asignatura."}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {HORAS_GUARDIA.map(h => {
              const sel = ausHoras.includes(h);
              return (
                <button key={h} type="button" onClick={() => toggleHora(h)} aria-pressed={sel}
                  style={{ minHeight: 48, padding: "6px 12px", borderRadius: 6, border: `2px solid ${sel ? R.azul : R.turquesaClaro}`, background: sel ? R.azul : C.white, color: sel ? "#fff" : R.petroleo, cursor: "pointer", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                  {clases[h] ? "• " : ""}{h}<br /><span style={{ fontSize: 13, fontWeight: 400 }}>{HORARIO[h]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clases afectadas, sacadas del horario, con una consigna para cada una */}
        {ausHoras.filter(h => h !== "Recreo").length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ background: R.turquesa, color: "#fff", fontWeight: 700, padding: "8px 12px" }}>Clases afectadas</div>
            <div style={{ display: "grid", gap: 1, background: R.turquesaClaro }}>
              {ordenar(ausHoras).filter(h => h !== "Recreo").map(h => {
                const c = clases[h];
                return (
                  <div key={h} style={{ background: R.azulClaro, padding: 12, display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 700, color: R.petroleo }}>{conTramo(h)} · {c ? `${c.grupo} · ${c.materia || "Clase"} · ${c.aula}${c.edificio ? ` · Edificio ${c.edificio}` : ""}` : "No está en tu horario"}</div>
                    <label style={{ fontSize: 14, color: R.petroleo }} htmlFor={`gd-consigna-${h}`}>Consigna para quien cubra esta clase (opcional)</label>
                    <textarea id={`gd-consigna-${h}`} rows={2} value={consignas[h] || ""} onChange={e => setConsignas(v => ({ ...v, [h]: e.target.value }))}
                      placeholder={ausTarea ? `Si la dejas vacía, se usa la tarea general: «${ausTarea.slice(0, 50)}»` : "Qué tiene que hacer el grupo en esta clase"} style={{ ...inpStyle, resize: "vertical" }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="gd-aus-tarea">Tarea general para todas las clases (opcional)</label>
          <textarea id="gd-aus-tarea" value={ausTarea} onChange={e => setAusTarea(e.target.value)} rows={2}
            placeholder="Se usa en las clases que no tengan su propia consigna" style={{ ...inpStyle, resize: "vertical" }} />
        </div>
        {sinHorario.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div style={{ gridColumn: "1/-1", fontSize: 15, color: R.petroleo }}>Datos de la clase para {sinHorario.join(", ")}, que no está en el horario:</div>
            <div>
              <label style={labelStyle} htmlFor="gd-aus-edificio">Edificio del aula</label>
              <select id="gd-aus-edificio" value={ausEdificio} onChange={e => setAusEdificio(e.target.value)} style={selStyle}>
                <option value="">— Seleccionar —</option>
                {EDIFICIOS.map(e => <option key={e} value={e}>Edificio {e}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="gd-aus-aula">Grupo o aula</label>
              <input id="gd-aus-aula" type="text" value={ausAula} onChange={e => setAusAula(e.target.value)} placeholder="3º ESO B, Sala 5, Taller 2..." style={inpStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="gd-aus-asig">Asignatura o función</label>
              <input id="gd-aus-asig" type="text" value={ausAsignatura} onChange={e => setAusAsignatura(e.target.value)} placeholder="Matemáticas, Inglés, Tutoría..." style={inpStyle} />
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={labelStyle} htmlFor="gd-aus-enlace">Enlace a recursos (opcional)</label>
            <input id="gd-aus-enlace" type="url" value={ausEnlace} onChange={e => setAusEnlace(e.target.value)} placeholder="https://drive.google.com/..." style={inpStyle} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="gd-aus-ubic">Ubicación del material (opcional)</label>
            <input id="gd-aus-ubic" type="text" value={ausUbicacion} onChange={e => setAusUbicacion(e.target.value)} placeholder="Conserjería, Mi despacho, Fotocopias..." style={inpStyle} />
          </div>
        </div>
        {errores.length > 0 && (
          <div role="alert" style={{ ...caja(R.mostaza), padding: "10px 14px", marginBottom: 14, color: R.noche }}>
            {errores.map(e => <div key={e} style={{ fontSize: 15, fontWeight: 600 }}>⚠️ {e}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={enviar} style={{ flex: "1 1 260px", minHeight: 52 }}>
            <Ic n="profe-ausente" tam={22} />{editando ? "Guardar los cambios" : modoJefatura ? "Registrar ausencia" : "Notificar Ausencia a Jefatura"}
          </Btn>
          {editando && <button type="button" onClick={limpiar} style={{ minHeight: 44, border: "none", background: "none", color: R.azul, textDecoration: "underline", fontSize: 16, cursor: "pointer" }}>Cancelar</button>}
        </div>
        <p style={{ fontSize: 14, color: R.petroleo, margin: "12px 0 0" }}>Avísalo con antelación siempre que puedas. Su tramitación depende de las normas del centro y de la aprobación del equipo directivo.</p>
      </div>

      {misAusencias.length > 0 && (
        <div>
          <h3 style={{ color: R.petroleo, fontSize: 20 }}>Mis ausencias notificadas</h3>
          {misAusencias.map(a => {
            const fecha = isoLocal(a.fecha);
            const consolidada = ausenciaConsolidada(a);
            const res = resumenAusencia(a, coberturas);
            return (
              <div key={a.id} data-ausencia={a.id} style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, borderLeft: `10px solid ${consolidada ? R.gris : R.turquesa}`, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: R.petroleo, fontSize: 17 }}><Ic n="fecha-hora" tam={22} />{parseISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} · {a.motivo}</div>
                  {chip(consolidada ? "Consolidada" : "Comunicada", consolidada ? R.gris : R.azulClaro, R.petroleo)}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0", fontSize: 15, color: R.petroleo, alignItems: "center" }}>
                  Clases cubiertas: {chip(res.cobertura, colorNivel(res.cobertura))} · Consigna: {chip(res.consigna, colorNivel(res.consigna))}
                </div>
                <div style={{ display: "grid", gap: 1, background: R.turquesaClaro, border: `1px solid ${R.turquesaClaro}` }}>
                  {a.horas.map(h => {
                    const s = enHora(a, h), cubre = coberturas[claveCob(fecha, h, a.id)];
                    return (
                      <div key={h} style={{ background: C.white, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 15, color: R.petroleo }}>
                        <span><b>{conTramo(h)}</b>{h !== "Recreo" && <> · {[s.aula, s.asignatura, s.sala].filter(Boolean).join(" · ")}</>}{h !== "Recreo" && !s.tarea && <span style={{ color: R.noche }}> · sin consigna</span>}</span>
                        {h !== "Recreo" && (cubre ? <span style={{ fontWeight: 700 }}>Cubre: {cubre}</span> : chip("Pendiente", R.crema))}
                      </div>
                    );
                  })}
                </div>
                {a.enlace && <div style={{ fontSize: 14, marginTop: 6 }}>🔗 <a href={a.enlace} target="_blank" rel="noopener noreferrer">{a.enlace}</a></div>}
                {a.ubicacion && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 4 }}><Ic n="edificio" tam={20} />Material: {a.ubicacion}</div>}
                <div style={{ fontSize: 13, color: R.petroleo, marginTop: 6 }}>Notificada el {fmt(a.ts)}{a.modificada ? ` · modificada el ${fmt(a.modificada)}` : ""}</div>
                {!consolidada && (
                  borrando === a.id
                    ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10, background: R.crema, padding: 10 }}>
                        <span style={{ fontWeight: 700, color: R.noche }}>¿Borrar esta ausencia?</span>
                        <button type="button" onClick={() => borrar(a)} style={boton(R.azul, "#fff")}>Sí, borrar</button>
                        <button type="button" onClick={() => setBorrando(null)} style={boton(C.white, R.petroleo)}>No</button>
                      </div>
                    : <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        <button type="button" onClick={() => modificar(a)} style={boton(C.white, R.petroleo)}>Modificar</button>
                        <button type="button" onClick={() => setBorrando(a.id)} style={boton(C.white, R.petroleo)}>Borrar</button>
                      </div>
                )}
                {consolidada && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}>Ya ha empezado: no se puede modificar ni borrar. Si hace falta, avisa a Jefatura.</div>}
                <JustificanteAusencia a={a} onEntregar={j => entregarJustificante(a, j)} />
              </div>
            );
          })}
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
function CoordinacionAusencias({ profesores, ausencias, cuadrante, apoyosGuardia, sustitutosGuardia = {}, coberturas = {}, setCoberturas, coberturasPropias = {}, setCoberturasPropias, HORAS_GUARDIA, ZONAS_CENTRO, C, inpStyle, labelStyle, fechaCoordinacion, setFechaCoordinacion }) {
  
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
                          <CubrirClase key={h} fecha={isoLocal(fechaCoordinacion)} hora={h} ausencia={a} equipo={equipoCob} coberturas={coberturas} setCoberturas={setCoberturas} propias={coberturasPropias} setPropias={setCoberturasPropias} puedeAsignar C={C} />
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
  // Sin choques: a cada hora, cada grupo (y su aula) está con un solo profesor/a
  DIAS_SEMANA.forEach((dia, d) => {
    horasClase.forEach((hora, hi) => {
      const ocupados = new Set();
      profesores.forEach((p, i) => {
        if ((i * 7 + d * 3 + hi) % 5 >= 3) return; // hora libre
        const grupo = cursos[(i * 5 + d * 2 + hi) % cursos.length];
        if (ocupados.has(grupo)) return;
        ocupados.add(grupo);
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
// RUMBOGRAM - MENSAJERÍA RÁPIDA
// ═══════════════════════════════════════════════════════════════════════════
const ICONO_CARGO = { profesor: "cargo-profesor", jefatura: "cargo-jefatura", direccion: "cargo-direccion", secretaria: "cargo-secretaria", tic: "cargo-tic", orientacion: "tutor", conserjeria: "llave", jefe_depto: "profesorado" };
const ICONO_MENSAJE = { "Alumno enfermo": "alumno-enfermo", "Emergencia": "emergencia", "Urgencia en aula": "emergencia", "Falta material": "falta-material",
  "Alumno derivado": "alumno-derivado", "Cambio de guardia": "sustituto", "Falta un profesor": "profe-ausente", "Reunión importante": "eventos" };
function Rumbogram({ vistaInicial = "enviar", mensajes, setMensajes, usuario, esJefatura, profesores, horarios = {}, cursos = [], cuadrante = {}, apoyosGuardia = {}, sustitutosGuardia = {}, ausencias = [], coberturas = {}, C, inpStyle, selStyle, labelStyle }) {
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
      <div style={{ marginBottom: 16 }}><TituloBloque titulo="Rumbogram" icono="mensajes" /></div>
      
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

function AhoraGuardias({ profesores, cuadrante, apoyosGuardia = {}, sustitutosGuardia = {}, ausencias = [], coberturas = {}, setCoberturas, propias = {}, setPropias, puedeAsignar = false, usuario = "", C }) {
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
  const clasesSinProfe = hora === "Recreo" ? [] : ausentesAhora.map(a => enHora(a, hora));
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
                <div style={{ fontWeight: 800, color: C.blue, fontSize: 15, marginBottom: 6 }}>{esPropia(claveCob(fecha, hora, miClase.id), coberturas, propias) ? "✋ Te la has asignado" : "📋 Jefatura te ha asignado"}: cubres la clase de {miClase.profesor}{miClase.aula ? ` en ${miClase.aula}` : ""}</div>
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
                  <CubrirClase fecha={fecha} hora={hora} ausencia={a} equipo={equipo} coberturas={coberturas} setCoberturas={setCoberturas} propias={propias} setPropias={setPropias} puedeAsignar={puedeAsignar} usuario={usuario} C={C} />
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
function GestionAusencias({ ausencias, setAusencias, profesores, usuario, C, fmt }) {
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
            <div onClick={e => e.stopPropagation()}>
              <JustificanteAusencia a={a} onRevisar={() => setAusencias(prev => prev.map(x => x.id === a.id && x.justificante ? { ...x, justificante: { ...x.justificante, revisado: { por: usuario, ts: new Date().toISOString() } } } : x))} />
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HORARIOS Y AULAS (Jefatura de Estudios): qué grupo, materia y aula tiene cada profesor/a a cada hora
// horarios: { "Lunes|3ª hora|Profesor": { grupo, materia, aula, edificio } }
// ═══════════════════════════════════════════════════════════════════════════
function conflictosHorario(horarios) {
  const por = {}, l = [];
  Object.entries(horarios).forEach(([k, c]) => {
    const [dia, hora, prof] = k.split("|");
    if (c.aula) (por[`a|${dia}|${hora}|${c.aula}`] = por[`a|${dia}|${hora}|${c.aula}`] || []).push(prof);
    if (c.grupo) (por[`g|${dia}|${hora}|${c.grupo}`] = por[`g|${dia}|${hora}|${c.grupo}`] || []).push(prof);
  });
  Object.entries(por).forEach(([k, profs]) => {
    if (profs.length < 2) return;
    const [t, dia, hora, que] = k.split("|");
    l.push({ tipo: t === "a" ? "aula" : "grupo", dia, hora, que, profs });
  });
  return l;
}
function HorariosAulas({ horarios = {}, setHorarios, profesores = [], cursos = [], espacios }) {
  const [vista, setVista] = useState("profesor");
  const [quien, setQuien] = useState(profesores[0] || "");
  const [grupoV, setGrupoV] = useState(cursos[0] || "");
  const aulasConocidas = [...new Set([...Object.values(horarios).map(c => c.aula).filter(Boolean), ...listaEspacios(espacios).filter(e => !e.oculta).map(e => e.nombre)])].sort((a, b) => a.localeCompare(b, "es"));
  const [aulaV, setAulaV] = useState(aulasConocidas[0] || "");
  const [sel, setSel] = useState(null); // {dia, hora}
  const [f, setF] = useState({ grupo: "", materia: "", aula: "", edificio: "" });
  const horasClase = HORAS.filter(h => h !== "Recreo");
  const conflictos = conflictosHorario(horarios);
  const enConflicto = (dia, hora, c) => c && conflictos.some(x => x.dia === dia && x.hora === hora && ((x.tipo === "aula" && x.que === c.aula) || (x.tipo === "grupo" && x.que === c.grupo)));
  const elegir = (dia, hora) => { const c = horarios[`${dia}|${hora}|${quien}`]; setSel({ dia, hora }); setF({ grupo: c?.grupo || "", materia: c?.materia || "", aula: c?.aula || "", edificio: c?.edificio || "" }); };
  const guardar = () => {
    const k = `${sel.dia}|${sel.hora}|${quien}`;
    setHorarios(prev => { const n = { ...prev }; if (f.grupo) n[k] = { grupo: f.grupo, materia: f.materia.trim(), aula: f.aula.trim(), edificio: f.edificio.trim() }; else delete n[k]; return n; });
    setSel(null);
  };
  // Celda según la vista: la clase del profesor/a, o quién está con ese grupo / en esa aula
  const celda = (dia, hora) => {
    if (vista === "profesor") return { c: horarios[`${dia}|${hora}|${quien}`], prof: quien };
    const e = Object.entries(horarios).find(([k, c]) => k.startsWith(`${dia}|${hora}|`) && (vista === "grupo" ? c.grupo === grupoV : c.aula === aulaV));
    return e ? { c: e[1], prof: e[0].split("|")[2] } : { c: null };
  };
  const campo = { width: "100%", minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
  const etq = { display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo };
  const chip = (id, txt) => <button key={id} aria-pressed={vista === id} onClick={() => { setVista(id); setSel(null); }} style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `2px solid ${vista === id ? R.azul : R.turquesaClaro}`, background: vista === id ? R.azulClaro : "#fff", color: R.petroleo, fontWeight: vista === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", fontSize: 15 }}>{txt}</button>;
  const th = { padding: "8px 6px", background: R.azul, color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center" };
  return (
    <div>
      <TituloBloque titulo="Horarios y aulas" sub="Qué grupo, materia y aula tiene cada profesor/a a cada hora; se usa al pasar lista, en las ausencias y en Rumbogram" icono="horario" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 10px" }}>{chip("profesor", "Por profesor/a")}{chip("grupo", "Por grupo")}{chip("aula", "Por aula")}</div>
      <div style={{ maxWidth: 420, marginBottom: 12 }}>
        {vista === "profesor" && <label style={etq}>Profesor/a<select id="gd-hor-prof" value={quien} onChange={e => { setQuien(e.target.value); setSel(null); }} style={campo}>{[...profesores].sort((a, b) => a.localeCompare(b, "es")).map(p => <option key={p}>{p}</option>)}</select></label>}
        {vista === "grupo" && <label style={etq}>Grupo<select id="gd-hor-grupo" value={grupoV} onChange={e => setGrupoV(e.target.value)} style={campo}>{cursos.map(c => <option key={c}>{c}</option>)}</select></label>}
        {vista === "aula" && <label style={etq}>Aula<select id="gd-hor-aula" value={aulaV} onChange={e => setAulaV(e.target.value)} style={campo}>{aulasConocidas.map(a => <option key={a}>{a}</option>)}</select></label>}
      </div>
      {conflictos.length > 0 && (
        <div role="alert" data-conflictos style={{ marginBottom: 12, padding: "10px 14px", background: R.crema, borderLeft: `6px solid ${R.mostaza}`, color: R.noche, fontSize: 14 }}>
          <strong>⚠️ {conflictos.length} {conflictos.length === 1 ? "coincidencia" : "coincidencias"} en los horarios:</strong>
          {conflictos.slice(0, 5).map((x, i) => <div key={i}>{x.dia} · {x.hora}: {x.tipo === "aula" ? `el aula ${x.que}` : `el grupo ${x.que}`} está asignado a {x.profs.join(" y ")}.</div>)}
          {conflictos.length > 5 && <div>y {conflictos.length - 5} más.</div>}
        </div>
      )}
      <div style={{ overflowX: "auto", background: "#fff", border: `1px solid ${R.turquesaClaro}` }}>
        <table data-tabla="horario" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 640 }}>
          <thead><tr><th style={{ ...th, width: 100 }}>Hora</th>{DIAS_SEMANA.map(d => <th key={d} style={th}>{d}</th>)}</tr></thead>
          <tbody>{horasClase.map(h => (
            <tr key={h}>
              <td style={{ padding: "6px 8px", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 14, color: R.petroleo }}><strong>{h}</strong><div style={{ fontSize: 12 }}>{HORARIO[h]}</div></td>
              {DIAS_SEMANA.map(d => {
                const { c, prof } = celda(d, h), conf = enConflicto(d, h, c), elegida = sel?.dia === d && sel?.hora === h;
                const contenido = c ? <><strong>{vista === "grupo" ? c.materia : c.grupo}</strong><div>{vista === "profesor" ? c.materia : prof}</div><div style={{ color: R.petroleo }}>{vista === "aula" ? c.materia : c.aula}</div></> : <span style={{ color: R.turquesa }}>{vista === "profesor" ? "+ Libre" : "—"}</span>;
                return (
                  <td key={d} style={{ padding: 3, borderBottom: `1px solid ${R.turquesaClaro}`, borderLeft: `1px solid ${R.turquesaClaro}`, verticalAlign: "top" }}>
                    {vista === "profesor"
                      ? <button data-hor-celda={`${d}|${h}`} onClick={() => elegir(d, h)} aria-pressed={elegida} style={{ width: "100%", minHeight: 56, padding: "4px 6px", textAlign: "left", fontSize: 12.5, lineHeight: 1.3, fontFamily: "inherit", color: R.noche, cursor: "pointer", borderRadius: 4,
                          border: `${elegida ? 2 : 1}px ${c ? "solid" : "dashed"} ${elegida ? R.azul : conf ? R.mostaza : c ? R.turquesa : R.turquesaClaro}`, background: elegida ? R.azulClaro : conf ? R.crema : c ? "#fff" : R.gris }}>{conf ? "⚠️ " : ""}{contenido}</button>
                      : <div style={{ minHeight: 56, padding: "4px 6px", fontSize: 12.5, lineHeight: 1.3, color: R.noche, background: conf ? R.crema : c ? R.azulClaro : "transparent" }}>{conf ? "⚠️ " : ""}{contenido}</div>}
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {vista === "profesor" && sel && (
        <div data-form-horario style={{ marginTop: 12, background: R.azulClaro, borderLeft: `5px solid ${R.azul}`, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16 }}>{quien} · {sel.dia} · {conTramo(sel.hora)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <label style={etq}>Grupo<select id="gd-hor-f-grupo" value={f.grupo} onChange={e => setF(v => ({ ...v, grupo: e.target.value }))} style={campo}><option value="">Hora libre</option>{cursos.map(c => <option key={c}>{c}</option>)}</select></label>
            <label style={etq}>Materia<input id="gd-hor-f-materia" list="gd-hor-materias" value={f.materia} onChange={e => setF(v => ({ ...v, materia: e.target.value }))} style={campo} /></label>
            <label style={etq}>Aula<input id="gd-hor-f-aula" list="gd-hor-aulas" value={f.aula} onChange={e => setF(v => ({ ...v, aula: e.target.value }))} placeholder="Por ejemplo, Aula A1.01" style={campo} /></label>
            <label style={etq}>Edificio<input id="gd-hor-f-edificio" value={f.edificio} onChange={e => setF(v => ({ ...v, edificio: e.target.value }))} placeholder="A" style={campo} /></label>
          </div>
          <datalist id="gd-hor-materias">{[...new Set([...MATERIAS_DEMO, ...Object.values(horarios).map(c => c.materia).filter(Boolean)])].map(m => <option key={m} value={m} />)}</datalist>
          <datalist id="gd-hor-aulas">{aulasConocidas.map(a => <option key={a} value={a} />)}</datalist>
          {f.aula && Object.entries(horarios).some(([k, c]) => k.startsWith(`${sel.dia}|${sel.hora}|`) && !k.endsWith(`|${quien}`) && c.aula === f.aula) && <div role="alert" style={{ color: R.noche, fontWeight: 700, borderLeft: `5px solid ${R.mostaza}`, paddingLeft: 8 }}>Esa aula ya está asignada a otra persona a esa hora.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={guardar} style={{ minHeight: 44, padding: "0 16px", border: "none", borderRadius: 6, background: R.azul, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{f.grupo ? "Guardar" : "Dejar libre"}</button>
            <button onClick={() => setSel(null)} style={{ minHeight: 44, padding: "0 16px", border: `2px solid ${R.turquesa}`, borderRadius: 6, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASISTENCIA DEL ALUMNADO: pasar lista en cada clase, justificantes y avisos de absentismo
// Registro: {id, fecha, hora, grupo, materia, profesor, faltas: [alumnoId], retrasos: [alumnoId], ts}
// Justificante: {id, alumnoId, alumno, grupo, desde, hasta, motivo, nota, registra, ts}
// ═══════════════════════════════════════════════════════════════════════════
// Límites por defecto (los ajusta Jefatura según el Plan de convivencia y las normas del centro)
const LIMITES_ASISTENCIA = { absentismo: 20, evaluacion: 25, contarJustificadas: false };
const MOTIVOS_JUSTIFICANTE = ["Enfermedad", "Cita médica", "Asunto familiar", "Deber inexcusable", "Otro"];
const justificada = (alumnoId, fecha, justificantes) => justificantes.some(j => j.alumnoId === alumnoId && j.desde <= fecha && fecha <= j.hasta);
// Situación de cada alumno/a: faltas sin justificar del mes (absentismo) y faltas por materia en el curso (evaluación continua)
function situacionAsistencia({ alumno, asistencia, justificantes, limites = LIMITES_ASISTENCIA, hoy = isoLocal(new Date()) }) {
  const mes = hoy.slice(0, 7), curso0 = inicioCurso(hoy);
  const delGrupo = asistencia.filter(r => r.grupo === alumno.curso && r.fecha >= curso0 && r.fecha <= hoy);
  const falta = r => r.faltas.includes(alumno.id);
  const sinJust = r => falta(r) && !justificada(alumno.id, r.fecha, justificantes);
  const mesR = delGrupo.filter(r => r.fecha.startsWith(mes));
  const faltasMes = mesR.filter(sinJust).length;
  const pctMes = mesR.length ? Math.round(100 * faltasMes / mesR.length) : 0;
  const materias = Object.values(delGrupo.reduce((acc, r) => {
    const m = r.materia || "Sin materia", x = acc[m] || (acc[m] = { materia: m, sesiones: 0, faltas: 0 });
    x.sesiones++; if (limites.contarJustificadas ? falta(r) : sinJust(r)) x.faltas++;
    return acc;
  }, {})).map(x => ({ ...x, pct: x.sesiones ? Math.round(100 * x.faltas / x.sesiones) : 0 }));
  const nivel = (pct, lim, minimo, n) => n < minimo ? "ok" : pct >= lim ? "supera" : pct >= lim * 0.75 ? "riesgo" : "ok";
  const absentismo = nivel(pctMes, limites.absentismo, 5, mesR.length);
  const evaluacion = materias.map(x => ({ ...x, estado: nivel(x.pct, limites.evaluacion, 4, x.sesiones) })).filter(x => x.estado !== "ok").sort((a, b) => b.pct - a.pct);
  return {
    sesionesMes: mesR.length, faltasMes, pctMes, absentismo, evaluacion,
    faltasCurso: delGrupo.filter(falta).length, justificadasCurso: delGrupo.filter(r => falta(r) && justificada(alumno.id, r.fecha, justificantes)).length,
    retrasosCurso: delGrupo.filter(r => (r.retrasos || []).includes(alumno.id)).length,
  };
}
// Datos de ejemplo: cuatro semanas de listas según el horario, con dos casos de absentismo y uno de faltas en una materia
function asistenciaEjemplo(horarios, alumnos, hoy = new Date()) {
  const reg = [], porGrupo = {};
  alumnos.forEach(a => { (porGrupo[a.curso] = porGrupo[a.curso] || []).push(a); });
  const ordenados = [...alumnos].sort((a, b) => a.id - b.id);
  const absentistas = new Set([ordenados[3]?.id, ordenados[17]?.id].filter(Boolean));
  const unaMateria = ordenados[8]?.id;
  const azar = (...n) => { let x = n.reduce((h, v) => (h * 31 + v) % 2147483647, 7); x = (x * 48271) % 2147483647; return (x % 1000) / 1000; };
  const ahora = hoy.getHours() * 60 + hoy.getMinutes();
  let materiaFoco = null;
  for (let atras = 27; atras >= 0; atras--) {
    const d = sumarDias(hoy, -atras); if (!esLectivo(d)) continue;
    const f = isoLocal(d), dia = DIAS_ES[d.getDay()];
    Object.entries(horarios).forEach(([k, c]) => {
      const [dd, hora, profesor] = k.split("|");
      if (dd !== dia || !porGrupo[c.grupo]) return;
      if (atras === 0 && minutosDe((HORARIO[hora] || "0:00 – 0:00").split("–")[1]) > ahora) return;
      const di = Number(f.replace(/-/g, "")) % 997, hi = HORAS.indexOf(hora);
      if (c.grupo === ordenados[8]?.curso && !materiaFoco) materiaFoco = c.materia;
      const faltas = [], retrasos = [];
      porGrupo[c.grupo].forEach(a => {
        const r = azar(a.id, di, hi);
        const p = absentistas.has(a.id) ? 0.3 : a.id === unaMateria && c.materia === materiaFoco ? 0.45 : 0.03;
        if (r < p) faltas.push(a.id); else if (r > 0.985) retrasos.push(a.id);
      });
      reg.push({ id: reg.length + 1, fecha: f, hora, grupo: c.grupo, materia: c.materia, profesor, faltas, retrasos, ts: new Date(d).toISOString() });
    });
  }
  return reg;
}
function justificantesEjemplo(alumnos, profesores, hoy = new Date()) {
  const ord = [...alumnos].sort((a, b) => a.id - b.id), a = ord[17], b = ord[25];
  // Días lectivos recientes de este mes (o los últimos, si el mes acaba de empezar)
  const lectivos = []; for (let n = 1; lectivos.length < 4 && n < 20; n++) { const d = sumarDias(hoy, -n); if (esLectivo(d)) lectivos.push(isoLocal(d)); }
  const f = i => lectivos[i] || isoLocal(hoy);
  return [a && { id: 1, alumnoId: a.id, alumno: a.nombre, grupo: a.curso, desde: f(3), hasta: f(2), motivo: "Enfermedad", nota: "Justificante del centro de salud", registra: profesores[2], ts: new Date().toISOString() },
          b && { id: 2, alumnoId: b.id, alumno: b.nombre, grupo: b.curso, desde: f(0), hasta: f(0), motivo: "Cita médica", nota: "", registra: profesores[5], ts: new Date().toISOString() }].filter(Boolean);
}

// Pasar lista en una clase: el grupo y la materia salen del horario del profesor/a
function PasarListaClase({ alumnos = [], horarios = {}, asistencia = [], setAsistencia, justificantes = [], usuario, cursos = [] }) {
  const hoy = isoLocal(new Date());
  const [fecha, setFecha] = useState(hoy);
  const clases = clasesDelDia(horarios, usuario, fecha);
  const horasClase = HORAS.filter(h => h !== "Recreo");
  const [hora, setHora] = useState(() => { const h = horaEnCurso(); return h && h !== "Recreo" ? h : Object.keys(clasesDelDia(horarios, usuario, hoy))[0] || horasClase[0]; });
  const deHorario = clases[hora];
  const [grupoLibre, setGrupoLibre] = useState("");
  const [materiaLibre, setMateriaLibre] = useState("");
  const grupo = deHorario?.grupo || grupoLibre, materia = deHorario?.materia || materiaLibre;
  const existente = asistencia.find(r => r.fecha === fecha && r.hora === hora && r.grupo === grupo);
  const [marcas, setMarcas] = useState({});
  const [hecho, setHecho] = useState("");
  useEffect(() => {
    const m = {}; (existente?.faltas || []).forEach(id => { m[id] = "falta"; }); (existente?.retrasos || []).forEach(id => { m[id] = "retraso"; });
    setMarcas(m);
  }, [fecha, hora, grupo, existente?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setHecho(""); }, [fecha, hora, grupo]);
  const lista = alumnos.filter(a => a.curso === grupo).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const siguiente = { undefined: "falta", falta: "retraso", retraso: undefined };
  const guardar = () => {
    const r = { id: existente?.id || Date.now(), fecha, hora, grupo, materia, profesor: usuario,
      faltas: lista.filter(a => marcas[a.id] === "falta").map(a => a.id), retrasos: lista.filter(a => marcas[a.id] === "retraso").map(a => a.id), ts: new Date().toISOString() };
    setAsistencia(prev => [...prev.filter(x => x.id !== r.id), r]);
    setHecho(`Lista guardada: ${grupo} · ${hora} · ${r.faltas.length} ${r.faltas.length === 1 ? "falta" : "faltas"} y ${r.retrasos.length} ${r.retrasos.length === 1 ? "retraso" : "retrasos"}.`);
  };
  const campo = { width: "100%", minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
  const etq = { display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo };
  const nF = lista.filter(a => marcas[a.id] === "falta").length, nR = lista.filter(a => marcas[a.id] === "retraso").length;
  return (
    <div>
      <TituloBloque titulo="Pasar lista" sub="Faltas y retrasos de cada clase: avisan a tiempo del absentismo y de la pérdida de la evaluación continua" icono="pasar-lista" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, margin: "16px 0 12px" }}>
        <label style={etq}>Día<input id="gd-asis-fecha" type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value || hoy)} style={campo} /></label>
        <label style={etq}>Hora
          <select id="gd-asis-hora" value={hora} onChange={e => setHora(e.target.value)} style={campo}>
            {horasClase.map(h => <option key={h} value={h}>{conTramo(h)}{clases[h] ? ` · ${clases[h].grupo}` : ""}</option>)}
          </select>
        </label>
        <label style={etq}>Grupo
          {deHorario ? <input value={`${deHorario.grupo} (según tu horario)`} readOnly style={{ ...campo, background: R.gris }} />
            : <select id="gd-asis-grupo" value={grupoLibre} onChange={e => setGrupoLibre(e.target.value)} style={campo}><option value="">Elige el grupo…</option>{cursos.map(c => <option key={c}>{c}</option>)}</select>}
        </label>
        <label style={etq}>Materia
          {deHorario ? <input value={deHorario.materia || ""} readOnly style={{ ...campo, background: R.gris }} />
            : <input id="gd-asis-materia" value={materiaLibre} onChange={e => setMateriaLibre(e.target.value)} placeholder="Materia" style={campo} />}
        </label>
      </div>
      {!grupo ? <div style={{ padding: 16, background: R.azulClaro, color: R.petroleo }}>A esa hora no tienes clase en tu horario: elige el grupo si estás con alguno (por ejemplo, cubriendo una guardia).</div> : (<>
        <div style={{ fontSize: 14, color: R.petroleo, marginBottom: 8 }}>{existente ? "Esta lista ya está guardada: puedes corregirla." : "Toca a quien falta: una vez, falta; dos veces, retraso; tres, vuelve a presente."} {nF} {nF === 1 ? "falta" : "faltas"} · {nR} {nR === 1 ? "retraso" : "retrasos"} · {lista.length} alumnos/as</div>
        {hecho && <div role="status" style={{ padding: "10px 14px", marginBottom: 10, background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))", gap: 6 }}>
          {lista.map(a => {
            const m = marcas[a.id], just = m === "falta" && justificada(a.id, fecha, justificantes);
            return (
              <button key={a.id} data-alumno-lista={a.id} aria-pressed={!!m} onClick={() => setMarcas(prev => ({ ...prev, [a.id]: siguiente[m] }))}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 48, padding: "8px 12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: 15,
                  border: `2px solid ${m === "falta" ? R.noche : m === "retraso" ? R.mostaza : R.turquesaClaro}`, background: m === "falta" ? R.crema : m === "retraso" ? "#FFF8E6" : "#fff", color: R.noche, borderRadius: 6 }}>
                <span>{a.nombre}</span>
                <strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>{m === "falta" ? (just ? "Falta · justificada" : "✗ Falta") : m === "retraso" ? "⏱ Retraso" : <span style={{ color: R.verdeOscuro }}>✓</span>}</strong>
              </button>
            );
          })}
        </div>
        <button onClick={guardar} style={{ marginTop: 12, width: "100%", minHeight: 52, border: "none", borderRadius: 6, background: R.azul, color: "#fff", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: "inherit" }}>Guardar la lista</button>
      </>)}
    </div>
  );
}

// Justificantes que entrega el alumnado: cualquier profesor/a puede registrarlos; el tutor/a recibe un aviso
function JustificantesAlumnado({ alumnos = [], justificantes = [], setJustificantes, usuario, tutores = {}, setMensajes, cursos = [] }) {
  const hoy = isoLocal(new Date());
  const [grupo, setGrupo] = useState(cursos[0] || "");
  const [alumnoId, setAlumnoId] = useState("");
  const [desde, setDesde] = useState(hoy), [hasta, setHasta] = useState(hoy);
  const [motivo, setMotivo] = useState(MOTIVOS_JUSTIFICANTE[0]);
  const [nota, setNota] = useState("");
  const [hecho, setHecho] = useState(""), [error, setError] = useState("");
  const delGrupo = alumnos.filter(a => a.curso === grupo).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const misTutorias = Object.entries(tutores).filter(([, t]) => t?.tutor === usuario).map(([c]) => c);
  const registrar = () => {
    const al = alumnos.find(a => String(a.id) === alumnoId);
    if (!al) { setError("Elige al alumno o alumna."); return; }
    if (hasta < desde) { setError("La fecha final es anterior a la inicial."); return; }
    const j = { id: Date.now(), alumnoId: al.id, alumno: al.nombre, grupo: al.curso, desde, hasta, motivo, nota: nota.trim(), registra: usuario, ts: new Date().toISOString() };
    setJustificantes(prev => [j, ...prev]);
    const tutor = tutores[al.curso]?.tutor;
    if (tutor && tutor !== usuario && setMensajes) setMensajes(prev => [mensajeRumbo(tutor, `📄 ${al.nombre} (${al.curso}) ha entregado un justificante (${motivo}) para ${desde === hasta ? `el ${fmtD(parseISO(desde))}` : `del ${fmtD(parseISO(desde))} al ${fmtD(parseISO(hasta))}`}. Lo ha recogido ${usuario}.`), ...prev]);
    setHecho(`Justificante registrado: ${al.nombre}${tutor && tutor !== usuario ? `. Avisado su tutor/a, ${tutor}.` : "."}`);
    setError(""); setAlumnoId(""); setNota("");
  };
  const visibles = justificantes.filter(j => j.registra === usuario || misTutorias.includes(j.grupo)).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 20);
  const campo = { width: "100%", minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
  const etq = { display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo };
  return (
    <div>
      <TituloBloque titulo="Justificantes del alumnado" sub="Cuando un alumno/a te entrega un justificante de sus faltas" icono="documentos" />
      <div style={{ background: R.azulClaro, padding: 16, margin: "16px 0", display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
          <label style={etq}>Grupo<select id="gd-just-grupo" value={grupo} onChange={e => { setGrupo(e.target.value); setAlumnoId(""); }} style={campo}>{cursos.map(c => <option key={c}>{c}</option>)}</select></label>
          <label style={etq}>Alumno/a<select id="gd-just-alumno" value={alumnoId} onChange={e => setAlumnoId(e.target.value)} style={campo}><option value="">Elige…</option>{delGrupo.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
          <label style={etq}>Desde<input id="gd-just-desde" type="date" value={desde} max={hoy} onChange={e => setDesde(e.target.value)} style={campo} /></label>
          <label style={etq}>Hasta<input id="gd-just-hasta" type="date" value={hasta} max={hoy} onChange={e => setHasta(e.target.value)} style={campo} /></label>
          <label style={etq}>Motivo<select id="gd-just-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} style={campo}>{MOTIVOS_JUSTIFICANTE.map(m => <option key={m}>{m}</option>)}</select></label>
        </div>
        <label style={etq}>Nota (opcional)<input id="gd-just-nota" value={nota} onChange={e => setNota(e.target.value)} placeholder="Por ejemplo: justificante del centro de salud" style={campo} /></label>
        <div style={{ fontSize: 13, color: R.petroleo }}>Las faltas de esos días quedan justificadas. El papel se entrega al tutor/a como siempre: aquí solo queda constancia.</div>
        {error && <div role="alert" style={{ color: R.noche, fontWeight: 700, borderLeft: `5px solid ${R.mostaza}`, paddingLeft: 8 }}>{error}</div>}
        <button onClick={registrar} style={{ minHeight: 52, border: "none", borderRadius: 6, background: R.azul, color: "#fff", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: "inherit" }}>Registrar el justificante</button>
        {hecho && <div role="status" style={{ padding: "10px 14px", background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
      </div>
      <div style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 14 }}>
        <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16, marginBottom: 6 }}>{misTutorias.length ? "Justificantes que has recogido y los de tu tutoría" : "Justificantes que has recogido"}</div>
        {visibles.length === 0 ? <div style={{ color: R.petroleo }}>Todavía no hay ninguno.</div> : visibles.map(j => (
          <div key={j.id} data-justificante={j.id} style={{ padding: "8px 0", borderTop: `1px solid ${R.gris}`, fontSize: 15, color: R.noche }}>
            <strong>{j.alumno}</strong> ({j.grupo}) · {j.motivo} · {j.desde === j.hasta ? fmtD(parseISO(j.desde)) : `${fmtD(parseISO(j.desde))} – ${fmtD(parseISO(j.hasta))}`}
            <div style={{ fontSize: 13, color: R.petroleo }}>{j.nota ? `${j.nota} · ` : ""}recogido por {j.registra}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gráfico de rosco: cada porción con su color, cifra y porcentaje en la leyenda (el color nunca va solo)
const COLORES_ROSCO = ["#1F6FB8", "#D99A12", "#2E9E78", "#8A4ECC", "#2BA3BD", "#C2410C"];
function Rosco({ titulo, datos = [], vacio = "Sin datos en este periodo", onPorcion, colores = null }) {
  const orden = [...datos].filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const top = orden.slice(0, 5), resto = orden.slice(5).reduce((n, d) => n + d.valor, 0);
  const porciones = resto ? [...top, { etiqueta: "Otros", valor: resto, otros: true }] : top;
  const total = porciones.reduce((n, d) => n + d.valor, 0);
  const R0 = 52, R1 = 80, C0 = 90;
  let ang = -Math.PI / 2;
  const punto = (r, a) => `${C0 + r * Math.cos(a)} ${C0 + r * Math.sin(a)}`;
  const arcos = porciones.map((d, i) => {
    const a0 = ang, a1 = ang + 2 * Math.PI * d.valor / total; ang = a1;
    const g = a1 - a0 > Math.PI ? 1 : 0, color = d.otros ? "#8A979C" : colores?.[d.etiqueta] || COLORES_ROSCO[i];
    const path = porciones.length === 1
      ? `M ${punto(R1, -Math.PI / 2)} A ${R1} ${R1} 0 1 1 ${punto(R1, 3 * Math.PI / 2 - 0.0001)} L ${punto(R0, 3 * Math.PI / 2 - 0.0001)} A ${R0} ${R0} 0 1 0 ${punto(R0, -Math.PI / 2)} Z`
      : `M ${punto(R1, a0)} A ${R1} ${R1} 0 ${g} 1 ${punto(R1, a1)} L ${punto(R0, a1)} A ${R0} ${R0} 0 ${g} 0 ${punto(R0, a0)} Z`;
    return { ...d, path, color, pct: Math.round(100 * d.valor / total) };
  });
  return (
    <figure data-rosco={titulo} style={{ margin: 0, background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 14, display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
      <figcaption style={{ fontWeight: 800, color: R.petroleo, fontSize: 15 }}>{titulo}</figcaption>
      {!total ? <div style={{ color: R.petroleo, fontSize: 14 }}>{vacio}</div> : (
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <svg viewBox="0 0 180 180" width="150" height="150" role="img" aria-label={`${titulo}: ${arcos.map(a => `${a.etiqueta} ${a.valor}`).join(", ")}`} style={{ flex: "none" }}>
            {arcos.map(a => (
              <path key={a.etiqueta} d={a.path} fill={a.color} stroke="#fff" strokeWidth="2" style={{ cursor: onPorcion && !a.otros ? "pointer" : "default" }} onClick={() => !a.otros && onPorcion?.(a)}>
                <title>{`${a.etiqueta}: ${a.valor} (${a.pct} %)`}</title>
              </path>
            ))}
            <text x="90" y="88" textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: R.noche, fontFamily: "inherit" }}>{total}</text>
            <text x="90" y="108" textAnchor="middle" style={{ fontSize: 12, fill: R.petroleo, fontFamily: "inherit" }}>en total</text>
          </svg>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4, flex: "1 1 150px", minWidth: 0 }}>
            {arcos.map(a => (
              <li key={a.etiqueta} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto", gap: 8, alignItems: "center", fontSize: 13, color: R.noche }}>
                <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: a.color }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.etiqueta}>{a.etiqueta}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: R.petroleo }}><strong style={{ color: R.noche }}>{a.valor}</strong> · {a.pct} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
const contar = (lista, clave) => Object.entries(lista.reduce((acc, x) => { const k = clave(x); if (k) acc[k] = (acc[k] || 0) + 1; return acc; }, {})).map(([etiqueta, valor]) => ({ etiqueta, valor }));

// Resumen de asistencia: Jefatura (todo el centro, con los límites) o tutor/a (su grupo)
function ResumenAsistencia({ alumnos = [], asistencia = [], justificantes = [], limites = LIMITES_ASISTENCIA, setLimites, grupos = null, puedeConfigurar = false }) {
  const hoy = isoLocal(new Date());
  const cursos = grupos || [...new Set(alumnos.map(a => a.curso))].sort();
  const [grupo, setGrupo] = useState(grupos?.length === 1 ? grupos[0] : "");
  const ambito = alumnos.filter(a => cursos.includes(a.curso) && (!grupo || a.curso === grupo));
  const filas = ambito.map(a => ({ a, s: situacionAsistencia({ alumno: a, asistencia, justificantes, limites, hoy }) }));
  const protocolo = filas.filter(f => f.s.absentismo === "supera").sort((x, y) => y.s.pctMes - x.s.pctMes);
  const riesgoAbs = filas.filter(f => f.s.absentismo === "riesgo");
  const evaluacion = filas.filter(f => f.s.evaluacion.length).sort((x, y) => y.s.evaluacion[0].pct - x.s.evaluacion[0].pct);
  const mes = hoy.slice(0, 7), regMes = asistencia.filter(r => r.fecha.startsWith(mes) && cursos.includes(r.grupo));
  const faltasMes = regMes.flatMap(r => r.faltas.map(id => ({ r, id })));
  const sinJust = faltasMes.filter(x => !justificada(x.id, x.r.fecha, justificantes));
  const etiquetaAbs = { supera: "Protocolo de absentismo", riesgo: "Cerca del límite" };
  const campo = { minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit" };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 14, color: R.noche, verticalAlign: "top" };
  const th = { textAlign: "left", padding: "8px 10px", background: R.gris, color: R.noche, fontSize: 14 };
  const pctAdd = (n, total) => total ? `${Math.round(100 * n / total)} %` : "-";
  return (
    <div>
      <TituloBloque titulo="Asistencia del alumnado" sub="Quién se acerca al protocolo de absentismo o a la pérdida de la evaluación continua" icono="pasar-lista" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", margin: "16px 0 12px" }}>
        {cursos.length > 1 && (
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Grupo
            <select id="gd-asis-res-grupo" value={grupo} onChange={e => setGrupo(e.target.value)} style={campo}><option value="">Todos</option>{cursos.map(c => <option key={c}>{c}</option>)}</select>
          </label>
        )}
        <div style={{ fontSize: 14, color: R.petroleo, flex: "1 1 260px" }}>Límites: <strong>{limites.absentismo} %</strong> de faltas sin justificar en el mes (absentismo) y <strong>{limites.evaluacion} %</strong> por materia en el curso (evaluación continua{limites.contarJustificadas ? ", contando las justificadas" : ", sin contar las justificadas"}). Se avisa también al 75 % del límite.</div>
      </div>
      {puedeConfigurar && setLimites && (
        <div data-limites style={{ background: R.azulClaro, padding: 12, marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Absentismo (% al mes)
            <input id="gd-lim-abs" type="number" min="1" max="100" value={limites.absentismo} onChange={e => setLimites({ ...limites, absentismo: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} style={{ ...campo, width: 100 }} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Evaluación continua (% por materia)
            <input id="gd-lim-eval" type="number" min="1" max="100" value={limites.evaluacion} onChange={e => setLimites({ ...limites, evaluacion: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} style={{ ...campo, width: 100 }} />
          </label>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", minHeight: 44, fontSize: 14, fontWeight: 700, color: R.petroleo }}>
            <input type="checkbox" checked={limites.contarJustificadas} onChange={e => setLimites({ ...limites, contarJustificadas: e.target.checked })} style={{ width: 20, height: 20, accentColor: R.azul }} />
            Contar las justificadas para la evaluación continua
          </label>
          <div style={{ fontSize: 13, color: R.petroleo, flex: "1 1 100%" }}>Ajústalos a lo que digan el Plan de convivencia y las normas de organización del centro.</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        {[["Protocolo de absentismo", protocolo.length, R.noche], ["Cerca del límite", riesgoAbs.length, R.mostaza], ["Riesgo de perder la evaluación continua", evaluacion.length, R.morado], ["Faltas sin justificar este mes", sinJust.length, R.azul]].map(([t, v, col]) => (
          <div key={t} data-total={t} style={{ background: "#fff", padding: 12, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${col}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: R.noche }}>{v}</div><div style={{ fontSize: 13, color: R.petroleo }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: 12, marginBottom: 14 }}>
        <Rosco titulo="Faltas sin justificar este mes, por grupo" datos={contar(sinJust, x => x.r.grupo)} />
        <Rosco titulo="Faltas este mes, por materia" datos={contar(faltasMes, x => x.r.materia)} />
        <Rosco titulo="Faltas este mes: justificadas o no" datos={[{ etiqueta: "Sin justificar", valor: sinJust.length }, { etiqueta: "Justificadas", valor: faltasMes.length - sinJust.length }]} />
      </div>
      <div style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 14, overflowX: "auto" }}>
        <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16, marginBottom: 8 }}>Alumnado al que conviene prestar atención</div>
        {!protocolo.length && !riesgoAbs.length && !evaluacion.length ? <div style={{ color: R.petroleo }}>Nadie supera ni se acerca a los límites.</div> : (
          <table data-tabla="asistencia-alerta" style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead><tr><th style={th}>Alumno/a</th><th style={th}>Este mes</th><th style={th}>Situación</th><th style={th}>Materias</th></tr></thead>
            <tbody>{[...protocolo, ...riesgoAbs, ...evaluacion.filter(f => f.s.absentismo === "ok")].map(({ a, s }) => (
              <tr key={a.id} data-alumno-asistencia={a.id}>
                <td style={td}><strong>{a.nombre}</strong><div style={{ fontSize: 13, color: R.petroleo }}>{a.curso}</div></td>
                <td style={td}>{s.faltasMes} de {s.sesionesMes} clases · <strong>{pctAdd(s.faltasMes, s.sesionesMes)}</strong></td>
                <td style={td}>{s.absentismo !== "ok" ? <span style={{ background: s.absentismo === "supera" ? R.noche : R.crema, color: s.absentismo === "supera" ? "#fff" : R.noche, padding: "2px 8px", fontWeight: 700, fontSize: 13 }}>{etiquetaAbs[s.absentismo]}</span> : "—"}</td>
                <td style={td}>{s.evaluacion.length ? <>
                  {s.evaluacion.slice(0, 3).map(m => <div key={m.materia}><strong>{m.materia}</strong>: {m.faltas} de {m.sesiones} ({m.pct} %){m.estado === "supera" ? " · supera el límite" : " · cerca"}</div>)}
                  {s.evaluacion.length > 3 && <div style={{ color: R.petroleo }}>y {s.evaluacion.length - 3} {s.evaluacion.length - 3 === 1 ? "materia más" : "materias más"} ({s.evaluacion.filter(m => m.estado === "supera").length} superan el límite en total)</div>}
                </> : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Comparativa de partes entre grupos del mismo nivel y entre niveles, con sus posibles causas
function ComparativaCursos({ partes = [] }) {
  const niveles = [...new Set(partes.map(p => nivelDe(p.curso)))].filter(Boolean).sort();
  const [nivel, setNivel] = useState(niveles[0] || "");
  const [grupo, setGrupo] = useState("");
  const nv = niveles.includes(nivel) ? nivel : niveles[0] || "";
  const delNivel = partes.filter(p => nivelDe(p.curso) === nv);
  const foco = grupo ? delNivel.filter(p => p.curso === grupo) : delNivel;
  const causas = contar(foco, p => etiquetaTip(p) || p.tipo);
  const horas = contar(foco, p => p.hora);
  const gravedad = contar(foco, p => sinEmoji(gObj(p.gravedad)?.label));
  // Lectura automática: lo que más pesa en el grupo con más partes del nivel
  const porGrupo = contar(delNivel, p => p.curso).sort((a, b) => b.valor - a.valor);
  const top = (l) => [...l].sort((a, b) => b.valor - a.valor)[0];
  const lectura = (() => {
    if (!foco.length) return "";
    const g = grupo || porGrupo[0]?.etiqueta, base = grupo ? foco : delNivel.filter(p => p.curso === g);
    const c = top(contar(base, p => etiquetaTip(p) || p.tipo)), h = top(contar(base, p => p.hora));
    const media = porGrupo.length ? delNivel.length / porGrupo.length : 0;
    return `${g}: ${base.length} partes${!grupo && porGrupo.length > 1 ? ` (la media del nivel es ${media.toLocaleString("es-ES", { maximumFractionDigits: 1 })})` : ""}. La causa más frecuente es «${c?.etiqueta}» (${Math.round(100 * (c?.valor || 0) / base.length)} %)${h ? ` y se concentran a ${h.etiqueta}` : ""}.`;
  })();
  const campo = { minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit" };
  if (!partes.length) return null;
  return (
    <div data-comparativa style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 16, marginBottom: 14 }}>
      <h3 style={{ margin: "0 0 4px", color: R.petroleo, fontSize: 18 }}>Comparativa entre grupos y niveles</h3>
      <div style={{ fontSize: 14, color: R.petroleo, marginBottom: 10 }}>Partes del periodo elegido. Toca una porción del primer rosco para ver ese grupo.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Nivel
          <select id="gd-comp-nivel" value={nv} onChange={e => { setNivel(e.target.value); setGrupo(""); }} style={campo}>{niveles.map(n => <option key={n}>{n}</option>)}</select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Causas de
          <select id="gd-comp-grupo" value={grupo} onChange={e => setGrupo(e.target.value)} style={campo}><option value="">Todo el nivel</option>{porGrupo.map(g => <option key={g.etiqueta}>{g.etiqueta}</option>)}</select>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: 12 }}>
        <Rosco titulo={`Grupos de ${nv}`} datos={porGrupo} onPorcion={a => setGrupo(a.etiqueta)} />
        <Rosco titulo="Todos los niveles" datos={contar(partes, p => nivelDe(p.curso))} />
        <Rosco titulo={`Posibles causas · ${grupo || nv}`} datos={causas} />
        <Rosco titulo={`Horas en que ocurren · ${grupo || nv}`} datos={horas} />
        <Rosco titulo={`Gravedad · ${grupo || nv}`} datos={gravedad} colores={Object.fromEntries(GRAVEDAD.map(g => [sinEmoji(g.label), COLOR_GRAVEDAD[g.id]]))} />
      </div>
      {lectura && <p data-lectura style={{ margin: "12px 0 0", padding: "10px 14px", background: R.azulClaro, borderLeft: `5px solid ${R.azul}`, color: R.noche, fontSize: 15 }}>💡 {lectura}</p>}
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
  const pos = POSITIVAS_PDF.filter(x => x.alumnoId === alumno.id && (!periodo.desde || isoLocal(x.ts) >= periodo.desde) && (!periodo.hasta || isoLocal(x.ts) <= periodo.hasta))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  if (pos.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text(`Aspectos positivos (${pos.length})`, 14, y); doc.setTextColor(0);
    autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Fecha", "Conducta positiva", "Profesor/a", "Detalle"]], headStyles: { ...estiloTabla.headStyles, fillColor: [46, 125, 35] },
      body: pos.map(x => [fmtD(x.ts), x.tipo, x.profesor, x.detalle || "-"].map(sinEmoji)), columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 48 }, 2: { cellWidth: 32 } } });
    y = doc.lastAutoTable.finalY + 8;
    if (y > 250) { doc.addPage(); y = 24; }
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
// Correos del centro (Jefatura, Orientación…) configurables en Secretaría
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
              <span style={{ fontSize: 15, lineHeight: 1.3, minWidth: 0 }}><b style={{ color: R.petroleo }}>{o.label}</b><br /><span style={{ color: R.petroleo, fontSize: 14 }}>{ok ? <>{o.email.split("@")[0]}@<wbr />{o.email.split("@").slice(1).join("@")}</> : DESTINOS_CENTRO.some(d => d.id === o.id) ? "Sin correo: añádelo en Secretaría" : "Sin correo registrado"}</span></span>
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

// Correos del centro, en Secretaría
// Zonas de guardia (Jefatura de Estudios): nombre, edificio, añadir y ocultar. Nunca se borran:
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

// ─── Espacios: aulas especiales con su reserva y su llave ─────────────────────
// Espacio: {id, nombre, edificio, custodia: "conserjeria" | "direccion", reservable, llave, oculta}
// Préstamo de llave: {id, llaveId, llave, profesor, salida, devolucion, anotaSalida, anotaDevolucion}
// Reserva: {id, espacioId, espacio, fecha, hora, profesor, grupo, actividad, anota, ts}
const ESPACIOS_POR_DEFECTO = [
  { id: "lab-ciencias", nombre: "Laboratorio de Ciencias", edificio: "A", custodia: "conserjeria", reservable: true, llave: true },
  { id: "lab-fyq", nombre: "Laboratorio de Física y Química", edificio: "A", custodia: "conserjeria", reservable: true, llave: true },
  { id: "informatica-1", nombre: "Aula de Informática 1", edificio: "A", custodia: "conserjeria", reservable: true, llave: true },
  { id: "informatica-2", nombre: "Aula de Informática 2", edificio: "B", custodia: "conserjeria", reservable: true, llave: true },
  { id: "sum", nombre: "Sala de usos múltiples", edificio: "A", custodia: "conserjeria", reservable: true, llave: true },
  { id: "economia", nombre: "Aula de Economía", edificio: "B", custodia: "conserjeria", reservable: true, llave: true },
  { id: "musica", nombre: "Aula de Música", edificio: "B", custodia: "conserjeria", reservable: true, llave: true },
  { id: "tecnologia", nombre: "Taller de Tecnología", edificio: "B", custodia: "conserjeria", reservable: true, llave: true },
  { id: "plastica", nombre: "Aula de Plástica", edificio: "B", custodia: "conserjeria", reservable: true, llave: true },
  { id: "gimnasio", nombre: "Gimnasio", edificio: "", custodia: "conserjeria", reservable: true, llave: true },
  { id: "salon-actos", nombre: "Salón de actos", edificio: "A", custodia: "conserjeria", reservable: true, llave: true },
  { id: "biblioteca", nombre: "Biblioteca", edificio: "A", custodia: "conserjeria", reservable: true, llave: true },
  { id: "archivo", nombre: "Archivo", edificio: "A", custodia: "direccion", reservable: false, llave: true },
  { id: "servidores", nombre: "Sala de servidores", edificio: "A", custodia: "direccion", reservable: false, llave: true },
  { id: "examenes", nombre: "Armario de exámenes", edificio: "A", custodia: "direccion", reservable: false, llave: true },
];
const CUSTODIA = { conserjeria: "Conserjería", direccion: "Dirección" };
const listaEspacios = espacios => (espacios?.length ? espacios : ESPACIOS_POR_DEFECTO);
const conLlave = e => e.llave !== false, reservable = e => e.reservable !== false;
// Sin devolver: se la llevó otro día, o ya ha terminado la última hora de hoy
const llaveSinDevolver = (p, ahora = new Date()) => !p.devolucion && (isoLocal(p.salida) < isoLocal(ahora) || horaTerminada(isoLocal(ahora), HORAS[HORAS.length - 1], ahora));
function prestamosEjemplo(profesores, sugerido) {
  const hoy = new Date(), ayer = sumarDias(hoy, -1);
  while (!esLectivo(ayer)) ayer.setDate(ayer.getDate() - 1);
  const a = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const p = i => profesores[i % profesores.length];
  const l = [
    { llaveId: "lab-ciencias", profesor: p(5), salida: a(hoy, 8, 22), devolucion: a(hoy, 10, 25) },
    { llaveId: "informatica-1", profesor: p(9), salida: a(hoy, 9, 20), devolucion: null },
    { llaveId: "gimnasio", profesor: p(13), salida: a(hoy, 8, 25), devolucion: null },
    { llaveId: "musica", profesor: p(2), salida: a(hoy, 11, 40), devolucion: null, anotaSalida: "Conserjería" },
    { llaveId: "archivo", profesor: p(1), salida: a(hoy, 10, 5), devolucion: a(hoy, 10, 30) },
    { llaveId: "tecnologia", profesor: p(17), salida: a(ayer, 13, 30), devolucion: null },
    { llaveId: "salon-actos", profesor: p(7), salida: a(ayer, 9, 15), devolucion: a(ayer, 11, 20) },
  ];
  if (sugerido) l.push({ llaveId: "informatica-2", profesor: sugerido, salida: a(hoy, 8, 28), devolucion: null });
  return l.filter(x => x.profesor).map(x => ({ ...x, devolucion: x.devolucion && new Date(x.devolucion) <= hoy ? x.devolucion : null })).map((x, i) => ({ id: 8000 + i, llave: ESPACIOS_POR_DEFECTO.find(k => k.id === x.llaveId).nombre, anotaSalida: x.anotaSalida || x.profesor, anotaDevolucion: x.devolucion ? (x.anotaSalida || x.profesor) : null, ...x }))
    .filter(x => new Date(x.salida) <= hoy);
}
function pdfLlaves(fecha, llaves, prestamos) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, "Registro de llaves", parseISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  const fuera = id => prestamos.find(p => p.llaveId === id && !p.devolucion);
  autoTable(doc, { ...estiloTabla, startY: y, head: [["Aula / llave", "Se guarda en", "Estado ahora"]],
    body: llaves.map(k => { const f = fuera(k.id); return [k.nombre, CUSTODIA[k.custodia], f ? `La tiene ${f.profesor} desde ${fmtD(f.salida)} ${horaCorta(f.salida)}` : "Disponible"].map(sinEmoji); }) });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...OSCURO); doc.text("Movimientos del día", 14, y);
  const movs = movimientosLlaves(prestamos, fecha);
  autoTable(doc, { ...estiloTabla, startY: y + 3, head: [["Hora", "Aula / llave", "Profesor/a", "Movimiento", "Anotado por"]],
    body: movs.length ? movs.map(m => [horaCorta(m.ts), m.llave, m.profesor, m.tipo === "salida" ? "Se la lleva" : "La deja", m.anota || "-"].map(sinEmoji)) : [["-", "Sin movimientos", "", "", ""]] });
  guardarPDF(doc, `llaves-${fecha}.pdf`);
}
// Cada préstamo da dos movimientos: cuando se la lleva y cuando la deja
const movimientosLlaves = (prestamos, fecha) => prestamos.flatMap(p => [
  { id: `${p.id}-s`, ts: p.salida, tipo: "salida", llave: p.llave, profesor: p.profesor, anota: p.anotaSalida },
  ...(p.devolucion ? [{ id: `${p.id}-d`, ts: p.devolucion, tipo: "devolucion", llave: p.llave, profesor: p.profesor, anota: p.anotaDevolucion }] : []),
]).filter(m => isoLocal(m.ts) === fecha).sort((a, b) => b.ts.localeCompare(a.ts));

// gestion: Conserjería y Jefatura anotan por cualquier profesor/a; el profesorado, solo por sí mismo
function Llaves({ espacios, prestamos = [], setPrestamos, reservas = [], profesores = [], usuario, gestion = false }) {
  const lista = listaEspacios(espacios).filter(k => !k.oculta && conLlave(k));
  const horaAhora = horaEnCurso();
  const reservaAhora = id => horaAhora && reservas.find(r => r.espacioId === id && r.fecha === isoLocal(new Date()) && r.hora === horaAhora);
  const hoy = isoLocal(new Date());
  const [fecha, setFecha] = useState(hoy);
  const [donde, setDonde] = useState(""); // "" = todas
  const [quien, setQuien] = useState({}); // llaveId -> profesor elegido (gestión)
  const fuera = id => prestamos.find(p => p.llaveId === id && !p.devolucion);
  const sacar = (k, profesor) => {
    if (!profesor || fuera(k.id)) return;
    const ahora = new Date().toISOString();
    setPrestamos(prev => [{ id: Date.now(), llaveId: k.id, llave: k.nombre, profesor, salida: ahora, devolucion: null, anotaSalida: usuario, anotaDevolucion: null }, ...prev]);
    setQuien(q => ({ ...q, [k.id]: "" }));
  };
  const devolver = p => setPrestamos(prev => prev.map(x => x.id === p.id ? { ...x, devolucion: new Date().toISOString(), anotaDevolucion: usuario } : x));
  const visibles = lista.filter(k => !donde || k.custodia === donde);
  const nFuera = lista.filter(k => fuera(k.id)).length;
  const nSinDev = prestamos.filter(p => llaveSinDevolver(p) && lista.some(k => k.id === p.llaveId)).length;
  const movs = movimientosLlaves(prestamos, fecha);
  const th = { textAlign: "left", padding: "10px 12px", background: R.azul, color: "#fff", fontSize: 15, whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 15, color: R.noche, verticalAlign: "middle" };
  const boton = (fondo, letra, borde) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: borde ? `2px solid ${borde}` : "none", background: fondo, color: letra, fontWeight: 700, fontSize: 15, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" });
  const chip = (id, txt) => <button key={id || "todas"} aria-pressed={donde === id} onClick={() => setDonde(id)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 20, border: `2px solid ${donde === id ? R.azul : R.turquesaClaro}`, background: donde === id ? R.azulClaro : "#fff", color: R.petroleo, fontWeight: donde === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", fontSize: 15 }}>{txt}</button>;
  return (
    <div>
      <TituloBloque titulo="Llaves" sub="Quién tiene la llave de cada espacio y quién la coge o la deja" icono="llave" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, margin: "16px 0 14px" }}>
        {[["Fuera ahora", nFuera, R.mostaza], ["Disponibles", lista.length - nFuera, R.verde], ["Sin devolver", nSinDev, R.noche]].map(([t, v, col]) => (
          <div key={t} data-total={t} style={{ background: C.white, padding: 12, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${col}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: R.noche }}>{v}</div>
            <div style={{ fontSize: 14, color: R.petroleo }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>{chip("", "Todas")}{chip("conserjeria", "En Conserjería")}{chip("direccion", "En Dirección")}</div>
      <style>{`@media (max-width: 640px) {
        .gd-tabla-llaves { min-width: 0 !important; }
        .gd-tabla-llaves thead { display: none; }
        .gd-tabla-llaves tr { display: grid; grid-template-columns: 1fr auto; grid-template-areas: "n c" "q q" "a a"; gap: 6px 10px; padding: 12px; border-bottom: 1px solid ${R.turquesaClaro}; }
        .gd-tabla-llaves td { border: none !important; padding: 0 !important; }
        .gd-tabla-llaves .gd-ll-n { grid-area: n; } .gd-tabla-llaves .gd-ll-c { grid-area: c; font-size: 13px !important; text-align: right; }
        .gd-tabla-llaves .gd-ll-q { grid-area: q; } .gd-tabla-llaves .gd-ll-a { grid-area: a; }
        .gd-tabla-llaves .gd-ll-a:empty { display: none; }
      }`}</style>
      <div style={{ overflowX: "auto", background: C.white, border: `1px solid ${R.turquesaClaro}`, marginBottom: 20 }}>
        <table data-tabla="llaves" className="gd-tabla-llaves" style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr><th style={th}>Aula / llave</th><th style={th}>Se guarda en</th><th style={th}>Quién la tiene</th><th style={{ ...th, textAlign: "right" }}>Anotar</th></tr></thead>
          <tbody>{visibles.map(k => {
            const f = fuera(k.id), tarde = f && llaveSinDevolver(f), mia = f && f.profesor === usuario;
            return (
              <tr key={k.id} data-llave={k.id} style={{ background: f ? (tarde ? R.crema : "#FFFBF0") : C.white }}>
                <td className="gd-ll-n" style={td}><strong>{k.nombre}</strong>{k.edificio ? <div style={{ fontSize: 13, color: R.petroleo }}>Edificio {k.edificio}</div> : null}</td>
                <td className="gd-ll-c" style={td}>{CUSTODIA[k.custodia]}</td>
                <td className="gd-ll-q" style={td}>{f
                  ? <span><strong>{f.profesor}</strong><div style={{ fontSize: 13, color: tarde ? R.noche : R.petroleo, fontWeight: tarde ? 700 : 400 }}>{tarde ? "⚠️ Sin devolver · " : ""}desde {isoLocal(f.salida) === hoy ? `las ${horaCorta(f.salida)}` : `el ${fmtD(f.salida)} a las ${horaCorta(f.salida)}`}</div></span>
                  : <span style={{ color: R.verdeOscuro, fontWeight: 700 }}>✓ Disponible</span>}
                  {reservaAhora(k.id) && <div data-reserva-ahora style={{ fontSize: 13, color: R.petroleo, marginTop: 2 }}>📅 Reservada ahora: {reservaAhora(k.id).profesor}{reservaAhora(k.id).grupo ? ` · ${reservaAhora(k.id).grupo}` : ""}</div>}</td>
                <td className="gd-ll-a" style={{ ...td, textAlign: "right" }}>
                  {f ? ((gestion || mia) && <button onClick={() => devolver(f)} style={boton(R.verde, R.noche)}>{mia && !gestion ? "La devuelvo" : "Devuelta"}</button>)
                    : gestion ? (
                      <span style={{ display: "inline-flex", gap: 6, flexWrap: "nowrap", justifyContent: "flex-end" }}>
                        <select aria-label={`Quién se lleva la llave de ${k.nombre}`} value={quien[k.id] || ""} onChange={e => setQuien(q => ({ ...q, [k.id]: e.target.value }))}
                          style={{ minHeight: 44, maxWidth: 190, minWidth: 0, flex: "1 1 auto", padding: "0 8px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 15, color: R.noche, background: "#fff", fontFamily: "inherit" }}>
                          <option value="">¿Quién se la lleva?</option>
                          {[...profesores].sort((a, b) => a.localeCompare(b, "es")).map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button onClick={() => sacar(k, quien[k.id])} disabled={!quien[k.id]} style={{ ...boton(quien[k.id] ? R.azul : R.gris, quien[k.id] ? "#fff" : R.petroleo), cursor: quien[k.id] ? "pointer" : "not-allowed" }}>Se la lleva</button>
                      </span>
                    ) : <button onClick={() => sacar(k, usuario)} disabled={!usuario} style={boton(R.azul, "#fff")}>Me la llevo</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div style={{ background: C.white, border: `1px solid ${R.turquesaClaro}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 17 }}><Ic n="horario" tam={24} />Quién coge y quién deja</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 2, fontSize: 14, color: R.petroleo, fontWeight: 700 }}>Día
              <input id="gd-llaves-fecha" type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value || hoy)} style={{ minHeight: 44, padding: "0 8px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 15, color: R.noche, fontFamily: "inherit" }} />
            </label>
            <button onClick={() => pdfLlaves(fecha, lista, prestamos)} style={boton(R.azul, "#fff")}>Descargar PDF</button>
          </div>
        </div>
        {movs.length === 0 ? <div style={{ padding: 14, textAlign: "center", color: R.petroleo }}>Ningún movimiento este día.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table data-tabla="movimientos" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ ...th, background: R.gris, color: R.noche }}>Hora</th><th style={{ ...th, background: R.gris, color: R.noche }}>Aula / llave</th><th style={{ ...th, background: R.gris, color: R.noche }}>Profesor/a</th><th style={{ ...th, background: R.gris, color: R.noche }}>Movimiento</th></tr></thead>
              <tbody>{movs.map(m => (
                <tr key={m.id}>
                  <td style={td}>{horaCorta(m.ts)}</td><td style={td}>{m.llave}</td>
                  <td style={td}>{m.profesor}{m.anota && m.anota !== m.profesor ? <div style={{ fontSize: 13, color: R.petroleo }}>Anotado por {m.anota}</div> : null}</td>
                  <td style={td}>{m.tipo === "salida" ? <span style={{ background: R.crema, padding: "2px 10px", fontWeight: 700 }}>Se la lleva</span> : <span style={{ background: R.verdeCaminoClaro, color: R.verdeOscuro, padding: "2px 10px", fontWeight: 700 }}>La deja</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
// Reservas de ejemplo para la semana en curso
function reservasEjemplo(profesores, cursos, sugerido) {
  const lunes = lunesDe(), p = i => profesores[i % profesores.length], c = i => cursos.length ? cursos[i % cursos.length] : "";
  const plan = [
    ["lab-ciencias", 0, "2ª hora", 3, "Práctica: la célula"], ["lab-ciencias", 1, "4ª hora", 6, ""], ["lab-ciencias", 2, "3ª hora", 3, "Práctica de microscopio"],
    ["lab-fyq", 2, "5ª hora", 11, "Reacciones químicas"], ["informatica-1", 0, "1ª hora", 8, ""], ["informatica-1", 2, "2ª hora", 8, "Examen práctico"],
    ["informatica-1", 3, "6ª hora", 15, ""], ["informatica-2", 1, "3ª hora", 4, "Programación"], ["sum", 2, "Recreo", 2, "Ensayo de la obra de teatro"],
    ["sum", 4, "4ª hora", 19, "Charla de orientación"], ["economia", 1, "2ª hora", 12, "Simulación de empresa"], ["salon-actos", 3, "5ª hora", 1, "Graduación: ensayo"],
    ["salon-actos", 3, "6ª hora", 1, "Graduación: ensayo"], ["gimnasio", 4, "1ª hora", 13, ""], ["biblioteca", 2, "6ª hora", 21, "Club de lectura"],
  ];
  const l = plan.map(([espacioId, d, hora, i, actividad], k) => ({ espacioId, fecha: isoLocal(sumarDias(lunes, d)), hora, profesor: p(i), grupo: c(k), actividad }));
  if (sugerido) {
    l.push({ espacioId: "informatica-2", fecha: isoLocal(sumarDias(lunes, 2)), hora: "6ª hora", profesor: sugerido, grupo: c(3), actividad: "Trabajo de investigación" });
    l.push({ espacioId: "lab-ciencias", fecha: isoLocal(sumarDias(lunes, 4)), hora: "3ª hora", profesor: sugerido, grupo: c(5), actividad: "" });
  }
  const ts = new Date().toISOString();
  return l.map((r, k) => ({ id: 9000 + k, espacio: ESPACIOS_POR_DEFECTO.find(e => e.id === r.espacioId).nombre, anota: r.profesor, ts, ...r }));
}
const diaSemana = f => parseISO(f).toLocaleDateString("es-ES", { weekday: "long" });
const diaCorto = f => { const t = parseISO(f).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
function pdfReservas(esp, dias, reservas) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const rango = `${parseISO(dias[0]).toLocaleDateString("es-ES", { day: "numeric", month: "long" })} al ${parseISO(dias[4]).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`;
  const y = cabeceraPDF(doc, `Reservas · ${esp.nombre}`, `Semana del ${rango}`);
  const celda = (f, h) => { const r = reservas.find(x => x.espacioId === esp.id && x.fecha === f && x.hora === h); return r ? `${r.grupo ? `${r.grupo} · ` : ""}${r.profesor}${r.actividad ? `\n${r.actividad}` : ""}` : ""; };
  autoTable(doc, { ...estiloTabla, startY: y, head: [["Hora", ...dias.map(diaCorto)]],
    body: HORAS.map(h => [`${h}\n${HORARIO[h]}`, ...dias.map(f => celda(f, h))].map(sinEmoji)),
    styles: { ...estiloTabla.styles, fontSize: 10 }, columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" } } });
  guardarPDF(doc, `reservas-${esp.id}-${dias[0]}.pdf`);
}
function useEstrecho(px = 640) {
  const q = `(max-width: ${px}px)`;
  const [e, setE] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(q).matches);
  useEffect(() => { const m = window.matchMedia?.(q); if (!m) return; const h = () => setE(m.matches); m.addEventListener?.("change", h); return () => m.removeEventListener?.("change", h); }, [q]);
  return e;
}
// Reservar un espacio por día y hora. gestion: Jefatura y Conserjería reservan para cualquiera y anulan cualquier reserva
// Novedad: {id, tipo: "reserva" | "anulacion", espacio, fecha, hora, profesor, semanas, por, ts}. Todo el claustro las ve.
function Reservas({ espacios, reservas = [], setReservas, profesores = [], cursos = [], usuario, gestion = false, novedades = [], onNovedad, vistoHasta = "", onVisto }) {
  // Lo nuevo desde la última vez que esta persona miró las reservas; al entrar queda visto
  const [desde] = useState(vistoHasta);
  useEffect(() => { onVisto?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const avisar = (tipo, r, semanas = 1) => onNovedad?.({ id: Date.now() + Math.random(), tipo, espacio: r.espacio, fecha: r.fecha, hora: r.hora, profesor: r.profesor, semanas, por: usuario, ts: new Date().toISOString() });
  const lista = listaEspacios(espacios).filter(e => !e.oculta && reservable(e));
  const [espId, setEspId] = useState(lista[0]?.id || "");
  const esp = lista.find(e => e.id === espId) || lista[0];
  const hoy = isoLocal(new Date());
  const [lunes, setLunes] = useState(() => isoLocal(lunesDe()));
  const dias = [0, 1, 2, 3, 4].map(i => isoLocal(sumarDias(lunes, i)));
  const [diaMovil, setDiaMovil] = useState(() => dias.includes(hoy) ? hoy : dias[0]);
  const estrecho = useEstrecho();
  const [sel, setSel] = useState(null); // {fecha, hora}
  const finCurso = `${Number(inicioCurso(hoy).slice(0, 4)) + 1}-06-23`;
  const [form, setForm] = useState({ para: "", grupo: "", actividad: "", repetir: false, hasta: finCurso });
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");
  const panel = useRef(null);
  const de = (f, h) => esp && reservas.find(r => r.espacioId === esp.id && r.fecha === f && r.hora === h);
  const cambiarSemana = n => { const l = isoLocal(sumarDias(lunes, n * 7)); setLunes(l); setDiaMovil(n === 0 ? hoy : l); setSel(null); };
  const elegir = (f, h) => { setSel({ fecha: f, hora: h }); setError(""); setHecho(""); setForm({ para: "", grupo: "", actividad: "", repetir: false, hasta: finCurso }); setTimeout(() => panel.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }), 50); };
  const reservar = () => {
    const quien = gestion ? form.para : usuario;
    if (!quien) { setError("Elige para quién es la reserva."); return; }
    if (de(sel.fecha, sel.hora)) { setError("Esa hora ya está reservada."); return; }
    const otra = reservas.find(r => r.profesor === quien && r.fecha === sel.fecha && r.hora === sel.hora);
    if (otra) { setError(`${quien === usuario ? "Ya tienes" : `${quien} ya tiene`} reservado ${otra.espacio} a esa hora.`); return; }
    // Reserva de un día o, si se repite, el mismo día de la semana hasta la fecha elegida (solo días lectivos)
    const fechas = [sel.fecha];
    if (form.repetir) {
      if (!form.hasta || form.hasta <= sel.fecha) { setError("Elige hasta qué fecha se repite."); return; }
      for (let d = sumarDias(sel.fecha, 7); isoLocal(d) <= form.hasta && fechas.length < 45; d = sumarDias(d, 7)) if (esLectivo(d)) fechas.push(isoLocal(d));
    }
    const ocupada = f => reservas.some(r => r.fecha === f && r.hora === sel.hora && (r.espacioId === esp.id || r.profesor === quien));
    const libres = fechas.filter(f => !ocupada(f)), saltadas = fechas.filter(ocupada);
    const base = Date.now(), serie = form.repetir ? base : undefined, ts = new Date().toISOString();
    setReservas(prev => [...prev, ...libres.map((f, i) => ({ id: base + i, espacioId: esp.id, espacio: esp.nombre, fecha: f, hora: sel.hora, profesor: quien, grupo: form.grupo, actividad: form.actividad.trim(), anota: usuario, ts, ...(serie ? { serie } : {}) }))]);
    if (libres.length) avisar("reserva", { espacio: esp.nombre, fecha: libres[0], hora: sel.hora, profesor: quien }, libres.length);
    setHecho(form.repetir
      ? `Reservado ${esp.nombre} ${libres.length} ${libres.length === 1 ? "semana" : "semanas"}, ${diaSemana(sel.fecha)} a ${sel.hora}.${saltadas.length ? ` No se ha podido reservar ${saltadas.map(f => fmtD(parseISO(f))).join(", ")} porque ya estaba ocupado.` : ""}`
      : `Reservado ${esp.nombre} · ${diaCorto(sel.fecha)} · ${sel.hora}.`);
    setSel(null);
  };
  const anular = r => { setReservas(prev => prev.filter(x => x.id !== r.id)); avisar("anulacion", r); };
  // Anula las semanas que quedan de una serie (las ya pasadas se conservan)
  const anularSerie = serie => {
    const quedan = reservas.filter(x => x.serie === serie && !horaTerminada(x.fecha, x.hora)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    setReservas(prev => prev.filter(x => x.serie !== serie || horaTerminada(x.fecha, x.hora)));
    if (quedan.length) avisar("anulacion", quedan[0], quedan.length);
  };
  const puedeAnular = r => (gestion || r.profesor === usuario) && !horaTerminada(r.fecha, r.hora);
  const mias = reservas.filter(r => r.profesor === usuario && !horaTerminada(r.fecha, r.hora)).sort((a, b) => a.fecha.localeCompare(b.fecha) || HORAS.indexOf(a.hora) - HORAS.indexOf(b.hora));
  const boton = (fondo, letra, borde) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: borde ? `2px solid ${borde}` : "none", background: fondo, color: letra, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" });
  const campo = { width: "100%", minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
  const Celda = ({ f, h }) => {
    const r = de(f, h), elegida = sel?.fecha === f && sel?.hora === h;
    if (r) return (
      <div data-reserva={r.id} style={{ background: r.profesor === usuario ? R.verdeCaminoClaro : R.azulClaro, borderLeft: `4px solid ${r.profesor === usuario ? R.verdeCamino : R.azul}`, padding: "6px 8px", fontSize: 13, color: R.noche, lineHeight: 1.35, textAlign: "left" }}>
        <strong>{r.serie ? "🔁 " : ""}{r.grupo || "Reservada"}</strong><div>{r.profesor}</div>{r.actividad && <div style={{ color: R.petroleo }}>{r.actividad}</div>}
        {puedeAnular(r) && <button onClick={() => anular(r)} aria-label={`Anular la reserva de ${r.profesor} el ${diaCorto(f)} a ${h}`} style={{ marginTop: 4, minHeight: 32, padding: "0 8px", border: `1px solid ${R.turquesa}`, borderRadius: 4, background: "#fff", color: R.petroleo, fontSize: 13, cursor: "pointer" }}>Anular</button>}
      </div>
    );
    if (horaEmpezada(f, h)) return <span aria-hidden="true" style={{ color: R.gris }}>—</span>;
    return <button data-celda={`${f}|${h}`} onClick={() => elegir(f, h)} aria-pressed={elegida} aria-label={`Reservar ${esp.nombre} el ${diaCorto(f)} a ${h}`}
      style={{ width: "100%", minHeight: 44, border: `1px dashed ${elegida ? R.azul : R.turquesa}`, borderRadius: 4, background: elegida ? R.azulClaro : "#fff", color: R.petroleo, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{elegida ? "Elegida" : "+ Reservar"}</button>;
  };
  if (!esp) return <div><TituloBloque titulo="Reservas" sub="Reserva de aulas especiales" icono="horario" /><p>Jefatura de Estudios aún no ha indicado qué espacios se pueden reservar.</p></div>;
  const th = { padding: "8px 6px", background: R.azul, color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center" };
  return (
    <div>
      <TituloBloque titulo="Reservas" sub="Reserva laboratorios, aulas de informática, salón de actos y otros espacios" icono="horario" />
      <div style={{ display: "grid", gap: 10, margin: "16px 0 12px" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 15, fontWeight: 700, color: R.petroleo }}>Espacio
          <select id="gd-espacio" value={esp.id} onChange={e => { setEspId(e.target.value); setSel(null); }} style={{ ...campo, border: `3px solid ${R.turquesa}`, fontSize: 17 }}>
            {lista.map(e => <option key={e.id} value={e.id}>{e.nombre}{e.edificio ? ` · Edificio ${e.edificio}` : ""}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => cambiarSemana(-1)} style={boton("#fff", R.petroleo, R.azul)} aria-label="Semana anterior">‹</button>
          <button onClick={() => { setLunes(isoLocal(lunesDe())); setDiaMovil(dias.includes(hoy) ? hoy : isoLocal(lunesDe())); setSel(null); }} style={boton("#fff", R.petroleo, R.azul)}>Esta semana</button>
          <button onClick={() => cambiarSemana(1)} style={boton("#fff", R.petroleo, R.azul)} aria-label="Semana siguiente">›</button>
          <span style={{ fontSize: 15, color: R.noche, fontWeight: 700 }}>Semana del {parseISO(dias[0]).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} al {parseISO(dias[4]).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
          <button onClick={() => pdfReservas(esp, dias, reservas)} style={{ ...boton(R.azul, "#fff"), marginLeft: "auto" }}>Descargar PDF</button>
        </div>
      </div>
      {sel && (
        <div ref={panel} data-form-reserva style={{ background: R.azulClaro, borderLeft: `5px solid ${R.azul}`, padding: 14, marginBottom: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16 }}>Reservar {esp.nombre} · {diaCorto(sel.fecha)} · {conTramo(sel.hora)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            {gestion && (
              <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Para quién
                <select id="gd-reserva-para" value={form.para} onChange={e => setForm(v => ({ ...v, para: e.target.value }))} style={campo}>
                  <option value="">Elige profesor/a…</option>
                  {[...profesores].sort((a, b) => a.localeCompare(b, "es")).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
            <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Grupo (opcional)
              <select id="gd-reserva-grupo" value={form.grupo} onChange={e => setForm(v => ({ ...v, grupo: e.target.value }))} style={campo}>
                <option value="">—</option>
                {cursos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>Actividad (opcional)
              <input id="gd-reserva-actividad" value={form.actividad} onChange={e => setForm(v => ({ ...v, actividad: e.target.value }))} placeholder="Por ejemplo, práctica de laboratorio" style={campo} />
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 15, fontWeight: 700, color: R.petroleo, cursor: "pointer" }}>
              <input id="gd-reserva-repetir" type="checkbox" checked={form.repetir} onChange={e => setForm(v => ({ ...v, repetir: e.target.checked }))} style={{ width: 22, height: 22, accentColor: R.azul }} />
              🔁 Repetir cada semana ({diaSemana(sel.fecha)} a {sel.hora})
            </label>
            {form.repetir && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: R.petroleo }}>hasta
                <input id="gd-reserva-hasta" type="date" value={form.hasta} min={sel.fecha} onChange={e => setForm(v => ({ ...v, hasta: e.target.value }))} style={{ ...campo, width: "auto" }} />
              </label>
            )}
          </div>
          {error && <div role="alert" style={{ color: R.noche, fontWeight: 700, borderLeft: `5px solid ${R.mostaza}`, paddingLeft: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={reservar} style={boton(R.azul, "#fff")}>Confirmar reserva</button>
            <button onClick={() => setSel(null)} style={boton("#fff", R.petroleo, R.turquesa)}>Cancelar</button>
          </div>
        </div>
      )}
      {hecho && <div role="status" style={{ padding: "10px 14px", marginBottom: 12, background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
      {estrecho ? (
        <div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8 }}>
            {dias.map(f => <button key={f} onClick={() => setDiaMovil(f)} aria-pressed={diaMovil === f} style={{ ...boton(diaMovil === f ? R.azul : "#fff", diaMovil === f ? "#fff" : R.petroleo, diaMovil === f ? null : R.turquesaClaro), flex: "none" }}>{diaCorto(f)}</button>)}
          </div>
          <div data-tabla="reservas" style={{ display: "grid", gap: 1, background: R.turquesaClaro, border: `1px solid ${R.turquesaClaro}` }}>
            {HORAS.map(h => (
              <div key={h} style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 8, alignItems: "center", background: "#fff", padding: 8 }}>
                <div style={{ fontSize: 14, color: R.petroleo }}><strong>{h}</strong><div style={{ fontSize: 12 }}>{HORARIO[h]}</div></div>
                <Celda f={diaMovil} h={h} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: `1px solid ${R.turquesaClaro}` }}>
          <table data-tabla="reservas" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead><tr><th style={{ ...th, width: 110 }}>Hora</th>{dias.map(f => <th key={f} style={{ ...th, background: f === hoy ? R.petroleo : R.azul }}>{diaCorto(f)}{f === hoy ? " · hoy" : ""}</th>)}</tr></thead>
            <tbody>{HORAS.map(h => (
              <tr key={h} style={{ background: h === "Recreo" ? R.gris : "#fff" }}>
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 14, color: R.petroleo }}><strong>{h}</strong><div style={{ fontSize: 12 }}>{HORARIO[h]}</div></td>
                {dias.map(f => <td key={f} style={{ padding: 4, borderBottom: `1px solid ${R.turquesaClaro}`, borderLeft: `1px solid ${R.turquesaClaro}`, textAlign: "center", verticalAlign: "top" }}><Celda f={f} h={h} /></td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 17, marginBottom: 8 }}>{gestion ? "Reservas de hoy" : "Mis próximas reservas"}</div>
        {(() => {
          let l = gestion ? reservas.filter(r => r.fecha === hoy).sort((a, b) => HORAS.indexOf(a.hora) - HORAS.indexOf(b.hora)) : mias;
          if (!l.length) return <div style={{ color: R.petroleo }}>{gestion ? "Hoy no hay ningún espacio reservado." : "No tienes ninguna reserva pendiente."}</div>;
          // Las reservas que se repiten salen una sola vez, con todas sus semanas
          const series = gestion ? [] : [...new Set(l.filter(r => r.serie).map(r => r.serie))].map(id => l.filter(r => r.serie === id));
          if (!gestion) l = l.filter(r => !r.serie);
          return [...series.map(g => (
            <div key={`s-${g[0].serie}`} data-serie={g[0].serie} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${R.gris}`, fontSize: 15, color: R.noche }}>
              <div><strong>🔁 {g[0].espacio}</strong> · cada {diaSemana(g[0].fecha)} · {conTramo(g[0].hora)}
                <div style={{ fontSize: 14, color: R.petroleo }}>{[`${g.length} ${g.length === 1 ? "semana" : "semanas"}: del ${fmtD(parseISO(g[0].fecha))} al ${fmtD(parseISO(g[g.length - 1].fecha))}`, g[0].grupo, g[0].actividad].filter(Boolean).join(" · ")}</div></div>
              <button onClick={() => anularSerie(g[0].serie)} style={boton("#fff", R.petroleo, R.turquesa)}>Anular la serie</button>
            </div>
          )), ...l.map(r => (
            <div key={r.id} data-mi-reserva={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${R.gris}`, fontSize: 15, color: R.noche }}>
              <div><strong>{r.espacio}</strong> · {diaCorto(r.fecha)} · {conTramo(r.hora)}<div style={{ fontSize: 14, color: R.petroleo }}>{[gestion ? r.profesor : "", r.grupo, r.actividad].filter(Boolean).join(" · ")}</div></div>
              {puedeAnular(r) && <button onClick={() => anular(r)} style={boton("#fff", R.petroleo, R.turquesa)}>Anular</button>}
            </div>
          ))];
        })()}
      </div>
      <div data-novedades style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 17, marginBottom: 4 }}>Novedades de los espacios</div>
        <div style={{ fontSize: 14, color: R.petroleo, marginBottom: 8 }}>Lo último que se ha reservado o liberado, para todo el claustro. Lo nuevo desde tu última visita va marcado.</div>
        {novedades.length === 0 ? <div style={{ color: R.petroleo }}>Todavía no hay cambios.</div> : [...novedades].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 12).map(n => {
          const nueva = n.ts > desde && n.por !== usuario;
          return (
            <div key={n.id} data-novedad={n.tipo} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderTop: `1px solid ${R.gris}`, background: nueva ? R.azulClaro : "transparent", fontSize: 15, color: R.noche }}>
              <span aria-hidden="true" style={{ fontSize: 18 }}>{n.tipo === "reserva" ? "📅" : "🔓"}</span>
              <div style={{ flex: 1 }}>
                <strong>{n.tipo === "reserva" ? "Reservado" : "Liberado"}</strong> {n.espacio} · {diaCorto(n.fecha)} · {n.hora}{n.semanas > 1 ? ` (${n.semanas} semanas)` : ""}
                <div style={{ fontSize: 13, color: R.petroleo }}>{n.tipo === "reserva" ? `Para ${n.profesor}` : `Era de ${n.profesor}; ya está libre`}{n.por && n.por !== n.profesor ? ` · lo anotó ${n.por}` : ""} · {fmtD(n.ts)} {horaCorta(n.ts)}</div>
              </div>
              {nueva && <span style={{ background: R.noche, color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>Nuevo</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── Material del centro: aulas con puestos (informática, laboratorios…) ───────
// Aula: {id, nombre, funcion, espacioId, filas, izq, der, prefijo, oculta}
//   Puestos numerados desde la izquierda del profesor/a hasta la derecha, fila completa (con el pasillo en medio), y así fila a fila.
// Sesión: {id, aulaId, aula, fecha, hora, grupo, profesor, puestos: {PC01: alumnoId}, ts}
// Incidencia: {id, aulaId, aula, puesto, texto, fecha, hora, anota, alumno, grupo, anterior: {alumno, grupo, fecha, hora, profesor}, estado, resuelta, ts}
const FUNCIONES_MATERIAL = ["Informática", "Laboratorio", "Tecnología", "Música", "Otra"];
const AULAS_MATERIAL_DEFECTO = [
  { id: "m-info-1", nombre: "Aula de Informática 1", funcion: "Informática", espacioId: "informatica-1", filas: 5, izq: 3, der: 3, prefijo: "PC" },
  { id: "m-info-2", nombre: "Aula de Informática 2", funcion: "Informática", espacioId: "informatica-2", filas: 4, izq: 4, der: 4, prefijo: "PC" },
  { id: "m-lab", nombre: "Laboratorio de Ciencias", funcion: "Laboratorio", espacioId: "lab-ciencias", filas: 4, izq: 2, der: 2, prefijo: "Mesa " },
];
const listaAulasMaterial = l => (l?.length ? l : AULAS_MATERIAL_DEFECTO);
const codigoPuesto = (a, n) => `${a.prefijo ?? "PC"}${String(n).padStart(2, "0")}`;
// Filas del plano: [{izq: [códigos], der: [códigos]}]
function filasAula(a) {
  const f = [], porFila = a.izq + a.der;
  for (let r = 0; r < a.filas; r++) {
    const n0 = r * porFila;
    f.push({ izq: Array.from({ length: a.izq }, (_, k) => codigoPuesto(a, n0 + k + 1)), der: Array.from({ length: a.der }, (_, k) => codigoPuesto(a, n0 + a.izq + k + 1)) });
  }
  return f;
}
const puestosAula = a => filasAula(a).flatMap(f => [...f.izq, ...f.der]);
const nombreCorto = n => { const p = (n || "").split(" "); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : n; };
// Última vez que se usó un puesto antes de un momento dado
function usoAnterior(sesiones, aulaId, puesto, antesDe, alumnos) {
  const prev = sesiones.filter(x => x.aulaId === aulaId && x.puestos?.[puesto] && `${x.fecha}|${String(HORAS.indexOf(x.hora)).padStart(2, "0")}` < antesDe)
    .sort((a, b) => `${b.fecha}${String(HORAS.indexOf(b.hora)).padStart(2, "0")}`.localeCompare(`${a.fecha}${String(HORAS.indexOf(a.hora)).padStart(2, "0")}`))[0];
  if (!prev) return null;
  const al = alumnos.find(a => a.id === prev.puestos[puesto]);
  return { alumno: al?.nombre || "?", grupo: prev.grupo, fecha: prev.fecha, hora: prev.hora, profesor: prev.profesor };
}
function sesionesMaterialEjemplo(alumnos, profesores, sugerido) {
  const l = [], hoy = new Date();
  const grupos = [...new Set(alumnos.map(a => a.curso))].sort();
  const plan = [["m-info-1", 0, -1, "2ª hora", 4], ["m-info-1", 1, -2, "4ª hora", 9], ["m-info-1", 0, -8, "2ª hora", 4], ["m-info-2", 2, -1, "5ª hora", 12], ["m-info-2", 3, -3, "1ª hora", 15], ["m-lab", 1, -2, "3ª hora", 3]];
  plan.forEach(([aulaId, gi, dias, hora, pi], k) => {
    let d = sumarDias(hoy, dias); while (!esLectivo(d)) d = sumarDias(d, -1);
    const a = AULAS_MATERIAL_DEFECTO.find(x => x.id === aulaId), grupo = grupos[gi % grupos.length];
    const del = alumnos.filter(x => x.curso === grupo).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
    const pu = {}; puestosAula(a).forEach((c, j) => { if (del[j]) pu[c] = del[j].id; });
    l.push({ id: 7000 + k, aulaId, aula: a.nombre, fecha: isoLocal(d), hora, grupo, profesor: k === 0 && sugerido ? sugerido : profesores[pi % profesores.length], puestos: pu, ts: new Date(d).toISOString() });
  });
  return l;
}
function incidenciasMaterialEjemplo(sesiones, alumnos, profesores) {
  const s = sesiones.find(x => x.aulaId === "m-info-1");
  if (!s) return [];
  const al = alumnos.find(a => a.id === s.puestos.PC05);
  return [{ id: 7500, aulaId: "m-info-1", aula: s.aula, puesto: "PC05", texto: "Falta la tecla Ñ del teclado.", fecha: isoLocal(new Date()), hora: "1ª hora", anota: profesores[6 % profesores.length],
    alumno: null, grupo: null, anterior: al ? { alumno: al.nombre, grupo: s.grupo, fecha: s.fecha, hora: s.hora, profesor: s.profesor } : null, estado: "abierta", ts: new Date().toISOString() }];
}

// Plano del aula visto desde la mesa del profesor/a: el puesto 01 queda a su izquierda
function PlanoAula({ aula, puestos = {}, alumnos = [], elegido, onPuesto, incidencias = [] }) {
  const porId = id => alumnos.find(a => a.id === id);
  const conIncidencia = new Set(incidencias.filter(x => x.aulaId === aula.id && x.estado === "abierta").map(x => x.puesto));
  // Los puestos se encogen en el móvil para que quepa la fila entera
  const ancho = `clamp(44px, calc((100vw - 110px) / ${aula.izq + aula.der}), 74px)`;
  const Puesto = ({ c }) => {
    const al = porId(puestos[c]), sel = elegido === c, inc = conIncidencia.has(c);
    return (
      <button data-puesto={c} onClick={() => onPuesto?.(c)} aria-pressed={sel} aria-label={`${c}${al ? `: ${al.nombre}` : ": libre"}${inc ? ", con incidencia" : ""}`}
        style={{ width: ancho, minHeight: 58, padding: "4px 3px", border: `2px ${al ? "solid" : "dashed"} ${sel ? R.azul : inc ? R.mostaza : al ? R.turquesa : R.turquesaClaro}`, borderRadius: 6,
          background: sel ? R.azulClaro : inc ? R.crema : al ? "#fff" : R.gris, cursor: onPuesto ? "pointer" : "default", fontFamily: "inherit", color: R.noche, boxShadow: sel ? `0 0 0 2px ${R.azul}` : "none" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: R.petroleo, whiteSpace: "nowrap" }}>{inc ? "⚠️ " : <span className="gd-ico-puesto">🖥 </span>}{c.replace(" ", "")}</div>
        <div style={{ fontSize: 12, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{al ? nombreCorto(al.nombre) : "—"}</div>
      </button>
    );
  };
  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <style>{`@media (max-width: 600px) { .gd-ico-puesto { display: none; } }`}</style>
      <div data-plano={aula.id} style={{ display: "inline-grid", gap: 8, padding: "12px 8px", background: "#fff", border: `1px solid ${R.turquesaClaro}`, minWidth: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "6px 18px", background: R.petroleo, color: "#fff", fontWeight: 700, fontSize: 14, borderRadius: 4 }}>Mesa del profesor/a</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: R.petroleo }}><span>← Izquierda del profesor/a</span><span>Derecha →</span></div>
        {filasAula(aula).map((f, r) => (
          <div key={r} style={{ display: "flex", justifyContent: "safe center", gap: 6, alignItems: "stretch" }}>
            {f.izq.map(c => <Puesto key={c} c={c} />)}
            <div aria-hidden="true" style={{ width: 22, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: R.turquesa, writingMode: "vertical-rl" }}>{r === 0 ? "pasillo" : ""}</div>
            {f.der.map(c => <Puesto key={c} c={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function pdfSesionMaterial(ses, aula, alumnos) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabeceraPDF(doc, `Puestos · ${aula.nombre}`, `${parseISO(ses.fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${conTramo(ses.hora)}`);
  autoTable(doc, { ...estiloTabla, startY: y, theme: "grid", columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, fillColor: [238, 245, 248] } },
    body: [["Grupo", ses.grupo || "-"], ["Profesor/a", ses.profesor], ["Alumnos/as", String(Object.keys(ses.puestos).length)]].map(r => r.map(sinEmoji)) });
  y = doc.lastAutoTable.finalY + 6;
  autoTable(doc, { ...estiloTabla, startY: y, head: [["Puesto", "Alumno/a", "Estado al terminar"]],
    body: puestosAula(aula).filter(c => ses.puestos[c]).map(c => [c, alumnos.find(a => a.id === ses.puestos[c])?.nombre || "?", ""].map(sinEmoji)),
    columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 60 } } });
  firmasPDF(doc, doc.lastAutoTable.finalY + 4, [{ cargo: "El profesor/a", nombre: ses.profesor }]);
  guardarPDF(doc, `puestos-${aula.id}-${ses.fecha}-${ses.hora.replace(/\W+/g, "")}.pdf`);
}

// Sesión en el aula: quién se sienta en cada puesto y con qué profesor/a
function MaterialSesion({ aulas, sesiones = [], setSesiones, incidencias = [], setIncidencias, alumnos = [], cursos = [], profesores = [], usuario, gestion = false, cuentas = {}, setMensajes }) {
  const lista = listaAulasMaterial(aulas).filter(a => !a.oculta);
  const hoy = isoLocal(new Date());
  const [aulaId, setAulaId] = useState(lista[0]?.id || "");
  const aula = lista.find(a => a.id === aulaId) || lista[0];
  const [grupo, setGrupo] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState(() => horaEnCurso() && horaEnCurso() !== "Recreo" ? horaEnCurso() : HORAS[0]);
  const [profe, setProfe] = useState(usuario);
  const [puestos, setPuestos] = useState({});
  const [origen, setOrigen] = useState(""); // de dónde sale la colocación
  const [elegido, setElegido] = useState(null);
  const [texto, setTexto] = useState("");
  const [hecho, setHecho] = useState("");
  const delGrupo = alumnos.filter(a => a.curso === grupo).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const existente = aula && sesiones.find(x => x.aulaId === aula.id && x.fecha === fecha && x.hora === hora);
  // Al elegir aula y grupo: la sesión ya guardada, o la plantilla (la última vez de ese grupo en esa aula)
  useEffect(() => {
    if (!aula || !grupo) { setPuestos({}); setOrigen(""); return; }
    if (existente && existente.grupo === grupo) { setPuestos(existente.puestos); setOrigen("Sesión ya guardada: puedes cambiarla."); return; }
    const ult = sesiones.filter(x => x.aulaId === aula.id && x.grupo === grupo).sort((a, b) => `${b.fecha}${HORAS.indexOf(b.hora)}`.localeCompare(`${a.fecha}${HORAS.indexOf(a.hora)}`))[0];
    if (ult) { const ids = new Set(alumnos.filter(a => a.curso === grupo).map(a => a.id)); setPuestos(Object.fromEntries(Object.entries(ult.puestos).filter(([, id]) => ids.has(id)))); setOrigen(`Plantilla del grupo: misma colocación que el ${fmtD(parseISO(ult.fecha))}.`); }
    else { setPuestos({}); setOrigen("Primera vez de este grupo en esta aula: coloca al alumnado o pulsa «Por orden de lista»."); }
    setElegido(null); setHecho("");
  }, [aula?.id, grupo, fecha, hora]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!aula) return <div><TituloBloque titulo="Sesión en el aula" icono="ordenador" /><p>Coordinación TIC aún no ha añadido aulas con puestos.</p></div>;
  const sentado = id => Object.keys(puestos).find(c => puestos[c] === id);
  const sinSitio = delGrupo.filter(a => !sentado(a.id));
  const asignar = (c, id) => setPuestos(prev => { const n = Object.fromEntries(Object.entries(prev).filter(([k, v]) => v !== id && k !== c)); if (id) n[c] = id; return n; });
  const porOrden = () => { const n = {}; puestosAula(aula).forEach((c, j) => { if (delGrupo[j]) n[c] = delGrupo[j].id; }); setPuestos(n); };
  const guardar = () => {
    const ses = { id: existente?.id || Date.now(), aulaId: aula.id, aula: aula.nombre, fecha, hora, grupo, profesor: gestion ? profe : usuario, puestos, ts: new Date().toISOString() };
    setSesiones(prev => [...prev.filter(x => x.id !== ses.id), ses]);
    setHecho(`Guardado: ${Object.keys(puestos).length} alumnos/as en ${aula.nombre}, ${diaCorto(fecha)} a ${hora}, con ${ses.profesor}.`);
  };
  const anotarIncidencia = () => {
    if (!elegido || !texto.trim()) return;
    const al = alumnos.find(a => a.id === puestos[elegido]);
    const ant = usoAnterior(sesiones, aula.id, elegido, `${fecha}|${String(HORAS.indexOf(hora)).padStart(2, "0")}`, alumnos);
    setIncidencias(prev => [{ id: Date.now(), aulaId: aula.id, aula: aula.nombre, puesto: elegido, texto: texto.trim(), fecha, hora, anota: usuario, alumno: al?.nombre || null, grupo: al ? grupo : null, anterior: ant, estado: "abierta", ts: new Date().toISOString() }, ...prev]);
    // Avisa a Coordinación TIC (aulas de informática) o a Secretaría (el resto)
    const destino = responsablesMaterial(cuentas, profesores, aula.funcion === "Informática" ? "tic" : "secretaria").filter(d => d !== usuario);
    if (setMensajes && destino.length) setMensajes(prev => [...destino.map((d, k) => mensajeRumbo(d, `⚠️ Incidencia en ${aula.nombre}, puesto ${elegido}: ${texto.trim()}. Avisa ${usuario}. Lo tienes en Material del centro › Incidencias de puestos.`, k)), ...prev]);
    setTexto(""); setHecho(`Incidencia anotada en ${elegido}.${destino.length ? ` Avisados: ${destino.join(", ")}.` : ""}`);
  };
  const campo = { width: "100%", minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
  const etq = { display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo };
  const boton = (fondo, letra, borde) => ({ minHeight: 44, padding: "0 14px", borderRadius: 6, border: borde ? `2px solid ${borde}` : "none", background: fondo, color: letra, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" });
  const ant = elegido && usoAnterior(sesiones, aula.id, elegido, `${fecha}|${String(HORAS.indexOf(hora)).padStart(2, "0")}`, alumnos);
  const abiertas = incidencias.filter(x => x.aulaId === aula.id && x.puesto === elegido && x.estado === "abierta");
  return (
    <div>
      <TituloBloque titulo="Sesión en el aula" sub="Dónde se sienta cada alumno/a y con qué profesor/a, para cuidar el material" icono="ordenador" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, margin: "16px 0 12px" }}>
        <label style={etq}>Aula
          <select id="gd-mat-aula" value={aula.id} onChange={e => setAulaId(e.target.value)} style={campo}>
            {lista.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label style={etq}>Grupo
          <select id="gd-mat-grupo" value={grupo} onChange={e => setGrupo(e.target.value)} style={campo}>
            <option value="">Elige el grupo…</option>
            {cursos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={etq}>Día
          <input id="gd-mat-fecha" type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value || hoy)} style={campo} />
        </label>
        <label style={etq}>Hora
          <select id="gd-mat-hora" value={hora} onChange={e => setHora(e.target.value)} style={campo}>
            {HORAS.map(h => <option key={h} value={h}>{conTramo(h)}</option>)}
          </select>
        </label>
        {gestion && (
          <label style={etq}>Profesor/a
            <select id="gd-mat-profe" value={profe} onChange={e => setProfe(e.target.value)} style={campo}>
              <option value="">Elige…</option>
              {[...profesores].sort((a, b) => a.localeCompare(b, "es")).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {existente && existente.grupo !== grupo && <div role="alert" style={{ marginBottom: 10, padding: "8px 12px", borderLeft: `5px solid ${R.mostaza}`, background: R.crema, color: R.noche }}>A esa hora ya hay una sesión guardada en esta aula con {existente.grupo} ({existente.profesor}). Si guardas, se sustituye.</div>}
      {!grupo ? <div style={{ padding: 16, background: R.azulClaro, color: R.petroleo }}>Elige el grupo para colocar al alumnado. La próxima vez, el grupo saldrá colocado igual.</div> : (<>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: R.petroleo, flex: "1 1 260px" }}>{origen}</span>
          <button onClick={porOrden} style={boton("#fff", R.petroleo, R.azul)}>Por orden de lista</button>
          <button onClick={() => setPuestos({})} style={boton("#fff", R.petroleo, R.turquesa)}>Vaciar</button>
        </div>
        {hecho && <div role="status" style={{ padding: "10px 14px", marginBottom: 10, background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
        <PlanoAula aula={aula} puestos={puestos} alumnos={alumnos} elegido={elegido} onPuesto={c => { setElegido(c === elegido ? null : c); setTexto(""); }} incidencias={incidencias} />
        {elegido && (
          <div data-panel-puesto={elegido} style={{ marginTop: 10, padding: 14, background: R.azulClaro, borderLeft: `5px solid ${R.azul}`, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16 }}>🖥 Puesto {elegido}</div>
            <label style={etq}>Quién se sienta aquí
              <select id="gd-mat-alumno" value={puestos[elegido] || ""} onChange={e => asignar(elegido, e.target.value ? Number(e.target.value) : null)} style={campo}>
                <option value="">Nadie (libre)</option>
                {delGrupo.map(a => <option key={a.id} value={a.id}>{a.nombre}{sentado(a.id) && sentado(a.id) !== elegido ? ` (ahora en ${sentado(a.id)})` : ""}</option>)}
              </select>
            </label>
            <div style={{ fontSize: 14, color: R.noche }}>{ant ? <>Último uso antes: <strong>{ant.alumno}</strong> ({ant.grupo}) · {fmtD(parseISO(ant.fecha))} · {ant.hora} · con {ant.profesor}</> : "No consta ningún uso anterior de este puesto."}</div>
            {abiertas.map(x => <div key={x.id} style={{ fontSize: 14, color: R.noche, background: R.crema, padding: "6px 10px" }}>⚠️ Incidencia abierta: {x.texto} <span style={{ color: R.petroleo }}>({fmtD(parseISO(x.fecha))}, {x.anota})</span></div>)}
            <label style={etq}>¿Algo roto o que falta en este puesto?
              <input id="gd-mat-incidencia" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Por ejemplo: el ratón no funciona" style={campo} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={anotarIncidencia} disabled={!texto.trim()} style={{ ...boton(texto.trim() ? R.mostaza : R.gris, R.noche), cursor: texto.trim() ? "pointer" : "not-allowed" }}>⚠️ Anotar incidencia</button>
              <button onClick={() => setElegido(null)} style={boton("#fff", R.petroleo, R.turquesa)}>Cerrar</button>
            </div>
          </div>
        )}
        {sinSitio.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 14, color: R.petroleo }}><strong>Sin puesto ({sinSitio.length}):</strong> {sinSitio.map(a => a.nombre).join(", ")}. Si faltan hoy, déjalos así.</div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={guardar} disabled={gestion && !profe} style={{ ...boton(R.azul, "#fff"), minHeight: 52, flex: "1 1 240px", fontSize: 17 }}>Guardar la sesión</button>
          {existente && <button onClick={() => pdfSesionMaterial(existente, aula, alumnos)} style={boton("#fff", R.petroleo, R.azul)}>Descargar PDF</button>}
        </div>
      </>)}
    </div>
  );
}

// Historial: quién se ha sentado en cada puesto, y dónde se ha sentado cada alumno/a
function MaterialHistorial({ aulas, sesiones = [], incidencias = [], alumnos = [] }) {
  const lista = listaAulasMaterial(aulas).filter(a => !a.oculta);
  const [aulaId, setAulaId] = useState(lista[0]?.id || "");
  const aula = lista.find(a => a.id === aulaId) || lista[0];
  const [puesto, setPuesto] = useState(null);
  const [busca, setBusca] = useState("");
  const orden = (a, b) => `${b.fecha}${String(HORAS.indexOf(b.hora)).padStart(2, "0")}`.localeCompare(`${a.fecha}${String(HORAS.indexOf(a.hora)).padStart(2, "0")}`);
  if (!aula) return <div><TituloBloque titulo="Historial de puestos" icono="historial" /><p>No hay aulas con puestos.</p></div>;
  const delAula = sesiones.filter(x => x.aulaId === aula.id).sort(orden);
  const usos = puesto ? delAula.filter(x => x.puestos?.[puesto]) : [];
  const alumnoBuscado = busca ? alumnos.filter(a => a.nombre.toLowerCase().includes(busca.toLowerCase())).slice(0, 8) : [];
  const ultima = delAula[0];
  const th = { textAlign: "left", padding: "8px 10px", background: R.gris, color: R.noche, fontSize: 14 };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${R.turquesaClaro}`, fontSize: 14, color: R.noche };
  return (
    <div>
      <TituloBloque titulo="Historial de puestos" sub="Quién se ha sentado en cada puesto, cuándo y con qué profesor/a" icono="historial" />
      <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo, margin: "16px 0 10px", maxWidth: 420 }}>Aula
        <select id="gd-hist-aula" value={aula.id} onChange={e => { setAulaId(e.target.value); setPuesto(null); }} style={{ minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit" }}>
          {lista.map(a => <option key={a.id} value={a.id}>{a.nombre} · {a.funcion}</option>)}
        </select>
      </label>
      <div style={{ fontSize: 14, color: R.petroleo, marginBottom: 8 }}>{ultima ? `El plano muestra la última sesión: ${ultima.grupo}, ${diaCorto(ultima.fecha)} a ${ultima.hora}, con ${ultima.profesor}. Toca un puesto para ver todos sus usos.` : "Todavía no hay ninguna sesión en esta aula."}</div>
      <PlanoAula aula={aula} puestos={ultima?.puestos || {}} alumnos={alumnos} elegido={puesto} onPuesto={c => setPuesto(c === puesto ? null : c)} incidencias={incidencias} />
      {puesto && (
        <div data-usos={puesto} style={{ marginTop: 12, background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 14 }}>
          <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16, marginBottom: 8 }}>🖥 {puesto} · {usos.length} {usos.length === 1 ? "uso" : "usos"}</div>
          {incidencias.filter(x => x.aulaId === aula.id && x.puesto === puesto).map(x => (
            <div key={x.id} style={{ fontSize: 14, marginBottom: 6, padding: "6px 10px", background: x.estado === "abierta" ? R.crema : R.gris }}>{x.estado === "abierta" ? "⚠️" : "✓"} {x.texto} · {fmtD(parseISO(x.fecha))} · anotada por {x.anota}{x.estado !== "abierta" ? " · resuelta" : ""}</div>
          ))}
          {usos.length === 0 ? <div style={{ color: R.petroleo }}>Nadie lo ha usado todavía.</div> : (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Día</th><th style={th}>Hora</th><th style={th}>Alumno/a</th><th style={th}>Grupo</th><th style={th}>Profesor/a</th></tr></thead>
              <tbody>{usos.map(x => <tr key={x.id}><td style={td}>{fmtD(parseISO(x.fecha))}</td><td style={td}>{x.hora}</td><td style={td}><strong>{alumnos.find(a => a.id === x.puestos[puesto])?.nombre || "?"}</strong></td><td style={td}>{x.grupo}</td><td style={td}>{x.profesor}</td></tr>)}</tbody>
            </table></div>
          )}
        </div>
      )}
      <div style={{ marginTop: 16, background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 14 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo }}>¿Dónde se ha sentado un alumno/a?
          <input id="gd-hist-alumno" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Escribe su nombre…" style={{ minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, fontFamily: "inherit" }} />
        </label>
        {alumnoBuscado.map(al => {
          const donde = sesiones.filter(x => Object.values(x.puestos || {}).includes(al.id)).sort(orden);
          return (
            <div key={al.id} data-alumno-usos={al.id} style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, color: R.noche }}>{al.nombre} — {al.curso}</div>
              {donde.length === 0 ? <div style={{ fontSize: 14, color: R.petroleo }}>Sin sesiones registradas.</div> : donde.map(x => (
                <div key={x.id} style={{ fontSize: 14, color: R.noche, padding: "4px 0", borderBottom: `1px solid ${R.gris}` }}>
                  {fmtD(parseISO(x.fecha))} · {x.hora} · <strong>{x.aula} · {Object.keys(x.puestos).find(c => x.puestos[c] === al.id)}</strong> · con {x.profesor}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {delAula.length > 0 && (
        <div style={{ marginTop: 16, background: "#fff", border: `1px solid ${R.turquesaClaro}`, padding: 14 }}>
          <div style={{ fontWeight: 800, color: R.petroleo, fontSize: 16, marginBottom: 8 }}>Sesiones en {aula.nombre}</div>
          <div style={{ overflowX: "auto" }}><table data-tabla="sesiones-material" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Día</th><th style={th}>Hora</th><th style={th}>Grupo</th><th style={th}>Profesor/a</th><th style={th}>Alumnos</th><th style={th}></th></tr></thead>
            <tbody>{delAula.map(x => <tr key={x.id}><td style={td}>{fmtD(parseISO(x.fecha))}</td><td style={td}>{x.hora}</td><td style={td}>{x.grupo}</td><td style={td}>{x.profesor}</td><td style={td}>{Object.keys(x.puestos).length}</td>
              <td style={td}><button onClick={() => pdfSesionMaterial(x, aula, alumnos)} style={{ minHeight: 36, padding: "0 10px", border: `1px solid ${R.azul}`, borderRadius: 6, background: "#fff", color: R.petroleo, cursor: "pointer", fontWeight: 700 }}>PDF</button></td></tr>)}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

// ─── Necesidades y avisos de material ────────────────────────────────────────
// Aviso: {id, tipo: "incidencia" | "necesidad", categoria, lugar, descripcion, cantidad, urgente, profesor, ts,
//         estado: "pendiente" | "en_curso" | "resuelto", respuesta, respondido: {por, ts}, notificados, respuestaVista}
const CATEGORIAS_MATERIAL = [
  { id: "informatica", label: "Informática y audiovisuales", ejemplo: "ordenadores, proyectores, pizarras digitales, wifi" },
  { id: "mobiliario", label: "Mobiliario y mantenimiento", ejemplo: "mesas, sillas, persianas, luz, calefacción" },
  { id: "laboratorio", label: "Laboratorios y talleres", ejemplo: "reactivos, herramientas, material de prácticas" },
  { id: "deportes", label: "Material deportivo", ejemplo: "balones, colchonetas, petos" },
  { id: "papeleria", label: "Papelería y fotocopias", ejemplo: "folios, tóner, rotuladores de pizarra" },
  { id: "otro", label: "Otro", ejemplo: "" },
];
const ESTADO_AVISO = { pendiente: { txt: "Pendiente", fondo: R.crema, borde: R.mostaza }, en_curso: { txt: "En curso", fondo: R.azulClaro, borde: R.azul }, resuelto: { txt: "Resuelto", fondo: R.verdeCaminoClaro, borde: R.verdeCamino } };
const NOMBRE_CARGO = { tic: "Coordinación TIC", secretaria: "Secretaría", jefatura: "Jefatura de Estudios", direccion: "Dirección" };
// Quién gestiona cada aviso: las averías informáticas, Coordinación TIC; el material que hace falta
// y el resto de averías y mantenimiento, Secretaría (lleva las cuentas del centro)
const cargoAviso = a => a.tipo === "incidencia" && a.categoria === "informatica" ? "tic" : "secretaria";
// Quién recibe el aviso: las personas con ese cargo; si no hay nadie, Dirección (y también Dirección si es urgente)
function responsablesMaterial(cuentas, profesores, cargo, urgente = false) {
  const con = c => profesores.filter(p => cargosIds(cuentas[p]).includes(c));
  let l = con(cargo);
  if (!l.length) l = con("direccion");
  if (urgente) l = [...l, ...con("direccion")];
  return [...new Set(l)];
}
const mensajeRumbo = (destinatario, texto, extra = 0) => ({ id: Date.now() + extra, aviso: Date.now() + extra, remitente: "RumboAula", destinatario, conCopia: [], leido: false, urgente: false, ts: new Date().toISOString(), lugar: null, texto });
function avisosMaterialEjemplo(profesores, sugerido) {
  const p = i => profesores[i % profesores.length], hace = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); };
  return [
    { id: 7600, tipo: "incidencia", categoria: "informatica", lugar: "2º ESO B", descripcion: "El proyector se apaga solo a los diez minutos.", cantidad: "", urgente: true, profesor: sugerido || p(3), ts: hace(1), estado: "en_curso", respuesta: "Lo revisamos mañana a primera hora.", respondido: { por: "Elena Vega", ts: hace(0) }, notificados: ["Elena Vega", "Luis García"], respuestaVista: false },
    { id: 7601, tipo: "necesidad", categoria: "papeleria", lugar: "Departamento de Lengua", descripcion: "Rotuladores de pizarra blanca (azul y negro).", cantidad: "10", urgente: false, profesor: p(8), ts: hace(2), estado: "pendiente", respuesta: "", notificados: ["Beatriz Navarro"] },
    { id: 7602, tipo: "incidencia", categoria: "mobiliario", lugar: "Laboratorio de Ciencias", descripcion: "La persiana de la ventana del fondo no sube.", cantidad: "", urgente: false, profesor: p(11), ts: hace(4), estado: "resuelto", respuesta: "Arreglada por mantenimiento.", coste: 45, respondido: { por: "Beatriz Navarro", ts: hace(2) }, notificados: ["Beatriz Navarro"], respuestaVista: true },
    { id: 7603, tipo: "necesidad", categoria: "deportes", lugar: "Gimnasio", descripcion: "Balones de voleibol: los que hay están pinchados.", cantidad: "6", urgente: false, profesor: p(13), ts: hace(3), estado: "pendiente", respuesta: "", notificados: ["Beatriz Navarro"] },
  ];
}
function pdfAvisosMaterial(lista, titulo) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const y = cabeceraPDF(doc, "Necesidades e incidencias de material", titulo);
  autoTable(doc, { ...estiloTabla, startY: y, head: [["Fecha", "Tipo", "Categoría", "Lugar", "Qué pasa / qué hace falta", "Cant.", "Quién avisa", "Estado", "Coste"]],
    body: lista.length ? lista.map(a => [fmtD(a.ts), a.tipo === "incidencia" ? "Incidencia" : "Necesidad", CATEGORIAS_MATERIAL.find(c => c.id === a.categoria)?.label || "-", a.lugar || "-", `${a.urgente ? "URGENTE. " : ""}${a.descripcion}${a.respuesta ? `\nRespuesta: ${a.respuesta}` : ""}`, a.cantidad || "-", a.profesor, ESTADO_AVISO[a.estado].txt, a.coste ? `${a.coste.toLocaleString("es-ES")} €` : "-"].map(sinEmoji)) : [["-", "", "", "", "Nada en esta lista", "", "", "", ""]],
    styles: { ...estiloTabla.styles, fontSize: 10 }, columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 24 }, 2: { cellWidth: 36 }, 3: { cellWidth: 34 }, 5: { cellWidth: 14 }, 6: { cellWidth: 30 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 } } });
  guardarPDF(doc, `necesidades-material-${isoLocal(new Date())}.pdf`);
}
// gestiona: función que dice qué avisos lleva quien mira (Coordinación TIC, Secretaría o Dirección); sin ella, solo los propios
function NecesidadesMaterial({ avisos = [], setAvisos, espacios, cursos = [], usuario, gestiona = null, cuentas = {}, profesores = [], setMensajes, conCoste = false }) {
  const gestion = !!gestiona;
  // Secretaría lleva las cuentas: anota lo que cuesta cada compra o reparación
  const [costes, setCostes] = useState({});
  const euros = n => Number(n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const lugares = [...listaEspacios(espacios).filter(e => !e.oculta).map(e => e.nombre), ...cursos];
  const vacio = { tipo: "incidencia", categoria: "informatica", lugar: "", descripcion: "", cantidad: "", urgente: false };
  const [f, setF] = useState(vacio);
  const [hecho, setHecho] = useState("");
  const [ver, setVer] = useState("abiertos");
  const [respuestas, setRespuestas] = useState({});
  const cat = CATEGORIAS_MATERIAL.find(c => c.id === f.categoria);
  const cargoF = cargoAviso(f);
  const destino = responsablesMaterial(cuentas, profesores, cargoF, f.urgente);
  // Al abrir la pantalla, las respuestas nuevas a mis avisos quedan vistas
  useEffect(() => {
    if (gestion || !avisos.some(a => a.profesor === usuario && a.respuesta && !a.respuestaVista)) return;
    setAvisos(prev => prev.map(a => a.profesor === usuario && a.respuesta ? { ...a, respuestaVista: true } : a));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const enviar = () => {
    if (!f.descripcion.trim() || !f.lugar.trim()) return;
    const a = { id: Date.now(), ...f, lugar: f.lugar.trim(), descripcion: f.descripcion.trim(), profesor: usuario, ts: new Date().toISOString(), estado: "pendiente", respuesta: "", notificados: destino };
    setAvisos(prev => [a, ...prev]);
    const txt = `${f.urgente ? "🔴 URGENTE · " : ""}${f.tipo === "incidencia" ? "Incidencia" : "Necesidad"} de material (${cat.label}) en ${a.lugar}: ${a.descripcion}${a.cantidad ? ` (cantidad: ${a.cantidad})` : ""}. Avisa ${usuario}. Lo tienes en Material del centro › Necesidades y avisos.`;
    if (setMensajes) setMensajes(prev => [...destino.filter(d => d !== usuario).map((d, k) => mensajeRumbo(d, txt, k)), ...prev]);
    setHecho(`Enviado. Avisados: ${destino.length ? destino.join(", ") : "nadie con ese cargo; lo verá Jefatura en la lista"}.`);
    setF({ ...vacio, categoria: f.categoria });
    setTimeout(() => setHecho(""), 6000);
  };
  const cambiarEstado = (a, estado) => {
    const respuesta = (respuestas[a.id] ?? a.respuesta ?? "").trim();
    const coste = conCoste && costes[a.id] !== undefined && costes[a.id] !== "" ? Math.max(0, Number(String(costes[a.id]).replace(",", ".")) || 0) : a.coste;
    setAvisos(prev => prev.map(x => x.id === a.id ? { ...x, estado, respuesta, ...(coste !== undefined ? { coste } : {}), respondido: { por: usuario, ts: new Date().toISOString() }, respuestaVista: false } : x));
    if (setMensajes && a.profesor !== usuario) setMensajes(prev => [mensajeRumbo(a.profesor, `Tu aviso de material (${a.lugar}: ${a.descripcion.slice(0, 60)}${a.descripcion.length > 60 ? "…" : ""}) está ${estado === "resuelto" ? "RESUELTO" : "en curso"}.${respuesta ? ` Respuesta de ${usuario}: «${respuesta}»` : ""}`), ...prev]);
  };
  const base = gestion ? avisos.filter(gestiona) : avisos.filter(a => a.profesor === usuario);
  const lista = base.filter(a => ver === "todos" || (ver === "abiertos" ? a.estado !== "resuelto" : a.estado === "resuelto"))
    .sort((a, b) => (a.estado === "resuelto") - (b.estado === "resuelto") || b.urgente - a.urgente || b.ts.localeCompare(a.ts));
  const campo = { width: "100%", minHeight: 44, padding: "0 10px", border: `2px solid ${R.turquesa}`, borderRadius: 6, fontSize: 16, color: R.noche, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
  const etq = { display: "grid", gap: 4, fontSize: 14, fontWeight: 700, color: R.petroleo };
  const chip = (activo, txt, onClick, extra = {}) => <button key={txt} aria-pressed={activo} onClick={onClick} style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `2px solid ${activo ? R.azul : R.turquesaClaro}`, background: activo ? R.azulClaro : "#fff", color: R.petroleo, fontWeight: activo ? 700 : 400, cursor: "pointer", fontFamily: "inherit", fontSize: 15, ...extra }}>{txt}</button>;
  return (
    <div>
      <TituloBloque titulo="Necesidades y avisos" sub="Avisa de lo que se ha roto o de lo que hace falta; llega a quien lo gestiona" icono="mensaje-enviar" />
      <div style={{ background: R.azulClaro, padding: 16, margin: "16px 0", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {chip(f.tipo === "incidencia", "⚠️ Algo roto o que no funciona", () => setF(v => ({ ...v, tipo: "incidencia" })))}
          {chip(f.tipo === "necesidad", "📦 Material que hace falta", () => setF(v => ({ ...v, tipo: "necesidad" })))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <label style={etq}>Tipo de material
            <select id="gd-nec-categoria" value={f.categoria} onChange={e => setF(v => ({ ...v, categoria: e.target.value }))} style={campo}>
              {CATEGORIAS_MATERIAL.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label style={etq}>Dónde
            <input id="gd-nec-lugar" list="gd-nec-lugares" value={f.lugar} onChange={e => setF(v => ({ ...v, lugar: e.target.value }))} placeholder="Aula, espacio o departamento" style={campo} />
            <datalist id="gd-nec-lugares">{lugares.map(l => <option key={l} value={l} />)}</datalist>
          </label>
          {f.tipo === "necesidad" && (
            <label style={etq}>Cantidad (opcional)
              <input id="gd-nec-cantidad" value={f.cantidad} onChange={e => setF(v => ({ ...v, cantidad: e.target.value }))} placeholder="Por ejemplo, 10" style={campo} />
            </label>
          )}
        </div>
        {cat.ejemplo && <div style={{ fontSize: 13, color: R.petroleo, marginTop: -6 }}>{cat.label}: {cat.ejemplo}.</div>}
        <label style={etq}>{f.tipo === "incidencia" ? "¿Qué pasa?" : "¿Qué hace falta?"}
          <textarea id="gd-nec-descripcion" rows={2} value={f.descripcion} onChange={e => setF(v => ({ ...v, descripcion: e.target.value }))} placeholder={f.tipo === "incidencia" ? "Por ejemplo: el proyector no enciende" : "Por ejemplo: cables HDMI para el aula"} style={{ ...campo, padding: 10, resize: "vertical" }} />
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 15, fontWeight: 700, color: R.noche, cursor: "pointer" }}>
          <input id="gd-nec-urgente" type="checkbox" checked={f.urgente} onChange={e => setF(v => ({ ...v, urgente: e.target.checked }))} style={{ width: 22, height: 22, accentColor: R.azul }} />
          Urgente: impide dar clase
        </label>
        <div style={{ fontSize: 14, color: R.petroleo }}>Se avisará por Rumbogram a: <strong>{destino.length ? destino.join(", ") : "nadie todavía"}</strong>
          {" "}({profesores.some(p => cargosIds(cuentas[p]).includes(cargoF)) ? NOMBRE_CARGO[cargoF] : `Dirección, porque nadie tiene el cargo de ${NOMBRE_CARGO[cargoF]}`}{f.urgente ? " y Dirección" : ""}).</div>
        <button onClick={enviar} disabled={!f.descripcion.trim() || !f.lugar.trim()} style={{ minHeight: 52, border: "none", borderRadius: 6, background: f.descripcion.trim() && f.lugar.trim() ? R.azul : R.gris, color: f.descripcion.trim() && f.lugar.trim() ? "#fff" : R.petroleo, fontWeight: 700, fontSize: 17, cursor: f.descripcion.trim() && f.lugar.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>Enviar aviso</button>
        {hecho && <div role="status" style={{ padding: "10px 14px", background: R.verdeCaminoClaro, borderLeft: `5px solid ${R.verdeCamino}`, color: R.verdeOscuro, fontWeight: 700 }}>✅ {hecho}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ color: R.petroleo, fontSize: 17, marginRight: 6 }}>{gestion ? "Avisos que gestionas" : "Mis avisos"}</strong>
        {chip(ver === "abiertos", `Abiertos (${base.filter(a => a.estado !== "resuelto").length})`, () => setVer("abiertos"))}
        {chip(ver === "resueltos", "Resueltos", () => setVer("resueltos"))}
        {chip(ver === "todos", "Todos", () => setVer("todos"))}
        {gestion && conCoste && <span data-gasto style={{ fontSize: 15, color: R.noche }}>Gastado este curso: <strong>{euros(base.filter(a => a.coste && a.ts.slice(0, 10) >= inicioCurso()).reduce((n, a) => n + a.coste, 0))}</strong></span>}
        {gestion && <button onClick={() => pdfAvisosMaterial(lista, ver === "abiertos" ? "Abiertos" : ver === "resueltos" ? "Resueltos" : "Todos")} style={{ marginLeft: "auto", minHeight: 44, padding: "0 14px", border: "none", borderRadius: 6, background: R.azul, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Descargar PDF</button>}
      </div>
      {lista.length === 0 ? <div style={{ padding: 16, background: "#fff", border: `1px solid ${R.turquesaClaro}`, color: R.petroleo }}>No hay avisos en esta lista.</div> : lista.map(a => {
        const e = ESTADO_AVISO[a.estado], c = CATEGORIAS_MATERIAL.find(x => x.id === a.categoria);
        return (
          <div key={a.id} data-aviso-material={a.id} style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, borderLeft: `5px solid ${e.borde}`, padding: 14, marginBottom: 10, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ background: a.tipo === "incidencia" ? R.crema : R.azulClaro, padding: "2px 10px", fontWeight: 700, fontSize: 14, color: R.noche }}>{a.tipo === "incidencia" ? "⚠️ Incidencia" : "📦 Necesidad"}</span>
              {a.urgente && <span style={{ background: R.noche, color: "#fff", padding: "2px 10px", fontWeight: 700, fontSize: 14 }}>Urgente</span>}
              <span style={{ background: e.fondo, border: `1px solid ${e.borde}`, padding: "1px 10px", fontWeight: 700, fontSize: 14, color: R.noche }}>{e.txt}</span>
              <span style={{ fontSize: 14, color: R.petroleo }}>{c?.label} · {a.lugar}</span>
            </div>
            <div style={{ fontSize: 16, color: R.noche }}>{a.descripcion}{a.cantidad ? <strong> · Cantidad: {a.cantidad}</strong> : null}</div>
            <div style={{ fontSize: 13, color: R.petroleo }}>{gestion ? `${a.profesor} · ` : ""}{fmtD(a.ts)} {horaCorta(a.ts)}{a.notificados?.length ? ` · Avisados: ${a.notificados.join(", ")}` : ""}</div>
            {a.respuesta && <div style={{ fontSize: 15, background: R.gris, padding: "6px 10px", color: R.noche }}>💬 <strong>{a.respondido?.por}</strong>: {a.respuesta}</div>}
            {gestion && a.coste > 0 && <div style={{ fontSize: 14, color: R.noche }}>Coste: <strong>{euros(a.coste)}</strong></div>}
            {gestion && a.estado !== "resuelto" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {conCoste && <input aria-label={`Coste del aviso de ${a.profesor}`} inputMode="decimal" value={costes[a.id] ?? (a.coste ?? "")} onChange={ev => setCostes(c => ({ ...c, [a.id]: ev.target.value }))} placeholder="Coste (€)" style={{ ...campo, flex: "0 1 120px", width: "auto" }} />}
                <input aria-label={`Respuesta al aviso de ${a.profesor}`} value={respuestas[a.id] ?? a.respuesta ?? ""} onChange={ev => setRespuestas(r => ({ ...r, [a.id]: ev.target.value }))} placeholder="Respuesta (opcional): qué se va a hacer" style={{ ...campo, flex: "1 1 240px", width: "auto" }} />
                {a.estado === "pendiente" && <button onClick={() => cambiarEstado(a, "en_curso")} style={{ minHeight: 44, padding: "0 14px", border: `2px solid ${R.azul}`, borderRadius: 6, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer" }}>En curso</button>}
                <button onClick={() => cambiarEstado(a, "resuelto")} style={{ minHeight: 44, padding: "0 14px", border: "none", borderRadius: 6, background: R.verde, color: R.noche, fontWeight: 700, cursor: "pointer" }}>Resuelto</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Incidencias de los puestos: abiertas y resueltas. Las resuelve Coordinación TIC
function MaterialIncidencias({ incidencias = [], setIncidencias, usuario, puedeResolver = false }) {
  const [ver, setVer] = useState("abierta");
  const l = incidencias.filter(x => ver === "todas" || x.estado === ver).sort((a, b) => b.ts.localeCompare(a.ts));
  const chip = (id, txt) => <button key={id} aria-pressed={ver === id} onClick={() => setVer(id)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 20, border: `2px solid ${ver === id ? R.azul : R.turquesaClaro}`, background: ver === id ? R.azulClaro : "#fff", color: R.petroleo, fontWeight: ver === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", fontSize: 15 }}>{txt}</button>;
  return (
    <div>
      <TituloBloque titulo="Incidencias de puestos" sub="Lo que se ha roto o falta en cada puesto y quién lo usó" icono="alertas" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 10px" }}>
        {chip("abierta", `Abiertas (${incidencias.filter(x => x.estado === "abierta").length})`)}{chip("resuelta", "Resueltas")}{chip("todas", "Todas")}
      </div>
      {l.length === 0 ? <div style={{ padding: 16, background: R.azulClaro, color: R.petroleo }}>No hay incidencias aquí.</div> : l.map(x => (
        <div key={x.id} data-incidencia={x.id} style={{ background: "#fff", border: `1px solid ${R.turquesaClaro}`, borderLeft: `5px solid ${x.estado === "abierta" ? R.mostaza : R.verde}`, padding: 14, marginBottom: 10, display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, color: R.noche, flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800, color: R.petroleo }}>{x.estado === "abierta" ? "⚠️" : "✓"} {x.aula} · {x.puesto}</div>
            <div style={{ margin: "4px 0" }}>{x.texto}</div>
            <div style={{ fontSize: 14, color: R.petroleo }}>Anotada por {x.anota} · {fmtD(parseISO(x.fecha))} · {x.hora}</div>
            {x.alumno && <div style={{ fontSize: 14 }}>En ese momento se sentaba: <strong>{x.alumno}</strong> ({x.grupo})</div>}
            {x.anterior && <div style={{ fontSize: 14 }}>Uso anterior: <strong>{x.anterior.alumno}</strong> ({x.anterior.grupo}) · {fmtD(parseISO(x.anterior.fecha))} · {x.anterior.hora} · con {x.anterior.profesor}</div>}
            {x.estado !== "abierta" && x.resuelta && <div style={{ fontSize: 14, color: R.verdeOscuro }}>Resuelta por {x.resuelta.por} el {fmtD(x.resuelta.ts)}</div>}
          </div>
          {puedeResolver && x.estado === "abierta" && (
            <button onClick={() => setIncidencias(prev => prev.map(y => y.id === x.id ? { ...y, estado: "resuelta", resuelta: { por: usuario, ts: new Date().toISOString() } } : y))}
              style={{ alignSelf: "center", minHeight: 44, padding: "0 14px", border: "none", borderRadius: 6, background: R.verde, color: R.noche, fontWeight: 700, cursor: "pointer" }}>Marcar resuelta</button>
          )}
        </div>
      ))}
    </div>
  );
}

// Coordinación TIC: aulas con puestos, su función y su plano (filas y puestos a cada lado del pasillo)
function AulasMaterialCentro({ aulas, setAulas, espacios }) {
  const lista = listaAulasMaterial(aulas);
  const esp = listaEspacios(espacios).filter(e => !e.oculta);
  const cambiar = (id, c) => setAulas(lista.map(a => a.id === id ? { ...a, ...c } : a));
  const [ver, setVer] = useState(null);
  const campo = { width: "100%", minHeight: 44, padding: "6px 10px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: C.white, boxSizing: "border-box" };
  const num = (a, k, txt, max = 12) => (
    <label style={{ display: "grid", gap: 2, fontSize: 13, color: R.petroleo }}>{txt}
      <input type="number" min={1} max={max} aria-label={`${txt} de ${a.nombre}`} value={a[k]} onChange={e => cambiar(a.id, { [k]: Math.max(1, Math.min(max, Number(e.target.value) || 1)) })} style={{ ...campo, width: 74 }} />
    </label>
  );
  const anadir = () => setAulas([...lista, { id: `m-${Date.now()}`, nombre: "Aula nueva", funcion: "Informática", espacioId: "", filas: 4, izq: 3, der: 3, prefijo: "PC" }]);
  return (
    <div style={{ marginBottom: 24 }}>
      <TituloBloque titulo="Material del centro" sub="Aulas con puestos (informática, laboratorios…): su función y su plano" icono="ordenador" />
      <div className="gd-material-admin" style={{ background: R.azulClaro, padding: 16, display: "grid", gap: 10 }}>
        {lista.map(a => (
          <div key={a.id} data-aula-material={a.id} style={{ background: a.oculta ? R.gris : C.white, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
              <input aria-label={`Nombre del aula ${a.nombre}`} value={a.nombre} onChange={e => cambiar(a.id, { nombre: e.target.value })} style={campo} />
              <select aria-label={`Función de ${a.nombre}`} value={a.funcion} onChange={e => cambiar(a.id, { funcion: e.target.value })} style={campo}>{FUNCIONES_MATERIAL.map(f => <option key={f}>{f}</option>)}</select>
              <select aria-label={`Espacio de ${a.nombre}`} value={a.espacioId || ""} onChange={e => cambiar(a.id, { espacioId: e.target.value })} style={campo}>
                <option value="">Sin espacio asociado</option>{esp.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              {num(a, "filas", "Filas", 15)}{num(a, "izq", "Puestos a la izquierda del pasillo")}{num(a, "der", "A la derecha")}
              <label style={{ display: "grid", gap: 2, fontSize: 13, color: R.petroleo }}>Nombre de los puestos
                <input aria-label={`Prefijo de los puestos de ${a.nombre}`} value={a.prefijo} onChange={e => cambiar(a.id, { prefijo: e.target.value })} style={{ ...campo, width: 110 }} />
              </label>
              <span style={{ fontSize: 14, color: R.petroleo, minHeight: 44, display: "inline-flex", alignItems: "center" }}>{a.filas * (a.izq + a.der)} puestos: {codigoPuesto(a, 1)} … {codigoPuesto(a, a.filas * (a.izq + a.der))}</span>
              <button type="button" onClick={() => setVer(ver === a.id ? null : a.id)} style={{ minHeight: 44, padding: "0 12px", borderRadius: 6, border: `2px solid ${R.azul}`, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer" }}>{ver === a.id ? "Ocultar plano" : "Ver plano"}</button>
              <button type="button" onClick={() => cambiar(a.id, { oculta: !a.oculta })} style={{ minHeight: 44, padding: "0 12px", borderRadius: 6, border: `2px solid ${R.azul}`, background: "#fff", color: R.petroleo, fontWeight: 700, cursor: "pointer" }}>{a.oculta ? "Mostrar" : "Ocultar"}</button>
            </div>
            {ver === a.id && <PlanoAula aula={a} />}
          </div>
        ))}
        <button type="button" aria-label="Añadir aula con puestos" onClick={anadir} style={{ justifySelf: "start", minHeight: 44, padding: "0 16px", borderRadius: 6, border: "none", background: R.azul, color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Añadir aula</button>
        <div style={{ fontSize: 14, color: R.petroleo }}>Los puestos se numeran desde la izquierda del profesor/a hasta su derecha, la fila completa con el pasillo en medio, y después la fila siguiente.</div>
      </div>
    </div>
  );
}

// Secretaría: cuentas de Conserjería, aparte del profesorado. Solo entran a Espacios (llaves y reservas)
function PersonalConserjeria({ cuentas, setCuentas, profesores = [], C, inpStyle }) {
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState("");
  const lista = personalNoDocente(cuentas);
  const anadir = () => {
    const n = nuevo.trim(); if (!n) return;
    if (profesores.includes(n) || cuentas[n]) { setError(`Ya hay una cuenta con el nombre «${n}».`); return; }
    setCuentas(prev => ({ ...prev, [n]: { cargos: ["conserjeria"], noDocente: true } })); setNuevo(""); setError("");
  };
  return (
    <Card>
      <h3 style={{ marginTop: 0, color: C.dark, display: "flex", alignItems: "center", gap: 10 }}><Icono nombre="llave" tam={44} />Personal de Conserjería</h3>
      <p style={{ marginTop: 0, fontSize: 14, color: C.gray }}>Cuentas aparte del profesorado: no salen en guardias, partes ni listas de profesores. Solo entran a <b>Espacios</b> (llaves y reservas). Puede ser una cuenta por persona o una para el puesto, por ejemplo «Conserjería».</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input id="gd-conserje-nuevo" value={nuevo} onChange={e => { setNuevo(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter") anadir(); }} placeholder="Nombre de la cuenta (persona o puesto)" style={{ ...inpStyle, flex: "1 1 220px" }} />
        <Btn onClick={anadir} disabled={!nuevo.trim()}>Añadir a Conserjería</Btn>
      </div>
      {error && <div role="alert" style={{ marginTop: 8, color: C.dark, fontWeight: 700, borderLeft: `5px solid ${R.mostaza}`, paddingLeft: 8 }}>{error}</div>}
      <div style={{ marginTop: 12, display: "grid", gap: 1, background: R.turquesaClaro }}>
        {lista.length === 0 && <div style={{ background: "#fff", padding: 12, color: C.gray }}>Todavía no hay ninguna cuenta de Conserjería.</div>}
        {lista.map(n => (
          <div key={n} data-conserje={n} style={{ background: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icono nombre="llave" tam={36} />
              <div><div style={{ fontWeight: 700, color: C.dark }}>{n}</div><div style={{ fontSize: 13, color: cuentas[n]?.clave ? C.teal : C.gray }}>{cuentas[n]?.clave ? "Clave creada" : "Sin clave: la creará al entrar por primera vez"}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cuentas[n]?.clave && <button onClick={() => { if (window.confirm(`¿Restablecer la clave de ${n}?`)) setCuentas(prev => ({ ...prev, [n]: { ...prev[n], clave: null } })); }} style={{ minHeight: 40, background: "#DDF0F4", color: C.blue, border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer", fontWeight: 600 }}>Restablecer clave</button>}
              <button aria-label={`Eliminar la cuenta de ${n}`} onClick={() => { if (window.confirm(`¿Eliminar la cuenta de Conserjería «${n}»?`)) setCuentas(prev => { const c = { ...prev }; delete c[n]; return c; }); }} style={{ minHeight: 40, background: "#FDF1D9", color: C.dark, border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer", fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
// Jefatura de Estudios: espacios del centro, si se reservan, si tienen llave y dónde se guarda
function EspaciosCentro({ espacios, setEspacios }) {
  const lista = listaEspacios(espacios);
  const [nueva, setNueva] = useState({ nombre: "", edificio: "", custodia: "conserjeria" });
  const cambiar = (id, cambios) => setEspacios(lista.map(k => k.id === id ? { ...k, ...cambios } : k));
  const campo = { width: "100%", minHeight: 44, padding: "8px 12px", borderRadius: 6, border: `3px solid ${R.turquesa}`, fontSize: 16, fontFamily: "inherit", color: R.noche, background: C.white, boxSizing: "border-box" };
  const boton = { minHeight: 44, padding: "0 14px", borderRadius: 6, border: `2px solid ${R.azul}`, background: C.white, color: R.petroleo, fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
  const anadir = () => {
    const nombre = nueva.nombre.trim(); if (!nombre) return;
    setEspacios([...lista, { id: `e-${Date.now()}`, nombre, edificio: nueva.edificio.trim(), custodia: nueva.custodia, reservable: true, llave: true }]);
    setNueva({ nombre: "", edificio: "", custodia: nueva.custodia });
  };
  const fila = { display: "grid", gridTemplateColumns: "minmax(0,1fr) 70px 190px auto auto auto", gap: 8, alignItems: "center" };
  const marca = (k, campoId, txt) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: R.petroleo, whiteSpace: "nowrap", minHeight: 44 }}>
      <input type="checkbox" checked={k[campoId] !== false} onChange={e => cambiar(k.id, { [campoId]: e.target.checked })} style={{ width: 20, height: 20, accentColor: R.azul }} aria-label={`${txt}: ${k.nombre}`} />{txt}
    </label>
  );
  return (
    <div style={{ marginBottom: 24 }}>
      <TituloBloque titulo="Espacios del centro" sub="Aulas especiales que se reservan y llaves que se recogen en Conserjería o en Dirección" icono="llave" />
      <div className="gd-espacios-admin" style={{ background: R.azulClaro, padding: 16, display: "grid", gap: 1 }}>
        <style>{`@media (max-width: 760px) { .gd-espacios-admin .gd-fila-esp { grid-template-columns: 1fr 1fr !important; } .gd-espacios-admin .gd-fila-esp > :first-child { grid-column: 1 / -1; } }`}</style>
        {lista.map(k => (
          <div key={k.id} data-espacio-admin={k.id} className="gd-fila-esp" style={{ ...fila, background: k.oculta ? R.gris : C.white, padding: "10px 12px" }}>
            <input aria-label={`Nombre del espacio ${k.nombre}`} value={k.nombre} onChange={e => cambiar(k.id, { nombre: e.target.value })} style={{ ...campo, opacity: k.oculta ? .7 : 1 }} />
            <input aria-label={`Edificio de ${k.nombre}`} value={k.edificio || ""} placeholder="Edif." onChange={e => cambiar(k.id, { edificio: e.target.value })} style={campo} />
            <select aria-label={`Dónde se guarda la llave de ${k.nombre}`} value={k.custodia} onChange={e => cambiar(k.id, { custodia: e.target.value })} style={campo}>
              {Object.entries(CUSTODIA).map(([id, t]) => <option key={id} value={id}>Llave en {t}</option>)}
            </select>
            {marca(k, "reservable", "Se reserva")}
            {marca(k, "llave", "Con llave")}
            <button type="button" onClick={() => cambiar(k.id, { oculta: !k.oculta })} style={boton}>{k.oculta ? "Mostrar" : "Ocultar"}</button>
          </div>
        ))}
        <div className="gd-fila-esp" style={{ ...fila, gridTemplateColumns: "minmax(0,1fr) 70px 190px auto", background: C.white, padding: "10px 12px", marginTop: 10 }}>
          <input id="gd-espacio-nuevo" aria-label="Nombre del espacio nuevo" value={nueva.nombre} onChange={e => setNueva(v => ({ ...v, nombre: e.target.value }))} placeholder="Añadir: por ejemplo, Aula de Robótica" style={campo} />
          <input aria-label="Edificio del espacio nuevo" value={nueva.edificio} placeholder="Edif." onChange={e => setNueva(v => ({ ...v, edificio: e.target.value }))} style={campo} />
          <select aria-label="Dónde se guarda la llave del espacio nuevo" value={nueva.custodia} onChange={e => setNueva(v => ({ ...v, custodia: e.target.value }))} style={campo}>
            {Object.entries(CUSTODIA).map(([id, t]) => <option key={id} value={id}>Llave en {t}</option>)}
          </select>
          <button type="button" aria-label="Añadir espacio" onClick={anadir} disabled={!nueva.nombre.trim()} style={{ ...boton, background: nueva.nombre.trim() ? R.azul : R.gris, color: nueva.nombre.trim() ? "#fff" : R.petroleo, border: "none" }}>Añadir</button>
        </div>
        <div style={{ fontSize: 14, color: R.petroleo, marginTop: 8 }}>«Se reserva»: sale en Reservas. «Con llave»: sale en Llaves. Los espacios no se borran: «Ocultar» los quita sin perder lo ya anotado.</div>
      </div>
    </div>
  );
}

// Horario del centro (Jefatura de Estudios): horas de inicio y fin de cada franja
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

// Datos del centro (Secretaría): nombre y localidad que salen en la app, los PDF y los correos
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
            <input id="gd-centro-nombre" value={datos.nombre || ""} onChange={e => setDatos(d => ({ ...d, nombre: e.target.value }))} placeholder="Nombre completo del centro" style={campo} />
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
          {!misTutorias.length && <div style={{ fontSize: 14, color: R.petroleo, marginTop: 10 }}>Estás viendo tus partes como profesor/a. Si eres tutor/a y no aparece tu grupo, pide a Secretaría que te asigne la tutoría.{MODO_DEMO ? " En la demostración, para verlo como tutor/a pulsa «Salir» y entra con el botón «Tutor/a de un grupo»." : ""}</div>}
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

      {/* Comparativa entre grupos y niveles, en roscos (Jefatura) */}
      {!esProfe && <ComparativaCursos partes={est.partes} />}

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
// GLOBITOS DE ADVERTENCIAS: número en azul noche en módulos, pestañas y cabecera
// ════════════════════════════════════════════════════════════════════════════
const Globito = ({ n, flota = false }) => n > 0
  ? <span className={"gd-globo" + (flota ? " flota" : "")} aria-hidden="true">{n > 99 ? "99+" : n}</span>
  : null;
// Para lectores de pantalla: el número va como descripción del botón, sin cambiar su nombre
const avisosTxt = n => n > 0 ? (n === 1 ? "1 aviso" : `${n} avisos`) : undefined;
// Campana de la cabecera: al pulsarla, lista de lo que tienes pendiente, con acceso directo
function PanelAdvertencias({ lista, onIr }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 12, width: 340 });
  const ref = useRef(null);
  const total = lista.reduce((n, a) => n + a.n, 0);
  // El panel se coloca bajo la campana sin salirse de la pantalla (en el móvil la campana no está en la esquina)
  const abrir = () => {
    if (abierto) { setAbierto(false); return; }
    const r = ref.current.getBoundingClientRect(), vw = window.innerWidth;
    const width = Math.min(340, vw - 24);
    const right = Math.min(Math.max(12, vw - r.right), vw - 12 - width);
    setPos({ top: r.bottom + 8, right, width }); setAbierto(true);
  };
  useEffect(() => {
    if (!abierto) return;
    const fuera = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const esc = e => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="gd-redondo" style={{ position: "relative" }} onClick={abrir} aria-expanded={abierto}
        aria-label={total ? `Advertencias: ${total}` : "Advertencias: ninguna"} title="Advertencias">
        <Icono nombre="alertas" tam={52} /><Globito n={total} flota />
      </button>
      {abierto && (
        <div role="dialog" aria-label="Advertencias" style={{ position: "fixed", right: pos.right, top: pos.top, zIndex: 150, width: pos.width, maxHeight: `calc(100vh - ${pos.top + 12}px)`, overflowY: "auto", background: "#fff", border: `1px solid ${R.turquesaClaro}`, borderTop: `4px solid ${R.noche}`, boxShadow: "0 12px 32px rgba(22,51,63,.18)", borderRadius: 8, padding: 8 }}>
          <div style={{ fontFamily: TITULO, fontSize: 17, color: R.petroleo, padding: "6px 8px 8px" }}>Tienes pendiente</div>
          {lista.length === 0
            ? <div style={{ padding: "8px 8px 12px", color: R.noche, fontSize: 15 }}>✅ Nada pendiente. Todo al día.</div>
            : lista.map(a => (
              <button key={a.id} onClick={() => { setAbierto(false); onIr(a); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 48, padding: "6px 8px", border: "none", borderTop: `1px solid ${R.gris}`, background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 15, color: R.noche }}>
                <Icono nombre={a.icono} tam={32} />
                <span style={{ flex: 1 }}><strong>{a.n}</strong> {a.txt}</span>
                <span aria-hidden="true" style={{ color: R.petroleo, fontSize: 18 }}>›</span>
              </button>
            ))}
        </div>
      )}
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
      <p style={{ margin: "8px 0 0", color: C.gray, fontSize: 14 }}><strong>¿La instalaste antes y ves el icono antiguo?</strong> El móvil y el ordenador guardan el icono del día en que la instalaste. Quítala (mantén pulsado el icono y elige eliminar, o en el ordenador desinstálala desde el menú de la app) y vuelve a instalarla siguiendo estos pasos.</p>
      <p style={{ margin: "8px 0 0", color: C.gray, fontSize: 14 }}>Después, para la demostración: pulsa «Cargar los datos de ejemplo» y elige un perfil (Profesor/a, Tutor/a, Jefatura de Estudios, Secretaría, Coordinación TIC o Conserjería). Recuerda que en esta versión cada dispositivo tiene sus propios datos.</p>
    </div>
  );
}

// Raíces frente a RumboAula, para «¿Qué es RumboAula?»
const COMPARA_RAICES = [
  ["Qué es", "La plataforma oficial de gestión educativa de la Comunidad de Madrid.", "Una herramienta interna del centro para la organización y la coordinación del día a día."],
  ["Para qué", "Notas y evaluación, matrícula, expediente y gestiones con la Administración.", "Convivencia, guardias y ausencias, reservas de espacios y llaves, material del centro y avisos internos."],
  ["Quién la usa", "El centro, en su relación oficial con la Administración y con las familias.", "Dirección, Jefatura, profesorado y Conserjería entre sí, y con las familias en algunos casos (por ejemplo, el aviso por varios partes o una conducta positiva)."],
  ["Ritmo", "Pensada para la gestión administrativa: completa, pero con más pasos y pantallas.", "Pensada para el aula, el pasillo y la conserjería: desde el móvil, en uno o dos toques."],
  ["Validez", "Es el registro oficial.", "Es un apoyo interno: lo que tenga que constar oficialmente se sigue registrando en Raíces."],
];
// Qué se puede hacer con RumboAula, módulo a módulo
const FUNCIONES_RUMBO = [
  ["partes", "Partes y convivencia", "Parte en menos de un minuto, medidas correctoras, conductas positivas y aviso a la familia, al tutor/a, a Jefatura y a Orientación."],
  ["guardias", "Guardias y ausencias", "Quién está en cada zona, clases sin profesor y quién las cubre, ausencias con la tarea para el alumnado y reparto equilibrado de las coberturas."],
  ["llave", "Espacios", "Reserva de laboratorios, aulas de informática, salón de actos y otros espacios, y quién tiene cada llave, junto con Conserjería."],
  ["ordenador", "Material del centro", "Quién se sienta en cada puesto y con qué profesor/a, incidencias con el último uso, y necesidades y avisos que llegan a quien los gestiona."],
  ["mensajes", "Rumbogram y avisos", "Mensajes rápidos y avisos urgentes a la guardia de tu zona, y una campana con todo lo que tienes pendiente."],
];
const QueEsRumboAula = () => (
  <>
    <p><strong>RumboAula</strong> es una aplicación <strong>interna del centro</strong> para la organización diaria entre <strong>Dirección, Jefatura de Estudios, profesorado y Conserjería</strong> y, en algunos casos, con las <strong>familias</strong>. Resuelve en segundos y desde el móvil lo que pasa cada día en el instituto: un parte, una guardia, una clase sin profesor, una reserva del laboratorio, una llave, un ordenador roto.</p>
    <p><strong>Raíces es y seguirá siendo la plataforma oficial</strong> para las notas, la matrícula, el expediente y las gestiones con la Administración. RumboAula no la sustituye ni compite con ella: la <strong>complementa</strong> y se ocupa de la organización interna del día a día.</p>
    <div style={{ overflowX: "auto", margin: "10px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, lineHeight: 1.45 }}>
        <thead>
          <tr>
            <th style={{ width: "18%" }}></th>
            <th style={{ textAlign: "left", padding: "8px 10px", background: R.gris, color: R.noche }}>Raíces <span style={{ fontWeight: 400 }}>· oficial</span></th>
            <th style={{ textAlign: "left", padding: "8px 10px", background: R.azul, color: "#fff" }}>RumboAula <span style={{ fontWeight: 400 }}>· interna</span></th>
          </tr>
        </thead>
        <tbody>
          {COMPARA_RAICES.map(([t, raices, rumbo]) => (
            <tr key={t} style={{ borderBottom: `1px solid ${R.turquesaClaro}` }}>
              <th scope="row" style={{ textAlign: "left", padding: "8px 6px", color: R.petroleo, verticalAlign: "top" }}>{t}</th>
              <td style={{ padding: "8px 10px", verticalAlign: "top" }}>{raices}</td>
              <td style={{ padding: "8px 10px", verticalAlign: "top", background: R.azulClaro }}>{rumbo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p style={{ marginBottom: 6 }}><strong>Qué puedes hacer con RumboAula:</strong></p>
    <div data-funciones style={{ display: "grid", gap: 6, marginBottom: 12 }}>
      {FUNCIONES_RUMBO.map(([ico, t, txt]) => (
        <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: R.azulClaro, padding: "8px 10px" }}>
          <Icono nombre={ico} tam={30} />
          <div><strong style={{ color: R.petroleo }}>{t}</strong><div style={{ fontSize: 13 }}>{txt}</div></div>
        </div>
      ))}
    </div>
    <p style={{ marginBottom: 4 }}><strong>Por qué es importante para el centro:</strong></p>
    <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>
      <li><strong>Agilidad:</strong> lo que antes llevaba varios pasos o un paseo hasta conserjería se hace desde el móvil, en uno o dos toques.</li>
      <li><strong>Todo en un solo sitio:</strong> deja atrás la libreta de llaves, la hoja de reservas pegada en la puerta, el cuadrante de guardias en papel y la hoja de puestos del aula de informática.</li>
      <li><strong>Menos papel, mesas sin papeles:</strong> partes, guardias, ausencias, reservas, llaves y avisos se consultan en la pantalla en lugar de imprimirse y fotocopiarse. Se gasta menos en papel y tóner y se reduce el impacto ambiental del centro. El PDF se genera solo cuando hace falta firmar o archivar algo.</li>
      <li><strong>Coordinación al momento:</strong> partes, ausencias, coberturas, reservas e incidencias llegan a quien tiene que verlas, con aviso en Rumbogram y en la campana.</li>
      <li><strong>Responsabilidad y cuidado del material:</strong> queda constancia de quién tiene cada llave y de quién se sienta en cada puesto, y con qué profesor/a.</li>
      <li><strong>Equilibrio y seguimiento:</strong> reparto justo de las coberturas, estadísticas de convivencia y avisos del alumnado con varios partes.</li>
      <li><strong>Familias, cuando hace falta:</strong> informes y correos preparados, también para reconocer lo que el alumnado hace bien.</li>
      <li><strong>Menos tiempo en trámites</strong> y más tiempo para el alumnado.</li>
    </ul>
    <p style={{ margin: 0 }}>En resumen: <strong>Raíces es el registro oficial; RumboAula es la herramienta ágil de la organización diaria</strong> del centro, para Dirección, Jefatura, profesorado, Conserjería y, cuando hace falta, las familias. Y con <strong>menos papel</strong>.</p>
  </>
);

const PREGUNTAS = [
  { id: "que-es", q: "¿Qué es RumboAula y en qué se diferencia de Raíces?", a: <QueEsRumboAula /> },
  { id: "instalar", q: "¿Cómo instalo RumboAula en el móvil o en el ordenador para ver una demostración?", a: <GuiaInstalar /> },
  { id: "datos", q: "¿Dónde se guardan los datos?", a: <>
    <p>En esta <strong>versión de demostración</strong>, en el navegador del dispositivo que estás usando: no se envían a ningún sitio. Por eso todo lo que ves es ficticio y <strong>no deben introducirse datos reales</strong> de alumnado ni de familias.</p>
    <p>Cuando se use en un centro, <strong>cada centro tendrá su propia RumboAula</strong>, instalada en un servidor del propio instituto. Su uso es <strong>local</strong>: los datos estarán <strong>solo en ese servidor</strong>, no irán a ningún espacio externo ni a la nube y no se compartirán con otros centros.</p></> },
  { id: "dispositivos", q: "¿La puedo usar en el móvil y en el ordenador?", a: <>
    <p>Sí: es la misma aplicación, con el mismo enlace, en cualquier navegador. Se adapta a la pantalla del móvil, la tableta o el ordenador.</p>
    <p>En esta versión, cada dispositivo guarda sus propios datos: lo que hagas en el móvil no aparece en el ordenador. Cuando funcione con el servidor del centro, verás lo mismo en todos.</p>
    <p>En el centro, para usarla hay que estar <strong>conectado a la wifi o a la red del instituto</strong>: el servidor solo se ve desde dentro. La demostración, en cambio, funciona desde cualquier sitio con internet.</p></> },
  { id: "mensajes", q: "¿Por qué no le ha llegado mi mensaje a un compañero?", a: <>
    <p>Porque en esta versión los mensajes de Rumbogram se quedan en el dispositivo donde se escriben. En la demostración, para ver cómo llega un aviso, pulsa «Salir» y entra como quien lo ha recibido en «Entrar como otro profe del claustro».</p>
    <p>Con el servidor del centro, el mensaje llegará al momento al móvil o al ordenador del compañero.</p></> },
  { id: "privacidad", q: "¿Quién puede ver mis mensajes de Rumbogram?", a: <p>Solo tú y las personas a las que se lo envías. Cada uno ve únicamente los mensajes que ha enviado o recibido.</p> },
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
  { id: "licencia", q: "¿Quién es la autora y qué licencia tiene?", a: <>
    <p>RumboAula es una obra de <strong>{AUTORA}</strong> (© 2026).</p>
    <p><strong>Uso educativo libre y sin fines comerciales:</strong> cualquier centro educativo o Administración pública puede usarla y adaptarla gratis, citando a la autora. No se puede vender ni usar con fines comerciales sin su permiso.</p>
    <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>
      <li>El programa se distribuye con la licencia <strong>PolyForm Noncommercial 1.0.0</strong>.</li>
      <li>El manual de uso, con la licencia <strong>Creative Commons Reconocimiento-NoComercial-CompartirIgual 4.0</strong> (CC BY-NC-SA 4.0).</li>
      <li>Los dibujos de los iconos son de Font Awesome Free (CC BY 4.0).</li>
    </ul>
    <p>El texto completo está en el archivo LICENSE del repositorio: <a href="https://github.com/mtgonzalezm/rumboaula" target="_blank" rel="noopener noreferrer">github.com/mtgonzalezm/rumboaula</a>.</p></> },
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
  // Al abrir una pregunta concreta (por ejemplo «Licencia»), la ventana baja hasta ella
  const [irA, setIrA] = useState(0);
  useEffect(() => {
    const h = ev => { if (ev.detail) setIrA(n => n + 1); };
    window.addEventListener("rumbo:faq", h);
    return () => window.removeEventListener("rumbo:faq", h);
  }, []);
  useEffect(() => {
    if (!abierto || !desplegada || !irA) return;
    const t = setTimeout(() => document.getElementById(`faq-${desplegada}`)?.scrollIntoView({ block: "start" }), 30);
    return () => clearTimeout(t);
  }, [abierto, irA]); // eslint-disable-line react-hooks/exhaustive-deps
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
            <details key={id} id={`faq-${id}`} open={desplegada === id} onToggle={e => { if (e.currentTarget.open) setDesplegada(id); else if (desplegada === id) setDesplegada(""); }}
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
  // Conductas positivas: {id, alumnoId, alumno, curso, tipo, detalle, profesor, ts}
  const [positivas, setPositivas] = useState([]);
  // Compromisos y mediaciones: {id, tipo, alumnos[], mediador, acuerdo, revisar, estado, creadoPor, ts, seguimiento[]}
  const [compromisos, setCompromisos] = useState([]);
  // Notas de aula (sin carga disciplinaria): {id, alumnoId, alumno, curso, profesor, materia, categoria, texto, ts}
  const [notasAula, setNotasAula] = useState([]);
  const [alertasTempVistas, setAlertasTempVistas] = useState({}); // alertas tempranas que el tutor/a ya ha visto
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
  const [espaciosCentro, setEspaciosCentro] = useState(null); // null = los de ejemplo
  const [prestamosLlaves, setPrestamosLlaves] = useState([]);
  const [reservasEspacios, setReservasEspacios] = useState([]);
  const [asistenciaAl, setAsistenciaAl] = useState([]);           // listas de cada clase
  const [justificantesAl, setJustificantesAl] = useState([]);     // justificantes del alumnado
  const [limitesAsis, setLimitesAsis] = useState(LIMITES_ASISTENCIA);
  const [novedadesEspacios, setNovedadesEspacios] = useState([]); // reservas y anulaciones, para avisar a todos
  const [vistasNovedades, setVistasNovedades] = useState({});     // { persona: fecha de la última vez que miró }
  const [aulasMaterial, setAulasMaterial] = useState(null); // null = las de ejemplo
  const [sesionesMaterial, setSesionesMaterial] = useState([]);
  const [incidenciasMaterial, setIncidenciasMaterial] = useState([]);
  const [avisosMaterial, setAvisosMaterial] = useState([]);
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
  // Clases que alguien de guardia se ha asignado él mismo: { "fecha|hora|idAusencia": profesor }
  const [coberturasPropias, setCoberturasPropias] = useState({});
  const [vistaGalv, setVistaGalv]     = useState({ v: "enviar", k: 0 });
  const [ultimoProfe, setUltimoProfe] = useState(() => { try { return localStorage.getItem(PREFIJO + "ultimo_profe") || ""; } catch { return ""; } });
  useEffect(() => { try { if (ultimoProfe) localStorage.setItem(PREFIJO + "ultimo_profe", ultimoProfe); } catch { /* sin almacenamiento */ } }, [ultimoProfe]); // vista con la que se abre Rumbogram
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
      const pos = await sGet("positivas"); if (pos) setPositivas(pos);
      const comp = await sGet("compromisos"); if (comp) setCompromisos(comp);
      const nau = await sGet("notas_aula"); if (nau) setNotasAula(nau);
      const atv = await sGet("alertas_tempranas_vistas"); if (atv) setAlertasTempVistas(atv);
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
      const cobP = await sGet("coberturas_propias"); if (cobP) setCoberturasPropias(cobP);
      const hor = await sGet("horarios_clase"); if (hor) setHorarios(hor);
      const pg = await sGet("profesores_guardia"); if (pg) setProfesoresGuardia(pg);
      // En la demostración siempre existe la cuenta de Conserjería, aunque se guardaran cuentas antes de que existiera
      const cu = await sGet("cuentas"); if (cu) setCuentas(MODO_DEMO ? { "Conserjería": CUENTAS_DEMO["Conserjería"], ...cu } : cu);
      const fi = await sGet("firmas_guardia"); if (fi) setFirmas(fi);
      const li = await sGet("listas_guardia"); if (li) setListas(li);
      const avf = await sGet("avisos_familia"); if (avf) setAvisosFamilia(avf);
      const cc = await sGet("correos_centro"); if (cc) setCorreosCentro(cc);
      const dc = await sGet("datos_centro"); if (dc) setDatosCentro(dc);
      const hc = await sGet("horario_centro"); if (hc) setHorarioCentro(hc);
      const zc = await sGet("zonas_centro"); if (zc) setZonasCentro(zc);
      const es = await sGet("espacios_centro"); if (es) setEspaciosCentro(es);
      const pl = await sGet("llaves_prestamos"); if (pl) setPrestamosLlaves(pl);
      const rs = await sGet("reservas_espacios"); if (rs) setReservasEspacios(rs);
      const ne = await sGet("espacios_novedades"); if (ne) setNovedadesEspacios(ne);
      const asi = await sGet("asistencia_alumnado"); if (asi) setAsistenciaAl(asi);
      const jus = await sGet("justificantes_alumnado"); if (jus) setJustificantesAl(jus);
      const lim = await sGet("asistencia_limites"); if (lim) setLimitesAsis({ ...LIMITES_ASISTENCIA, ...lim });
      const nv = await sGet("espacios_novedades_vistas"); if (nv) setVistasNovedades(nv);
      const am = await sGet("material_aulas"); if (am) setAulasMaterial(am);
      const sm = await sGet("material_sesiones"); if (sm) setSesionesMaterial(sm);
      const im = await sGet("material_incidencias"); if (im) setIncidenciasMaterial(im);
      const av = await sGet("material_avisos"); if (av) setAvisosMaterial(av);
      const cuentasActuales = cu || CUENTAS_DEMO;
      const ses = leerSesion();
      // Solo se recupera la sesión si esa persona tiene clave y su cargo permite ese perfil
      if (ses?.usuario && ses?.perfil && (cuentasActuales[ses.usuario]?.clave || MODO_DEMO) &&
          perfilesPermitidos(cuentasActuales, ses.usuario).some(p => p.id === ses.perfil.id)) {
        setUsuario(ses.usuario); setPerfil(ses.perfil);
        if ((pr || DEMO_PROFESORES).includes(ses.usuario)) setFProfesor(ses.usuario);
        setTab(inicioDe(ses.perfil).tab); setModuloJefatura(inicioDe(ses.perfil).modulo);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => { if (!loading) sSet("partes", partes); },     [partes, loading]);
  useEffect(() => { if (!loading) sSet("medidas", medidas); },   [medidas, loading]);
  useEffect(() => { if (!loading) sSet("banos", banos); },       [banos, loading]);
  useEffect(() => { POSITIVAS_PDF = positivas; if (!loading) sSet("positivas", positivas); }, [positivas, loading]);
  useEffect(() => { if (!loading) sSet("alertas", alertas); },   [alertas, loading]);
  useEffect(() => { if (!loading) sSet("compromisos", compromisos); }, [compromisos, loading]);
  useEffect(() => { if (!loading) sSet("notas_aula", notasAula); }, [notasAula, loading]);
  useEffect(() => { if (!loading) sSet("alertas_tempranas_vistas", alertasTempVistas); }, [alertasTempVistas, loading]);
  useEffect(() => { if (!loading) sSet("mensajes", mensajes); }, [mensajes, loading]);
  useEffect(() => { if (!loading) sSet("alumnos", alumnos); },   [alumnos, loading]);
  useEffect(() => { if (!loading) sSet("tutores", tutores); },   [tutores, loading]);
  useEffect(() => { if (!loading) sSet("informes", informes); }, [informes, loading]);
  useEffect(() => { if (!loading) sSet("profesores", profesores); }, [profesores, loading]);
  useEffect(() => { if (!loading) sSet("guardias",   guardias);   }, [guardias,   loading]);
  useEffect(() => { if (!loading) sSet("cuadrante", cuadrante); }, [cuadrante, loading]);
  useEffect(() => { if (!loading) sSet("coberturas_clase", coberturas); }, [coberturas, loading]);
  useEffect(() => { if (!loading) sSet("coberturas_propias", coberturasPropias); }, [coberturasPropias, loading]);
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
  useEffect(() => { if (!loading && espaciosCentro) sSet("espacios_centro", espaciosCentro); }, [espaciosCentro, loading]);
  useEffect(() => { if (!loading) sSet("reservas_espacios", reservasEspacios); }, [reservasEspacios, loading]);
  useEffect(() => { if (!loading) sSet("espacios_novedades", novedadesEspacios); }, [novedadesEspacios, loading]);
  useEffect(() => { if (!loading) sSet("asistencia_alumnado", asistenciaAl); }, [asistenciaAl, loading]);
  useEffect(() => { if (!loading) sSet("justificantes_alumnado", justificantesAl); }, [justificantesAl, loading]);
  useEffect(() => { if (!loading) sSet("asistencia_limites", limitesAsis); }, [limitesAsis, loading]);
  useEffect(() => { if (!loading) sSet("espacios_novedades_vistas", vistasNovedades); }, [vistasNovedades, loading]);
  useEffect(() => { if (!loading && aulasMaterial) sSet("material_aulas", aulasMaterial); }, [aulasMaterial, loading]);
  useEffect(() => { if (!loading) sSet("material_sesiones", sesionesMaterial); }, [sesionesMaterial, loading]);
  useEffect(() => { if (!loading) sSet("material_incidencias", incidenciasMaterial); }, [incidenciasMaterial, loading]);
  useEffect(() => { if (!loading) sSet("material_avisos", avisosMaterial); }, [avisosMaterial, loading]);
  useEffect(() => { if (!loading) sSet("llaves_prestamos", prestamosLlaves); }, [prestamosLlaves, loading]);
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
    setAlumnos(conv.alumnos); setPartes(conv.partes); setBanos(conv.banos); setPositivas(positivasEjemplo(conv.alumnos, DEMO_PROFESORES)); setAlertas(conv.alertas); setInformes(conv.informes); setTutores(conv.tutores);
    // Convivencia: compromisos, notas de aula y dos partes leves que muestran la alerta temprana
    setPartes(prev => [...partesAlertaEjemplo(conv.alumnos, DEMO_PROFESORES, conv.tutores), ...prev]);
    setCompromisos(compromisosEjemplo(conv.alumnos, DEMO_PROFESORES, conv.tutores)); setNotasAula(notasEjemplo(conv.alumnos, DEMO_PROFESORES, conv.tutores)); setAlertasTempVistas({});
    // El ejemplo usa los profesores ficticios de demostración; se añaden a la lista si faltan
    const lista = [...new Set([...profesores, ...DEMO_PROFESORES])];
    setProfesores(lista);
    const ej = datosEjemploGuardias(DEMO_PROFESORES);
    setCuadrante(ej.cuadrante); setApoyosGuardia(ej.apoyos); setSustitutosGuardia(ej.sustitutos); setAusencias(ej.ausencias); setCoberturas(ej.coberturas); setCoberturasPropias(ej.propias);
    const hEj = horarioEjemplo(DEMO_PROFESORES, [...new Set(conv.alumnos.map(a => a.curso))].sort());
    setHorarios(hEj);
    setAsistenciaAl(asistenciaEjemplo(hEj, conv.alumnos)); setJustificantesAl(justificantesEjemplo(conv.alumnos, DEMO_PROFESORES)); setLimitesAsis(LIMITES_ASISTENCIA);
    setFirmas(ej.firmas); setListas([]);
    setPrestamosLlaves(prestamosEjemplo(DEMO_PROFESORES, ej.sugerido));
    const rEj = reservasEjemplo(DEMO_PROFESORES, [...new Set(conv.alumnos.map(a => a.curso))].sort(), ej.sugerido);
    setReservasEspacios(rEj);
    // Unas novedades de ejemplo: las últimas reservas y una anulación
    const hace = h => new Date(Date.now() - h * 3600e3).toISOString();
    setNovedadesEspacios([
      ...rEj.filter(r => r.profesor !== ej.sugerido).slice(-3).map((r, i) => ({ id: 9500 + i, tipo: "reserva", espacio: r.espacio, fecha: r.fecha, hora: r.hora, profesor: r.profesor, semanas: 1, por: r.profesor, ts: hace(2 + i * 5) })),
      { id: 9510, tipo: "anulacion", espacio: "Sala de usos múltiples", fecha: rEj[0]?.fecha || isoLocal(new Date()), hora: "6ª hora", profesor: DEMO_PROFESORES[6], semanas: 1, por: DEMO_PROFESORES[6], ts: hace(1) },
    ]);
    setVistasNovedades({});
    const sm = sesionesMaterialEjemplo(conv.alumnos, DEMO_PROFESORES, ej.sugerido);
    setSesionesMaterial(sm); setIncidenciasMaterial(incidenciasMaterialEjemplo(sm, conv.alumnos, DEMO_PROFESORES));
    setAvisosMaterial(avisosMaterialEjemplo(DEMO_PROFESORES, ej.sugerido));
    if (ej.sugerido) { setUsuario(ej.sugerido); setUltimoProfe(ej.sugerido); }
    // Sin avisos emergentes: la pantalla de entrada muestra que los datos están cargados
  }

  function cambiarPerfil(id) {
    const p = perfilesPermitidos(cuentas, usuario).find(x => x.key === id || x.id === id);
    if (!p || (p.key && p.key === perfil?.key)) return;
    guardarSesion({ usuario, perfil: p });
    setPerfil(p); setTab(inicioDe(p).tab);
    setModuloProfesor("alumnos"); setModuloJefatura(inicioDe(p).modulo);
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
  // Abrir Rumbogram en el historial (desde un aviso)
  function abrirMensajes() {
    if (perfil?.id === "profesor") setModuloProfesor("rumbochat");
    if (perfil?.id === "jefatura") setModuloJefatura("rumbochat");
    setTab("mensajeria");
    setVistaGalv({ v: "historial", k: Date.now() });
  }
  const sinLeerMios = mensajes.filter(m => m.destinatario === usuario && !m.leido).length;

  const profeDemo = usuario || ultimoProfe;
  const tutoraDemo = (() => { const t = Object.entries(tutores).filter(([, v]) => v?.tutor && profesores.includes(v.tutor) && v.tutor !== profeDemo && !["Ana Jiménez", "Elena Vega", "Beatriz Navarro"].includes(v.tutor)).sort(([a], [b]) => a.localeCompare(b))[0]; return t ? { nombre: t[1].tutor, curso: t[0] } : null; })();
  if (!perfil) return (
    <PantallaEntrada profesores={profesores} cuentas={cuentas} setCuentas={setCuentas}
      nombreSugerido={profeDemo} onCargarEjemplo={cargarEjemploGuardias}
      tutoraDemo={tutoraDemo}
      sinLeerPor={mensajes.filter(m => !m.leido).reduce((acc, m) => { const a = acc[m.destinatario] || { total: 0, urgentes: 0 }; a.total++; if (m.urgente) a.urgentes++; acc[m.destinatario] = a; return acc; }, {})}
      onEntrar={(nombre, p, opciones = {}) => {
        setUsuario(nombre); if (profesores.includes(nombre)) setFProfesor(nombre);
        if (p.id === "profesor" && !opciones.otro && nombre !== tutoraDemo?.nombre && !["Ana Jiménez", "Elena Vega", "Beatriz Navarro"].includes(nombre)) setUltimoProfe(nombre);
        guardarSesion({ usuario: nombre, perfil: p }); setPerfil(p); setTab(inicioDe(p).tab); setModuloJefatura(inicioDe(p).modulo);
      }} />
  );

  const fx = funcionesDe(perfil);
  const misTutoriasProf = perfil.id === "profesor" ? Object.entries(tutores).filter(([, t]) => t?.tutor === (fProfesor || usuario)).map(([c]) => c).sort() : [];
  // Avisos de material que lleva quien está dentro: Coordinación TIC, las averías informáticas; Secretaría, el resto
  const gestionaAviso = a => perfil.id === "admin" && (cargoAviso(a) === "tic" ? fx.tic : fx.secretaria);
  const avisosPendientes = perfil.id === "profesor" && usuario ? alumnosParaAvisar({ partes, usuario, tutores, avisos: avisosFamilia }).lista.filter(x => x.pendiente).length : 0;
  // Número de la pestaña «Medidas»: las que hay que programar y las que tocan hoy
  const medidasHoy = medidas.filter(m => estadoMedida(m) === "sin_programar").length + medidas.reduce((n, m) => n + (m.sesiones || []).filter(s => s.fecha === isoLocal() && s.estado === "pendiente").length, 0);
  const tabs = perfil.id === "profesor"
    ? moduloProfesor === "alumnos"
      ? [
          { id: "partes",      label: "📋 Nuevo Parte", color: "#06b6d4" },
          { id: "parte_expres", label: "⚡ Parte exprés", color: R.azul },
          { id: "parte_grupo", label: "👥 Parte de Grupo", color: "#ec4899" },
          { id: "bano",        label: "🚻 Baños", color: "#63CBA1" },
          { id: "positivas",   label: "Conducta positiva", color: R.verdeCamino },
          { id: "notas_aula",  label: "🗒 Notas de aula", color: R.azul },
          { id: "compromisos", label: "🤝 Compromisos", color: R.azul },
          ...(misTutoriasProf.length ? [{ id: "resumen_tutoria", label: "📑 Resumen de tutoría", color: R.azul }] : []),
          { id: "historial",   label: "🗂 Mis Partes", color: "#2B647E" },
          { id: "mis_estadisticas", label: "📈 Estadísticas", color: "#06b6d4" },
        ]
      : moduloProfesor === "guardias"
      ? [
          { id: "ahora",          label: "⏰ Ahora", color: "#F6C862" },
          { id: "mi_guardia",     label: "🔄 Mi Guardia Hoy", color: "#06b6d4" },
          { id: "notif_ausencia", label: "📢 Notificar Ausencia", color: "#ec4899" },
          { id: "guardias_ver",   label: "📄 Ver Guardias", color: "#63CBA1" },
          { id: "mis_coberturas", label: "📋 Mis Coberturas", color: R.morado },
        ]
      : moduloProfesor === "espacios"
      ? [
          { id: "reservas", label: "📅 Reservas", color: R.azul },
          { id: "llaves",   label: "🔑 Llaves", color: R.mostaza },
        ]
      : moduloProfesor === "asistencia"
      ? [
          { id: "pasar_lista",   label: "✅ Pasar lista", color: R.azul },
          { id: "justificantes", label: "📄 Justificantes", color: R.azul },
          ...(misTutoriasProf.length ? [{ id: "asistencia_tutoria", label: "📊 Mi tutoría", color: R.azul }] : []),
        ]
      : moduloProfesor === "material"
      ? [
          { id: "material_sesion",      label: "🖥 Sesión en el aula", color: R.azul },
          { id: "material_historial",   label: "🗂 Historial de puestos", color: R.azul },
          { id: "material_incidencias", label: "🔔 Incidencias de puestos", color: R.mostaza },
          { id: "material_avisos",      label: "📢 Necesidades y avisos", color: R.azul },
        ]
      : [] // Rumbogram no tiene tabs adicionales
    : perfil.id === "jefatura"
    ? moduloJefatura === "alumnos"
      ? [
          { id: "dashboard",    label: "📊 Dashboard", color: "#06b6d4" },
          { id: "por_curso",    label: "🏫 Por Curso", color: "#ec4899" },
          { id: "por_alumno",   label: "👤 Por Alumno", color: "#63CBA1" },
          { id: "partes_todos", label: "📋 Partes", color: "#2B647E" },
          { id: "medidas",      label: "⚖️ Medidas", color: "#2B647E" },
          ...(fx.convivencia ? [{ id: "compromisos", label: "🤝 Compromisos", color: R.azul }] : []),
          { id: "bano_live",    label: "🚻 Baños", color: "#06b6d4" },
          { id: "alertas",      label: "🔔 Alertas", color: "#ec4899" },
          { id: "informe",      label: "📤 Informe", color: "#63CBA1" },
          { id: "estadisticas", label: "📈 Estadísticas", color: "#2B647E" },
          { id: "asistencia_jef", label: "✅ Asistencia", color: R.azul },
          { id: "justificantes", label: "📄 Justificantes", color: R.azul },
        ]
      : moduloJefatura === "guardias"
      ? [
          { id: "ahora",         label: "⏰ Ahora", color: "#F6C862" },
          { id: "cuadrante",     label: "📅 Cuadrante", color: "#06b6d4" },
          { id: "coordinacion",  label: "🔄 Coordinación Diaria", color: "#2B647E" },
          { id: "parte_dia",     label: "🔄 Parte del Día", color: "#ec4899" },
          { id: "ausencias_jef", label: "📢 Ausencias de Profesores", color: "#63CBA1" },
          { id: "firmas_jef",    label: "✍️ Firmas y listas", color: "#06b6d4" },
          { id: "resumen_cob",   label: "📊 Coberturas y ausencias", color: R.morado },
          { id: "estadisticas",  label: "📈 Estadísticas", color: "#2B647E" },
        ]
      : moduloJefatura === "organizacion"
      ? [
          { id: "horarios_aulas", label: "🗓 Horarios y aulas", color: R.azul },
          { id: "horario_zonas",  label: "⚙️ Horario y zonas", color: "#2B647E" },
          { id: "espacios_centro", label: "🔑 Espacios del centro", color: R.mostaza },
        ]
      : moduloJefatura === "espacios"
      ? [
          { id: "reservas", label: "📅 Reservas", color: R.azul },
          { id: "llaves",   label: "🔑 Llaves", color: R.mostaza },
        ]
      : moduloJefatura === "material"
      ? [
          { id: "material_sesion",      label: "🖥 Sesión en el aula", color: R.azul },
          { id: "material_historial",   label: "🗂 Historial de puestos", color: R.azul },
          { id: "material_avisos",      label: "📢 Necesidades y avisos", color: R.azul },
        ]
      : [] // Rumbogram no tiene tabs adicionales
    : perfil.id === "conserjeria"
    ? [
        { id: "llaves",   label: "🔑 Llaves", color: R.mostaza },
        { id: "reservas", label: "📅 Reservas", color: R.azul },
      ]
    : perfil.id === "admin" && moduloJefatura === "material"
    ? [
        { id: "material_avisos",      label: "📢 Necesidades y avisos", color: R.azul },
        ...(fx.tic ? [
          { id: "material_incidencias", label: "🔔 Incidencias de puestos", color: R.mostaza },
          { id: "material_historial",   label: "🗂 Historial de puestos", color: R.azul },
          { id: "admin_aulas",          label: "⚙️ Aulas con puestos", color: R.azul },
        ] : []),
      ]
    : []; // El resto de Secretaría no tiene pestañas, solo módulos

  // Módulos de cada perfil (franja turquesa o menú lateral)
  const irProfesor = (id) => { setModuloProfesor(id); setTab(id === "alumnos" ? "partes" : id === "guardias" ? "mi_guardia" : id === "espacios" ? "reservas" : id === "material" ? "material_sesion" : id === "asistencia" ? "pasar_lista" : "mensajeria"); };
  const irJefatura = (id) => { setModuloJefatura(id); setTab(id === "alumnos" ? "dashboard" : id === "guardias" ? "cuadrante" : id === "espacios" ? "reservas" : id === "material" ? "material_sesion" : id === "organizacion" ? "horarios_aulas" : "mensajeria"); };
  const irAdmin = (id) => { setModuloJefatura(id); setTab(id === "centro" ? "admin_panel" : id === "alumnos" ? "admin_alumnos" : id === "material" ? "material_avisos" : "admin_profesores"); };
  const modulos = perfil.id === "profesor"
    ? [
        { id: "alumnos",  label: "👨‍🎓 Partes" },
        { id: "asistencia", label: "✅ Asistencia" },
        { id: "guardias", label: "🔄 Guardias" },
        { id: "espacios", label: "🔑 Espacios" },
        { id: "material", label: "🖥 Material del centro" },
        { id: "rumbochat", label: "💬 Rumbogram" },
      ].map(m => ({ ...m, ir: () => irProfesor(m.id) }))
    : perfil.id === "jefatura"
    ? [
        { id: "alumnos",  label: "📋 Partes & Alumnos" },
        ...(fx.guardias ? [{ id: "guardias", label: "🔄 Guardias & Ausencias" }, { id: "organizacion", label: "🗓 Organización" }] : []),
        { id: "espacios", label: "🔑 Espacios" },
        { id: "material", label: "🖥 Material del centro" },
        { id: "rumbochat", label: "💬 Rumbogram" },
      ].map(m => ({ ...m, ir: () => irJefatura(m.id) }))
    : perfil.id === "admin"
    ? [
        ...(fx.secretaria ? [
          { id: "centro",   label: "🏫 Centro" },
          { id: "alumnos",  label: "👥 Alumnos" },
          { id: "guardias", label: "👨‍🏫 Profesores" },
        ] : []),
        { id: "material", label: "🖥 Material del centro" },
      ].map(m => ({ ...m, ir: () => irAdmin(m.id) }))
    : perfil.id === "conserjeria"
    ? [{ id: "espacios", label: "🔑 Espacios", ir: () => setTab("llaves") }]
    : [];
  const moduloActivo = perfil.id === "profesor" ? moduloProfesor : perfil.id === "conserjeria" ? "espacios" : moduloJefatura;

  // Advertencias pendientes: salen en el globito de la cabecera, de cada módulo y de cada pestaña
  const advertencias = (() => {
    const hoy = isoLocal(), lista = [];
    const add = (n, txt, modulo, tabId, icono) => { if (n > 0) lista.push({ id: `${modulo}-${tabId}`, n, txt, modulo, tab: tabId, icono }); };
    const equipoHoy = { profesores, cuadrante, apoyos: apoyosGuardia, sustitutos: sustitutosGuardia, ausencias };
    if (perfil.id === "profesor") {
      const yo = fProfesor || usuario;
      add(sinLeerMios, sinLeerMios === 1 ? "mensaje sin leer en Rumbogram" : "mensajes sin leer en Rumbogram", "rumbochat", "mensajeria", "mensaje-sin-leer");
      add(avisosPendientes, avisosPendientes === 1 ? "familia por avisar (3 o más partes)" : "familias por avisar (3 o más partes)", "alumnos", "mis_estadisticas", "alertas");
      const sinFirmar = esLectivo(new Date()) && yo ? guardiasDeProfesor({ fecha: hoy, profesor: yo, ...equipoHoy })
        .filter(g => horaEmpezada(hoy, g.hora) && !firmas.some(f => f.fecha === hoy && f.hora === g.hora && f.profesor === yo)).length : 0;
      add(sinFirmar, sinFirmar === 1 ? "guardia de hoy sin firmar" : "guardias de hoy sin firmar", "guardias", "mi_guardia", "firmar");
      const porCubrir = Object.entries(coberturas).filter(([k, p]) => p === yo && k.startsWith(`${hoy}|`) && !horaEmpezada(hoy, k.split("|")[1])).length;
      add(porCubrir, porCubrir === 1 ? "clase que cubres hoy" : "clases que cubres hoy", "guardias", "mis_coberturas", "profe-ausente");
      const misLlaves = prestamosLlaves.filter(p => p.profesor === yo && llaveSinDevolver(p)).length;
      add(misLlaves, misLlaves === 1 ? "llave sin devolver" : "llaves sin devolver", "espacios", "llaves", "llave");
      const respMat = avisosMaterial.filter(a => a.profesor === yo && a.respuesta && !a.respuestaVista).length;
      add(respMat, respMat === 1 ? "respuesta nueva a tus avisos de material" : "respuestas nuevas a tus avisos de material", "material", "material_avisos", "mensaje-recibido");
      const tempranas = alertasTempranas({ partes, horarios, tutores, usuario: yo }).filter(a => !alertasTempVistas[a.id]).length;
      add(tempranas, tempranas === 1 ? "alerta temprana en tu tutoría" : "alertas tempranas en tu tutoría", "alumnos", "resumen_tutoria", "alertas");
      const porRevisar = compromisos.filter(c => c.estado === "en_proceso" && c.revisar && c.revisar <= hoy && verCompromiso(c, yo, tutores, false)).length;
      add(porRevisar, porRevisar === 1 ? "compromiso por revisar" : "compromisos por revisar", "alumnos", "compromisos", "tareas");
      const misReservas = reservasEspacios.filter(r => r.profesor === yo && r.fecha === hoy && !horaTerminada(hoy, r.hora)).length;
      add(misReservas, misReservas === 1 ? "espacio reservado para hoy" : "espacios reservados para hoy", "espacios", "reservas", "horario");
    } else if (perfil.id === "jefatura") {
      add(sinLeerMios, sinLeerMios === 1 ? "mensaje sin leer en Rumbogram" : "mensajes sin leer en Rumbogram", "rumbochat", "mensajeria", "mensaje-sin-leer");
      add(alertasNoLeidas, alertasNoLeidas === 1 ? "alerta de convivencia sin leer" : "alertas de convivencia sin leer", "alumnos", "alertas", "alertas");
      add(medidasHoy, medidasHoy === 1 ? "medida correctora por programar o para hoy" : "medidas correctoras por programar o para hoy", "alumnos", "medidas", "tipificacion");
      const ausSinLeer = ausencias.filter(a => !a.leida && isoLocal(a.fecha) >= hoy).length;
      add(ausSinLeer, ausSinLeer === 1 ? "ausencia de profesorado sin revisar" : "ausencias de profesorado sin revisar", "guardias", "ausencias_jef", "profe-ausente");
      const sinCubrir = ausencias.filter(a => isoLocal(a.fecha) === hoy).reduce((n, a) => n + a.horas.filter(h => h !== "Recreo" && !horaTerminada(hoy, h) && !coberturas[claveCob(hoy, h, a.id)]).length, 0);
      add(sinCubrir, sinCubrir === 1 ? "clase de hoy sin cubrir" : "clases de hoy sin cubrir", "guardias", "coordinacion", "hora-reloj");
      const llavesFuera = prestamosLlaves.filter(p => llaveSinDevolver(p)).length;
      add(llavesFuera, llavesFuera === 1 ? "llave sin devolver" : "llaves sin devolver", "espacios", "llaves", "llave");
    } else if (perfil.id === "admin") {
      add(sinLeerMios, sinLeerMios === 1 ? "mensaje sin leer en Rumbogram" : "mensajes sin leer en Rumbogram", "rumbochat", "mensajeria", "mensaje-sin-leer");
      if (fx.tic) {
        const incMat = incidenciasMaterial.filter(x => x.estado === "abierta").length;
        add(incMat, incMat === 1 ? "incidencia de puesto sin resolver" : "incidencias de puestos sin resolver", "material", "material_incidencias", "ordenador");
      }
      const avPend = avisosMaterial.filter(a => a.estado === "pendiente" && gestionaAviso(a)).length;
      add(avPend, avPend === 1 ? "aviso de material pendiente" : "avisos de material pendientes", "material", "material_avisos", "mensaje-enviar");
    } else if (perfil.id === "conserjeria") {
      const llavesFuera = prestamosLlaves.filter(p => llaveSinDevolver(p)).length;
      add(llavesFuera, llavesFuera === 1 ? "llave sin devolver" : "llaves sin devolver", "espacios", "llaves", "llave");
    }
    return lista;
  })();
  // Asistencia: el tutor/a ve su grupo; Jefatura y Orientación, todo el centro
  if (perfil.id === "profesor" || (perfil.id === "jefatura" && fx.convivencia)) {
    const grupos = perfil.id === "profesor" ? misTutoriasProf : null;
    const enProtocolo = alumnos.filter(a => (!grupos || grupos.includes(a.curso)) && situacionAsistencia({ alumno: a, asistencia: asistenciaAl, justificantes: justificantesAl, limites: limitesAsis }).absentismo === "supera").length;
    if (enProtocolo) advertencias.push({ id: "asistencia-protocolo", n: enProtocolo, txt: enProtocolo === 1 ? "alumno/a en situación de absentismo" : "alumnos/as en situación de absentismo", modulo: perfil.id === "profesor" ? "asistencia" : "alumnos", tab: perfil.id === "profesor" ? "asistencia_tutoria" : "asistencia_jef", icono: "pasar-lista" });
  }
  // Cambios en las reservas de espacios desde la última visita de cada persona (salen a todo el claustro)
  if (perfil.id !== "admin") {
    const nNov = novedadesEspacios.filter(n => n.ts > (vistasNovedades[usuario] || "") && n.por !== usuario && n.por !== (fProfesor || usuario)).length;
    if (nNov) advertencias.push({ id: "espacios-novedades", n: nNov, txt: nNov === 1 ? "cambio en las reservas de espacios" : "cambios en las reservas de espacios", modulo: "espacios", tab: "reservas", icono: "horario" });
  }
  const globoModulo = id => advertencias.filter(a => a.modulo === id).reduce((n, a) => n + a.n, 0);
  const globoTab = id => advertencias.filter(a => a.modulo === moduloActivo && a.tab === id).reduce((n, a) => n + a.n, 0);
  const irAdvertencia = a => {
    if (a.modulo === "rumbochat") { abrirMensajes(); return; }
    if (perfil.id === "conserjeria") { setTab(a.tab); return; }
    if (perfil.id === "profesor") setModuloProfesor(a.modulo); else setModuloJefatura(a.modulo);
    setTab(a.tab);
  };

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
        .gd-globo { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px; margin-left: 8px; border-radius: 11px; background: ${R.noche}; color: #fff; font-size: 13px; font-weight: 800; line-height: 1; flex: none; font-family: ${FUENTE}; }
        .gd-globo.flota { position: absolute; top: -2px; right: -4px; margin: 0; border: 2px solid #fff; height: 24px; min-width: 24px; border-radius: 12px; }
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
          .gd-modulos.cuatro { grid-auto-flow: row; grid-template-columns: 1fr 1fr; }
          .gd-modulos.cuatro .gd-modulo { min-height: 46px; border-bottom: 1px solid rgba(255,255,255,.7); }
          .gd-modulos.cuatro .gd-modulo:last-child:nth-child(odd) { grid-column: 1 / -1; }
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
          <PanelAdvertencias lista={advertencias} onIr={irAdvertencia} />
          <button className="gd-redondo" aria-label="Inicio" title="Inicio" onClick={() => {
            setTab(inicioDe(perfil).tab);
            if (perfil.id === "profesor") setModuloProfesor("alumnos");
            else setModuloJefatura(inicioDe(perfil).modulo);
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
        <div className={"gd-modulos" + (modulos.length >= 4 ? " cuatro" : "")}>
          {modulos.map((m, i) => (
            <button key={m.id} className={"gd-modulo" + (moduloActivo === m.id ? " activo" : "")} style={{ order: 2 * i }} aria-description={avisosTxt(globoModulo(m.id))}
              onClick={m.ir}>
              {sinEmoji1(m.label)}<Globito n={globoModulo(m.id)} />
            </button>
          ))}
        </div>
      )}

      {tabs.length > 0 && (
        <div className="gd-tabs" style={{ order: 2 * Math.max(0, modulos.findIndex(m => m.id === moduloActivo)) + 1 }}>
          {tabs.map(t => (
            <button key={t.id} className={"gd-tab" + (tab === t.id ? " activo" : "")} onClick={() => setTab(t.id)} aria-description={avisosTxt(globoTab(t.id))}>
              {sinEmoji1(t.label)}<Globito n={globoTab(t.id)} />
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
                        <PositivasAlumno lista={positivas.filter(x => x.alumnoId === alumnoSel.id)} C={C} />
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
        {tab === "positivas" && (
          <ConductasPositivas alumnos={alumnos} positivas={positivas} setPositivas={setPositivas} usuario={fProfesor || usuario} tutores={tutores} setMensajes={setMensajes} C={C} inpStyle={inpStyle} labelStyle={labelStyle} />
        )}
        {tab === "parte_expres" && perfil.id === "profesor" && (
          <ParteExpres alumnos={alumnos} usuario={fProfesor || usuario} tutores={tutores} horarios={horarios} medidas={medidas} setMedidas={setMedidas} C={C} inpStyle={inpStyle} labelStyle={labelStyle}
            onCrear={p => { generarAlertasParte(p, partes); setPartes(prev => [p, ...prev]); }} />
        )}
        {tab === "notas_aula" && perfil.id === "profesor" && (
          <NotasAula alumnos={alumnos} notas={notasAula} setNotas={setNotasAula} usuario={fProfesor || usuario} tutores={tutores} horarios={horarios} C={C} inpStyle={inpStyle} labelStyle={labelStyle} />
        )}
        {tab === "compromisos" && (perfil.id === "profesor" || fx.convivencia) && (
          <MediacionCompromisos alumnos={alumnos} compromisos={compromisos} setCompromisos={setCompromisos} usuario={perfil.id === "profesor" ? fProfesor || usuario : usuario} tutores={tutores} convivencia={perfil.id === "jefatura" && fx.convivencia} setMensajes={setMensajes} C={C} inpStyle={inpStyle} labelStyle={labelStyle} />
        )}
        {tab === "resumen_tutoria" && perfil.id === "profesor" && (
          <ResumenTutoria alumnos={alumnos} partes={partes} positivas={positivas} medidas={medidas} notas={notasAula} compromisos={compromisos} usuario={fProfesor || usuario} tutores={tutores} horarios={horarios} alertasVistas={alertasTempVistas} setAlertasVistas={setAlertasTempVistas} C={C} selStyle={selStyle} labelStyle={labelStyle} />
        )}
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
          <AhoraGuardias profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia} ausencias={ausencias} coberturas={coberturas} setCoberturas={setCoberturas} propias={coberturasPropias} setPropias={setCoberturasPropias} puedeAsignar={perfil.id === "jefatura"} usuario={perfil.id === "profesor" ? (fProfesor || usuario) : ""} C={C} />
        )}

        {/* ── Mis coberturas (profesor) ── */}
        {tab === "mis_coberturas" && (
          <MisCoberturas usuario={fProfesor || usuario} coberturas={coberturas} propias={coberturasPropias} ausencias={ausencias} C={C} />
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
                    <PositivasAlumno lista={positivas.filter(x => x.alumnoId === al.id)} C={C} />
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
          <MiGuardiaHoy setAsistencia={setAsistenciaAl} setMensajes={setMensajes} cuentas={cuentas} medidas={medidas} onMarcarMedida={marcarMedida} coberturas={coberturas} setCoberturas={setCoberturas} propias={coberturasPropias} setPropias={setCoberturasPropias} firmas={firmas} setFirmas={setFirmas} listas={listas} setListas={setListas} alumnos={alumnos} profesores={profesores} cuadrante={cuadrante} apoyosGuardia={apoyosGuardia} sustitutosGuardia={sustitutosGuardia} ausencias={ausencias} fProfesor={fProfesor} setFProfesor={setFProfesor} C={C} selStyle={selStyle} labelStyle={labelStyle} usuario={usuario} setShowCuadrante={setShowCuadrante} diaSeleccionadoGuardias={diaSeleccionadoGuardias} setDiaSeleccionadoGuardias={setDiaSeleccionadoGuardias} />
        )}

        {/* ── Notificar Ausencia (Profesor) ── */}
        {tab === "notif_ausencia" && (
          <NotificarAusencia
            usuario={usuario}
            profesores={profesores} ausencias={ausencias} setAusencias={setAusencias}
            horarios={horarios} coberturas={coberturas} setCoberturas={setCoberturas} setMensajes={setMensajes} cuentas={cuentas}
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
            coberturasPropias={coberturasPropias}
            setCoberturasPropias={setCoberturasPropias}
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
        {tab === "pasar_lista" && (
          <PasarListaClase alumnos={alumnos} horarios={horarios} asistencia={asistenciaAl} setAsistencia={setAsistenciaAl} justificantes={justificantesAl} usuario={fProfesor || usuario} cursos={cursos} />
        )}
        {tab === "justificantes" && (
          <JustificantesAlumnado alumnos={alumnos} justificantes={justificantesAl} setJustificantes={setJustificantesAl} usuario={perfil.id === "profesor" ? (fProfesor || usuario) : usuario} tutores={tutores} setMensajes={setMensajes} cursos={cursos} />
        )}
        {tab === "asistencia_tutoria" && (
          <ResumenAsistencia alumnos={alumnos} asistencia={asistenciaAl} justificantes={justificantesAl} limites={limitesAsis} grupos={misTutoriasProf} />
        )}
        {tab === "asistencia_jef" && (
          <ResumenAsistencia alumnos={alumnos} asistencia={asistenciaAl} justificantes={justificantesAl} limites={limitesAsis} setLimites={setLimitesAsis} puedeConfigurar={fx.convivencia && perfil.cargo !== "orientacion"} />
        )}

        {tab === "material_sesion" && (
          <MaterialSesion aulas={aulasMaterial} sesiones={sesionesMaterial} setSesiones={setSesionesMaterial} incidencias={incidenciasMaterial} setIncidencias={setIncidenciasMaterial}
            alumnos={alumnos} cursos={cursos} profesores={profesores} usuario={perfil.id === "profesor" ? (fProfesor || usuario) : usuario} gestion={perfil.id !== "profesor"}
            cuentas={cuentas} setMensajes={setMensajes} />
        )}
        {tab === "material_avisos" && (
          <NecesidadesMaterial avisos={avisosMaterial} setAvisos={setAvisosMaterial} espacios={espaciosCentro} cursos={cursos}
            usuario={perfil.id === "profesor" ? (fProfesor || usuario) : usuario} gestiona={perfil.id === "admin" ? gestionaAviso : null} conCoste={perfil.id === "admin" && fx.secretaria} cuentas={cuentas} profesores={profesores} setMensajes={setMensajes} />
        )}
        {tab === "material_historial" && <MaterialHistorial aulas={aulasMaterial} sesiones={sesionesMaterial} incidencias={incidenciasMaterial} alumnos={alumnos} />}
        {tab === "material_incidencias" && <MaterialIncidencias incidencias={incidenciasMaterial} setIncidencias={setIncidenciasMaterial} usuario={usuario} puedeResolver={perfil.id === "admin" && fx.tic} />}

        {tab === "reservas" && (
          <Reservas espacios={espaciosCentro} reservas={reservasEspacios} setReservas={setReservasEspacios} profesores={profesores} cursos={cursos}
            usuario={perfil.id === "profesor" ? (fProfesor || usuario) : usuario} gestion={perfil.id !== "profesor"}
            novedades={novedadesEspacios} onNovedad={n => setNovedadesEspacios(prev => [n, ...prev].slice(0, 200))}
            vistoHasta={vistasNovedades[usuario] || ""} onVisto={() => setVistasNovedades(prev => ({ ...prev, [usuario]: new Date().toISOString() }))} />
        )}

        {tab === "llaves" && (
          <Llaves espacios={espaciosCentro} prestamos={prestamosLlaves} setPrestamos={setPrestamosLlaves} reservas={reservasEspacios} profesores={profesores}
            usuario={perfil.id === "profesor" ? (fProfesor || usuario) : usuario} gestion={perfil.id !== "profesor"} />
        )}

        {tab === "resumen_cob" && (
          <ResumenGuardias profesores={profesores} ausencias={ausencias} coberturas={coberturas} propias={coberturasPropias} C={C} />
        )}

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
                horarios={horarios} coberturas={coberturas} setCoberturas={setCoberturas} setMensajes={setMensajes}
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
            <GestionAusencias ausencias={ausencias} setAusencias={setAusencias} profesores={profesores} usuario={usuario} C={C} fmt={fmt} />
          </div>
        )}

        {/* ── Rumbogram (Jefatura & Profesor) ── */}
        {tab === "mensajeria" && (
          <Rumbogram 
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
        {/* Secretaría: datos del centro y espacios */}
        {tab === "admin_panel" && fx.secretaria && (
          <div data-accesos-secretaria style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[["Alumnos", "admin_alumnos", "alumnos", "grupos", "Dar de alta al alumnado (importar de Raíces o uno a uno) y asignar las tutorías"],
              ["Profesores", "admin_profesores", "guardias", "anadir-profesor", "Dar de alta al profesorado, sus cargos y claves, y las cuentas de Conserjería"]].map(([t, , mod, ic, txt]) => (
              <button key={t} className="gd-pulsable" onClick={() => irAdmin(mod)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", minHeight: 72, padding: "12px 14px", background: R.azulClaro, border: `2px solid ${R.azul}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", color: R.noche }}>
                <Icono nombre={ic} tam={44} />
                <span><strong style={{ fontSize: 17, display: "block" }}>{t} ›</strong><span style={{ fontSize: 14, color: R.petroleo }}>{txt}</span></span>
              </button>
            ))}
          </div>
        )}
        {tab === "admin_panel" && fx.secretaria && <DatosCentro datos={datosCentro} setDatos={setDatosCentro} />}
        {tab === "espacios_centro" && fx.guardias && <EspaciosCentro espacios={espaciosCentro} setEspacios={setEspaciosCentro} />}
        {tab === "horarios_aulas" && fx.guardias && <HorariosAulas horarios={horarios} setHorarios={setHorarios} profesores={profesores} cursos={cursos} espacios={espaciosCentro} />}
        {/* Secretaría: alumnado y tutorías */}
        {tab === "admin_alumnos" && fx.secretaria && (
          <TutoriasGrupos cursos={cursos} tutores={tutores} setTutores={setTutores} setAlumnos={setAlumnos} profesores={profesores} C={C} inpStyle={inpStyle} />
        )}
        {tab === "admin_alumnos" && fx.secretaria && (
          <AdminAlumnos alumnos={alumnos} setAlumnos={setAlumnos} inpStyle={inpStyle} C={C} />
        )}
        {/* Coordinación TIC: aulas con puestos */}
        {tab === "admin_aulas" && fx.tic && <AulasMaterialCentro aulas={aulasMaterial} setAulas={setAulasMaterial} espacios={espaciosCentro} />}
        {/* Jefatura de Estudios: horario de las clases y zonas de guardia */}
        {tab === "horario_zonas" && fx.guardias && <HorarioCentro horario={horarioCentro} setHorario={setHorarioCentro} />}
        {tab === "horario_zonas" && fx.guardias && <ZonasCentro zonas={zonasCentro} setZonas={setZonasCentro} />}

        {/* ── Admin Profesores ── */}
        {tab === "admin_profesores" && fx.secretaria && (
          <div>
            <div style={{ marginBottom: 16 }}><TituloBloque titulo="Gestión de Profesores" icono="perfil" /></div>
            <AvisoSoloFicticios que="del profesorado (nombres, correos)" />
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
                Todo el personal docente es <b>Profesor/a</b> (pone partes, hace sus guardias…) y los demás cargos se suman a eso. Marca todos los cargos de cada persona: puede tener varios (por ejemplo, Profesor/a + Jefatura de departamento + Coordinación TIC). Quien tiene varios cargos cambia de perfil desde el botón de arriba a la derecha.
                <details data-cargos-funciones style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, color: R.petroleo }}>Qué puede hacer cada cargo</summary>
                  <div style={{ display: "grid", gap: 1, background: R.turquesaClaro, marginTop: 8 }}>
                    {CARGOS.map(c => (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) 1fr", gap: 10, background: "#fff", padding: "8px 10px", color: R.noche }}>
                        <strong style={{ display: "flex", gap: 6, alignItems: "flex-start" }}><Icono nombre={ICONO_CARGO[c.id] || "cargo-profesor"} tam={22} />{c.label}</strong>
                        <span>{c.funciones}</span>
                      </div>
                    ))}
                  </div>
                </details>
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
                        {CARGOS.filter(c => c.id !== "conserjeria").map(c => {
                          const ids = cargosIds(cuenta); const on = ids.includes(c.id); const fijo = c.id === "profesor";
                          return (
                            <button key={c.id} disabled={fijo} aria-pressed={on} title={fijo ? "Todo el personal docente es profesor/a" : on ? "Quitar este cargo" : "Añadir este cargo"}
                              onClick={() => {
                                const nuevos = on ? ids.filter(x => x !== c.id) : [...ids, c.id];
                                if (p === usuario && !nuevos.some(id => CARGOS.find(x => x.id === id).perfiles.includes("admin")) &&
                                    !window.confirm("Vas a quitarte el acceso a Secretaría. ¿Continuar?")) return;
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
            <PersonalConserjeria cuentas={cuentas} setCuentas={setCuentas} profesores={profesores} C={C} inpStyle={inpStyle} />
          </div>
        )}

        <footer className="no-print" style={{ marginTop: 32, borderTop: `1px solid ${R.turquesaClaro}` }}><PieAutoria /></footer>
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
                coberturasPropias={coberturasPropias}
                setCoberturasPropias={setCoberturasPropias}
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
