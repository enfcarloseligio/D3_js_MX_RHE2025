// scripts/utils/config-mapa.js
// ==============================
// CONFIGURACIÓN GLOBAL PARA MAPAS
// ==============================
export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 720;
export const MAP_BACKGROUND = "#e6f0f8";

// Colores globales de control (un solo origen de verdad)
export const COLOR_CERO = '#bfbfbf';   // tasa = 0.00 (solo para métricas de tasa)
export const COLOR_SIN  = '#d9d9d9';   // sin dato (s/d)

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
let __legendCounter = 0;
export function crearLeyenda(host, {
  dominio,
  pasos,
  colores,
  posicion = { x: 30, y: 50, ancho: 20, alto: 200 },
  id = null,
  titulo = null,
  chips = null,
  equalSpacing = false
}) {
  const { x, y, ancho, alto } = posicion;
  const sel = host && typeof host.select === "function" ? host : d3.select(host);

  // Limpia solo leyendas previas
  sel.selectAll(".leyenda-gradiente").remove();

  const root = sel.append("g").attr("class", "leyenda-gradiente");

  // Gradiente (paradas SIEMPRE equiespaciadas visualmente)
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

  // Barra del gradiente
  root.append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", ancho)
    .attr("height", alto)
    .style("fill", `url(#${gradId})`);

  // --- Eje: proporcional vs equiespaciado ---
  const esPoblacionPorTitulo = titulo && /poblaci/i.test(String(titulo));
  const fmtTick = esPoblacionPorTitulo ? d3.format(",.0f") : d3.format(".2f");

  let eje;
  if (!equalSpacing) {
    const escala = d3.scaleLinear()
      .domain([dominio[0], dominio[1]])
      .range([y + alto, y]);

    eje = d3.axisRight(escala)
      .tickValues(pasos)
      .tickFormat(fmtTick);

    root.append("g")
      .attr("transform", `translate(${x + ancho}, 0)`)
      .call(eje);
  } else {
    const n = pasos.length;
    const escalaIdx = d3.scaleLinear()
      .domain([0, n - 1])
      .range([y + alto, y]);

    eje = d3.axisRight(escalaIdx)
      .tickValues(d3.range(n))
      .tickFormat(i => fmtTick(pasos[i]));

    root.append("g")
      .attr("transform", `translate(${x + ancho}, 0)`)
      .call(eje);
  }

  // Título
  if (titulo) {
    if (esPoblacionPorTitulo) {
      root.append("text")
        .attr("x", x + ancho / 2)
        .attr("y", y - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-family", "'Noto Sans', sans-serif")
        .text("Población");
    } else {
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
export function construirTitulo(metricKey, { entidad = null, year = 2025 } = {}) {
  const lugar = entidad ? `en ${entidad}` : "en México";
  const sufijo = `(${year})`;

  const map = {
    "tasa_total":          `Tasa de enfermeras por cada mil habitantes ${lugar} ${sufijo}`,
    "tasa_primer":         `Tasa de enfermeras por cada mil habitantes en 1er nivel de atención ${lugar} ${sufijo}`,
    "tasa_segundo":        `Tasa de enfermeras por cada mil habitantes en 2º nivel de atención ${lugar} ${sufijo}`,
    "tasa_tercer":         `Tasa de enfermeras por cada mil habitantes en 3er nivel de atención ${lugar} ${sufijo}`,
    "tasa_apoyo":          `Tasa de enfermeras por cada mil habitantes en establecimientos de apoyo ${lugar} ${sufijo}`,
    "tasa_escuelas":       `Tasa de enfermeras por cada mil habitantes en escuelas ${lugar} ${sufijo}`,
    "tasa_administrativas": `Tasa de enfermeras por cada mil habitantes en áreas administrativas ${lugar} ${sufijo}`,
    "tasa_no_aplica":      `Registros “No aplica” de enfermería ${lugar} ${sufijo}`,
    "tasa_no_asignado":    `Registros “No asignado” de enfermería ${lugar} ${sufijo}`,
    "poblacion":           `Población ${lugar} ${sufijo}`,
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

  const extraTop = 50;
  const citaFontSize = 13;
  const citaLineHeight = 18;

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
  tituloNode.textContent = titulo || `Tasa de enfermeras por cada mil habitantes (2025)`;
  svgElement.appendChild(tituloNode);

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
    nombreTipo = "clínicas",
    entidad = null,
    year = new Date().getFullYear(),
  } = {}
) {
  const lugar = entidad ? `en ${entidad}` : "en México";
  const sufijo = `(${year})`;

  const baseTasa = `Distribución de ${nombreTipo} y tasa de enfermeras por cada mil habitantes`;
  const map = {
    "tasa_total":          `${baseTasa} ${lugar} ${sufijo}`,
    "tasa_primer":         `${baseTasa} en 1er nivel de atención ${lugar} ${sufijo}`,
    "tasa_segundo":        `${baseTasa} en 2º nivel de atención ${lugar} ${sufijo}`,
    "tasa_tercer":         `${baseTasa} en 3er nivel de atención ${lugar} ${sufijo}`,
    "tasa_apoyo":          `${baseTasa} en establecimientos de apoyo ${lugar} ${sufijo}`,
    "tasa_escuelas":       `${baseTasa} en escuelas ${lugar} ${sufijo}`,
    "tasa_administrativas": `${baseTasa} en áreas administrativas ${lugar} ${sufijo}`,
    "tasa_no_aplica":      `Distribución de ${nombreTipo} y registros “No aplica” de enfermería ${lugar} ${sufijo}`,
    "tasa_no_asignado":    `Distribución de ${nombreTipo} y registros “No asignado” de enfermería ${lugar} ${sufijo}`,
    "poblacion":           `Distribución de ${nombreTipo} y población ${lugar} ${sufijo}`,
  };

  return map[metricKey] || `Distribución de ${nombreTipo} y enfermería ${lugar} ${sufijo}`;
}

// ===============================================
// UTILIDADES GLOBALES PARA ESCALAS Y LEYENDAS
// ===============================================
export function valuesForMetric(
  rows,
  METRICAS,
  metricKey,
  { excludeIds = ["8888", "9999"], idKey = "id", extraFilter = null } = {}
) {
  const key = METRICAS[metricKey].tasaKey;
  const esPoblacion = (metricKey === "poblacion");

  const excl = new Set(excludeIds.map(String));

  const arr = rows
    .filter(r => !excl.has(String(r?.[idKey])))
    .filter(r => (typeof extraFilter === "function" ? extraFilter(r) : true))
    .map(r => +r[key])
    .filter(Number.isFinite);

  return esPoblacion ? arr : arr.filter(v => v > 0);
}

export function computeQuartiles(vals) {
  const v = vals.slice().filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { min: 0, q1: 1, q2: 2, q3: 3, max: 4 };

  let min = v[0], max = v[v.length - 1];
  let q1  = d3.quantileSorted(v, 0.25);
  let q2  = d3.quantileSorted(v, 0.50);
  let q3  = d3.quantileSorted(v, 0.75);

  const eps = 1e-6;
  if (!(q1 > min)) q1 = min + eps;
  if (!(q2 > q1)) q2 = q1 + eps;
  if (!(q3 > q2)) q3 = q2 + eps;
  if (!(max > q3)) max = q3 + eps;

  return { min, q1, q2, q3, max };
}

export function buildColorScale(stats, palette) {
  const { min, q1, q2, q3, max } = stats;
  return d3.scaleLinear()
    .domain([min, q1, q2, q3, max])
    .range(palette)
    .interpolate(d3.interpolateRgb);
}

export function legendSteps(stats, { isPopulation = false } = {}) {
  const { min, q1, q2, q3, max } = stats;
  const raw = [min, q1, q2, q3, max];
  const seen = new Set();
  const pasos = [];
  for (const v of raw) {
    const k = isPopulation ? Math.round(v) : +v.toFixed(2);
    if (!seen.has(k)) { seen.add(k); pasos.push(k); }
  }
  return pasos;
}

/**
 * Helper completo: valores -> dominio (fijo o dinámico) -> escala y leyenda.
 */
export function prepararEscalaYLeyenda(
  rows,
  METRICAS,
  metricKey,
  {
    palette,
    titulo,
    excludeIds = ["8888", "9999"],
    idKey = "id",
    extraFilter = null,
    fixedDomain = null,     // [min, q1, q2, q3, max]
    clamp = true,
    capAtPercentile = null
  } = {}
) {
  const esPoblacion = (metricKey === "poblacion");

  // 1) Valores válidos
  const vals = valuesForMetric(rows, METRICAS, metricKey, { excludeIds, idKey, extraFilter });

  // 2) Dominio para la escala (fijo o dinámico)
  let domainValues;
  if (Array.isArray(fixedDomain) && fixedDomain.length === 5) {
    domainValues = fixedDomain.slice().sort((a, b) => a - b);
  } else {
    const stats = computeQuartiles(vals);
    let { min, q1, q2, q3, max } = stats;

    if (typeof capAtPercentile === "number" && capAtPercentile > 0 && capAtPercentile < 1) {
      const sorted = vals.slice().sort((a, b) => a - b);
      const pMax = d3.quantileSorted(sorted, capAtPercentile);
      if (Number.isFinite(pMax) && pMax < max) max = pMax;
    }
    domainValues = [min, q1, q2, q3, max];
  }

  // 3) Escala para pintar el mapa (proporcional al valor real)
  const scale = d3.scaleLinear()
    .domain(domainValues)
    .range(palette)
    .interpolate(d3.interpolateRgb)
    .clamp(!!clamp);

  // 4) Pasos de la leyenda (texto)
  const pasos = legendSteps(
    { min: domainValues[0], q1: domainValues[1], q2: domainValues[2], q3: domainValues[3], max: domainValues[4] },
    { isPopulation: esPoblacion }
  );

  const legendCfg = {
    dominio: [domainValues[0], domainValues[4]],
    pasos,
    colores: palette,
    titulo,
    equalSpacing: true,   // leyenda equiespaciada
    chips: esPoblacion ? null : [
      { color: COLOR_CERO, texto: '0.00' },
      { color: COLOR_SIN,  texto: 's/d'  }
    ]
  };

  return {
    stats: { min: domainValues[0], q1: domainValues[1], q2: domainValues[2], q3: domainValues[3], max: domainValues[4] },
    scale,
    legendCfg
  };
}
