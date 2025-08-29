// ==============================
// CONFIGURACIÓN GLOBAL PARA MAPAS
// ==============================
export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 720;
export const MAP_BACKGROUND = "#e6f0f8";

// ==============================
// CREAR SVG BASE
// ==============================
/** Crea un SVG base con un <g> contenedor. */
export function crearSVGBase(selector, ariaLabel = "Mapa interactivo de distribución por entidad federativa") {
  const svg = d3.select(selector)
    .append("svg")
    .attr("width", MAP_WIDTH)
    .attr("height", MAP_HEIGHT)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", ariaLabel)
    .style("background-color", MAP_BACKGROUND);

  const g = svg.append("g");
  return { svg, g };
}

// ==============================
// LEYENDA GRADIENTE
// ==============================
/**
 * Dibuja una leyenda vertical con gradiente + eje + título y chips opcionales.
 * host: svg o <g> (o selector)
 * dominio: [min, max]
 * pasos: array con cortes (min, q1, q2, q3, max)
 * colores: array de colores (mismo largo que pasos)
 * titulo: texto. Si contiene “población”, se muestra 1 línea "Población".
 *         En otro caso, se muestra en 2 líneas: "Tasa" y debajo la categoría.
 * chips: [{color, texto}] (opcional). Para población normalmente null.
 */
let __legendCounter = 0;
export function crearLeyenda(host, {
  dominio,
  pasos,
  colores,
  posicion = { x: 30, y: 50, ancho: 20, alto: 200 },
  id = null,
  titulo = null,
  chips = null
}) {
  const { x, y, ancho, alto } = posicion;
  const sel = host && typeof host.select === "function" ? host : d3.select(host);

  // Limpia solo leyendas previas
  sel.selectAll(".leyenda-gradiente").remove();

  const root = sel.append("g").attr("class", "leyenda-gradiente");

  // Gradiente
  const gradId = id || `legend-gradient-${++__legendCounter}`;
  const defs = root.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

  linearGradient.selectAll("stop")
    .data(pasos.map((_, i) => ({
      offset: `${(i / (pasos.length - 1)) * 100}%`,
      color: colores[i]
    })))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  // Barra
  root.append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", ancho)
    .attr("height", alto)
    .style("fill", `url(#${gradId})`);

  // Escala y eje
  const escala = d3.scaleLinear()
    .domain([dominio[0], dominio[1]])
    .range([y + alto, y]);

  // Formato de ticks: población -> miles sin decimales; tasas -> 2 decimales
  const esPoblacion = titulo && /poblaci/i.test(String(titulo));
  const fmtTick = esPoblacion ? d3.format(",.0f") : d3.format(".2f");

  const eje = d3.axisRight(escala)
    .tickValues(pasos)
    .tickFormat(fmtTick);

  root.append("g")
    .attr("transform", `translate(${x + ancho}, 0)`)
    .call(eje);

  // Título
  if (titulo) {
    if (esPoblacion) {
      // Una sola línea: "Población"
      root.append("text")
        .attr("x", x + ancho / 2)
        .attr("y", y - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-family", "'Noto Sans', sans-serif")
        .text("Población");
    } else {
      // Dos líneas: "Tasa" + categoría
      const cat = String(titulo).replace(/^\s*tasa\s*/i, "").trim() || "total";
      const t = root.append("text")
        .attr("x", x + ancho / 2)
        .attr("y", y - 22)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-family", "'Noto Sans', sans-serif");

      t.append("tspan")
        .attr("x", x + ancho / 2)
        .attr("dy", 0)
        .style("font-weight", "bold")
        .text("Tasa");

      t.append("tspan")
        .attr("x", x + ancho / 2)
        .attr("dy", 14)
        .text(cat);
    }
  }

  // Chips (0.00, s/d)
  if (Array.isArray(chips) && chips.length) {
    const chipGrp = root.append("g").attr("transform", `translate(${x + ancho + 40}, ${y})`);
    chips.forEach((c, i) => {
      const gy = chipGrp.append("g").attr("transform", `translate(0, ${i * 18})`);
      gy.append("rect").attr("width", 12).attr("height", 12).attr("fill", c.color || "#ccc");
      gy.append("text")
        .attr("x", 16).attr("y", 10)
        .attr("font-size", "12px")
        .attr("font-family", "'Noto Sans', sans-serif")
        .text(c.texto || "");
    });
  }

  return root;
}

// ==============================
// ETIQUETA DE MUNICIPIO/ENTIDAD
// ==============================
export function crearEtiquetaMunicipio(grupo, nombre, x, y, opciones = {}) {
  const {
    fontSize = "10px",
    fill = "#000",
    fontFamily = "'Noto Sans', sans-serif",
    className = ""
  } = opciones;

  grupo.append("text")
    .attr("x", x)
    .attr("y", y)
    .text(nombre)
    .attr("font-size", fontSize)
    .attr("fill", fill)
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")
    .attr("class", className)
    .style("font-family", fontFamily);
}

// ==============================
// CONTROLES DE ZOOM + HOME
// ==============================
export function inyectarControlesBasicos(svg, g, urlCasa = "../entidades/republica-mexicana.html") {
  let contenedor = document.querySelector(".zoom-controles");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.className = "zoom-controles";
    document.body.appendChild(contenedor);
  }

  const botones = [
    { id: "zoom-in",    label: "+",  title: "Acercar" },
    { id: "zoom-out",   label: "–",  title: "Alejar" },
    { id: "zoom-reset", label: "⟳",  title: "Restablecer" },
    { id: "zoom-home",  label: "🏠", title: "Volver al mapa nacional" }
  ];

  botones.forEach(({ id, label, title }) => {
    let btn = document.getElementById(id);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = id;
      btn.innerText = label;
      btn.className = "boton";
      btn.title = title;
      btn.setAttribute("aria-label", title);
      contenedor.appendChild(btn);
    }
  });

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

  document.getElementById("zoom-home")?.addEventListener("click", () => {
    window.location.href = urlCasa;
  });
}

// ==============================
// ZOOM CON BOTONES
// ==============================
export function activarZoomConBotones(svg, g, {
  selectorZoomIn = "#zoom-in",
  selectorZoomOut = "#zoom-out",
  selectorZoomReset = "#zoom-reset",
  escalaMin = 1,
  escalaMax = 8,
  paso = 0.5
} = {}) {
  let currentTransform = d3.zoomIdentity;

  const zoom = d3.zoom()
    .scaleExtent([escalaMin, escalaMax])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      currentTransform = event.transform;
    });

  svg.call(zoom);

  document.querySelector(selectorZoomIn)?.addEventListener("click", () => {
    svg.transition().call(zoom.scaleBy, 1 + paso);
  });

  document.querySelector(selectorZoomOut)?.addEventListener("click", () => {
    svg.transition().call(zoom.scaleBy, 1 - paso);
  });

  document.querySelector(selectorZoomReset)?.addEventListener("click", () => {
    svg.transition().call(zoom.transform, d3.zoomIdentity);
  });
}

// ==============================
// DESCARGAR SVG COMO PNG
// ==============================
// ============ NUEVO helper: título según métrica ============
export function construirTitulo(metricKey, { entidad = null, year = 2025 } = {}) {
  const lugar = entidad ? `en ${entidad}` : "en México";
  const sufijo = `(${year})`;

  const map = {
    // Tasas
    "tasa_total":       `Tasa de enfermeras por cada mil habitantes ${lugar} ${sufijo}`,
    "tasa_primer":      `Tasa de enfermeras por cada mil habitantes en 1er nivel de atención ${lugar} ${sufijo}`,
    "tasa_segundo":     `Tasa de enfermeras por cada mil habitantes en 2º nivel de atención ${lugar} ${sufijo}`,
    "tasa_tercer":      `Tasa de enfermeras por cada mil habitantes en 3er nivel de atención ${lugar} ${sufijo}`,
    "tasa_apoyo":       `Tasa de enfermeras por cada mil habitantes en establecimientos de apoyo ${lugar} ${sufijo}`,
    "tasa_escuelas":    `Tasa de enfermeras por cada mil habitantes en escuelas ${lugar} ${sufijo}`,
    "tasa_no_aplica":   `Registros “No aplica” de enfermería ${lugar} ${sufijo}`,
    "tasa_no_asignado": `Registros “No asignado” de enfermería ${lugar} ${sufijo}`,

    // Población (no dice “tasa”)
    "poblacion":        `Población ${lugar} ${sufijo}`,
  };

  return map[metricKey] || `Distribución de enfermería ${lugar} ${sufijo}`;
}

// ============ ACTUALIZA descargarComoPNG con wrap en 2 líneas ============
export function descargarComoPNG(
  svgSelector,
  nombreArchivo = "mapa.png",
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
  opts = {}
) {
  const { titulo, cita } = opts;

  const svgElement = document.querySelector(svgSelector);
  if (!svgElement) return;

  // --- Parámetros visuales ---
  const extraTop = 50;
  const citaFontSize = 13;
  const citaLineHeight = 18;

  // Helper: wrap en máximo 2 líneas
  function wrapDosLineas(str, maxChars = 130) {
    const words = String(str).split(/\s+/);
    const lines = [];
    let line = "";

    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (test.length > maxChars && lines.length < 1) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    if (lines.length > 2) {
      lines[1] = lines.slice(1).join(" ");
      return lines.slice(0, 2);
    }
    return lines;
  }

  // ---------- TÍTULO ----------
  svgElement.setAttribute("viewBox", `0 ${-extraTop} ${width} ${height + extraTop + 80}`);

  const fondoTitulo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fondoTitulo.setAttribute("x", -100);
  fondoTitulo.setAttribute("y", -extraTop);
  fondoTitulo.setAttribute("width", width + 200);
  fondoTitulo.setAttribute("height", extraTop);
  fondoTitulo.setAttribute("fill", "white");
  fondoTitulo.setAttribute("fill-opacity", "0.7");
  fondoTitulo.setAttribute("id", "fondo-titulo");
  svgElement.appendChild(fondoTitulo);

  const tituloNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
  tituloNode.setAttribute("x", width / 2);
  tituloNode.setAttribute("y", -extraTop + 30);
  tituloNode.setAttribute("text-anchor", "middle");
  tituloNode.setAttribute("font-size", "20px");
  tituloNode.setAttribute("font-family", "'Noto Sans', sans-serif");
  tituloNode.setAttribute("font-weight", "bold");
  tituloNode.setAttribute("fill", "#111");
  tituloNode.setAttribute("id", "titulo-descarga");
  tituloNode.textContent =
    titulo || `Tasa de enfermeras por cada mil habitantes (2025)`;
  svgElement.appendChild(tituloNode);

  // ---------- CITA ----------
  const fecha = new Date().toISOString().split("T")[0];
  const citaTexto =
    cita ||
    `Dirección de Enfermería & Dirección General de Calidad y Educación en Salud. (2025). ` +
    `Sistema de Información Administrativa de Recursos Humanos en Enfermería (SIARHE) [Sistema informático]. ` +
    `Secretaría de Salud. Consultado el ${fecha}`;

  const lineas = wrapDosLineas(citaTexto, 130);
  const extraBottom = lineas.length * citaLineHeight + 16;
  svgElement.setAttribute("viewBox", `0 ${-extraTop} ${width} ${height + extraTop + extraBottom}`);

  const fondoCita = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fondoCita.setAttribute("x", -100);
  fondoCita.setAttribute("y", height);
  fondoCita.setAttribute("width", width + 200);
  fondoCita.setAttribute("height", extraBottom);
  fondoCita.setAttribute("fill", "white");
  fondoCita.setAttribute("fill-opacity", "0.7");
  fondoCita.setAttribute("id", "fondo-cita");
  svgElement.appendChild(fondoCita);

  const citaNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
  citaNode.setAttribute("x", width / 2);
  citaNode.setAttribute("y", height + 12);
  citaNode.setAttribute("text-anchor", "middle");
  citaNode.setAttribute("font-size", citaFontSize + "px");
  citaNode.setAttribute("fill", "#333");
  citaNode.setAttribute("font-family", "'Noto Sans', sans-serif");
  citaNode.setAttribute("id", "marca-descarga");
  svgElement.appendChild(citaNode);

  lineas.forEach((ln, i) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.setAttribute("x", width / 2);
    tspan.setAttribute("dy", i === 0 ? "0" : String(citaLineHeight));
    tspan.textContent = ln;
    citaNode.appendChild(tspan);
  });

  // ---------- Serializar y descargar ----------
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = function () {
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = png;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  image.src = url;

  // Limpieza
  setTimeout(() => {
    svgElement.querySelector("#titulo-descarga")?.remove();
    svgElement.querySelector("#fondo-titulo")?.remove();
    svgElement.querySelector("#marca-descarga")?.remove();
    svgElement.querySelector("#fondo-cita")?.remove();
  }, 200);
}

// Título para mapas con clínicas (combina clínicas + métrica seleccionada)
export function construirTituloClinicas(
  metricKey,
  {
    nombreTipo = "clínicas",             // p. ej. "clínicas de catéter"
    entidad = null,                      // p. ej. "Tamaulipas"
    year = new Date().getFullYear(),     // 2025 por defecto actual
  } = {}
) {
  const lugar = entidad ? `en ${entidad}` : "en México";
  const sufijo = `(${year})`;

  const baseTasa = `Distribución de ${nombreTipo} y tasa de enfermeras por cada mil habitantes`;
  const map = {
    // Tasas
    "tasa_total":       `${baseTasa} ${lugar} ${sufijo}`,
    "tasa_primer":      `${baseTasa} en 1er nivel de atención ${lugar} ${sufijo}`,
    "tasa_segundo":     `${baseTasa} en 2º nivel de atención ${lugar} ${sufijo}`,
    "tasa_tercer":      `${baseTasa} en 3er nivel de atención ${lugar} ${sufijo}`,
    "tasa_apoyo":       `${baseTasa} en establecimientos de apoyo ${lugar} ${sufijo}`,
    "tasa_escuelas":    `${baseTasa} en escuelas ${lugar} ${sufijo}`,
    "tasa_no_aplica":   `Distribución de ${nombreTipo} y registros “No aplica” de enfermería ${lugar} ${sufijo}`,
    "tasa_no_asignado": `Distribución de ${nombreTipo} y registros “No asignado” de enfermería ${lugar} ${sufijo}`,

    // Población
    "poblacion":        `Distribución de ${nombreTipo} y población ${lugar} ${sufijo}`,
  };

  return map[metricKey] || `Distribución de ${nombreTipo} y enfermería ${lugar} ${sufijo}`;
}
