// scripts/maps/clinicas-cateteres.js

// ==============================
// IMPORTACIONES
// ==============================
import {
  crearTooltip,
  mostrarTooltip,
  ocultarTooltip
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG, crearEtiquetaMunicipio,
  construirTituloClinicas
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';
import { renderTablaNacional, attachExcelButton } from '../utils/tablas.js';
import { normalizarDataset } from '../utils/normalizacion.js';

import {
  pintarMarcadores,
  MARCADORES_TIPOS,
  crearLeyendaMarcadores   // ⟵ NUEVO IMPORT
} from '../utils/marcadores.js';

// ==============================
// HOST DEL MAPA (fallback si #mapa-clinicas no existe)
// ==============================
const HOST_SEL = document.querySelector("#mapa-clinicas") ? "#mapa-clinicas" : "#mapa-nacional";

// ==============================
// CREAR SVG + TOOLTIP + HOST LEYENDA
// ==============================
const { svg, g } = crearSVGBase(
  HOST_SEL,
  "Mapa nacional de tasas de enfermeras con clínicas"
);
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// ==============================
// CONSTANTES DE COLOR (relleno de estados)
// ==============================
const COLOR_CERO = '#bfbfbf';   // 0.00 para tasas
const COLOR_SIN  = '#d9d9d9';   // s/d

const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];

// Solo ids 1..32 para cálculos del mapa nacional
const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));

// Métricas disponibles
const METRICAS = {
  tasa_total:       { label: "Tasa total",           tasaKey: "tasa_total",       countKey: "enfermeras_total",     palette: "tasas" },
  tasa_primer:      { label: "Tasa 1er nivel",       tasaKey: "tasa_primer",      countKey: "enfermeras_primer",    palette: "tasas" },
  tasa_segundo:     { label: "Tasa 2º nivel",        tasaKey: "tasa_segundo",     countKey: "enfermeras_segundo",   palette: "tasas" },
  tasa_tercer:      { label: "Tasa 3er nivel",       tasaKey: "tasa_tercer",      countKey: "enfermeras_tercer",    palette: "tasas" },
  tasa_apoyo:       { label: "Tasa en apoyo",        tasaKey: "tasa_apoyo",       countKey: "enfermeras_apoyo",     palette: "tasas" },
  tasa_escuelas:    { label: "Tasa en escuelas",     tasaKey: "tasa_escuelas",    countKey: "enfermeras_escuelas",  palette: "tasas" },
  tasa_no_aplica:   { label: "Tasa no aplica",       tasaKey: "tasa_no_aplica",   countKey: "enfermeras_no_aplica", palette: "tasas" },
  tasa_no_asignado: { label: "Tasa no asignado",     tasaKey: "tasa_no_asignado", countKey: "enfermeras_no_asignado", palette: "tasas" },
  poblacion:        { label: "Población",            tasaKey: "poblacion",        countKey: "poblacion",            palette: "poblacion" }
};
let currentMetric = "tasa_total";

// ==============================
// RUTAS DE DATOS (ajusta si cambian)
// ==============================
const RUTA_GEO      = "../data/maps/republica-mexicana.geojson";
const RUTA_TASAS    = "../data/rate/republica-mexicana.csv";
const RUTA_CLINICAS = "../data/clinicas/clinicas-cateteres.csv"; // Asegúrate que exista este archivo

// ==============================
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json(RUTA_GEO),
  d3.csv(RUTA_TASAS),
  d3.csv(RUTA_CLINICAS, d => ({
    // Limpieza básica del catálogo de clínicas
    clues: (d.CLUES || "").trim().toUpperCase(),
    inst_cod: (d.Clave_Institucion || "").trim().toUpperCase(),
    institucion: (d.Institucion || "").trim(),
    ent_cod: String(d.Clave_Entidad || "").padStart(2, "0"),
    entidad: (d.Entidad || "").trim(),
    mun_cod: String(d.CLAVE_MUNICIPIO || "").padStart(3, "0"),
    municipio: (d.MUNICIPIO || "").trim(),
    loc_cod: String(d.CLAVE_LOCALIDAD || "").padStart(4, "0"),
    localidad: (d.LOCALIDAD || "").trim(),
    unidad: (d.NOMBRE_UNIDAD || "").trim(),
    lat: +String(d.LATITUD || "").replace(",", "."),
    lon: +String(d.LONGITUD || "").replace(",", "."),
    observaciones: (d.Observaciones || "").trim(),
    tipo: MARCADORES_TIPOS.CATETER // tipifica para estilos
  }))
]).then(([geoData, tasasRaw, clinicasRaw]) => {

  // ==============================
  // Normalización global del CSV de tasas
  // ==============================
  const tasas = normalizarDataset(tasasRaw, { scope: "nacional", extras: [] });

  // ==============================
  // Diccionario por estado (para polígonos/tooltip)
  // ==============================
  const dataByEstado = {};
  tasas.forEach(d => {
    const estado = (d.estado || "").trim();
    if (!estado) return;
    dataByEstado[estado] = {
      poblacion: d.poblacion,

      enfermeras_total:   d.enfermeras_total,   tasa_total:   d.tasa_total,
      enfermeras_primer:  d.enfermeras_primer,  tasa_primer:  d.tasa_primer,
      enfermeras_segundo: d.enfermeras_segundo, tasa_segundo: d.tasa_segundo,
      enfermeras_tercer:  d.enfermeras_tercer,  tasa_tercer:  d.tasa_tercer,

      enfermeras_apoyo:   d.enfermeras_apoyo,   tasa_apoyo:   d.tasa_apoyo,
      enfermeras_escuelas:d.enfermeras_escuelas,tasa_escuelas:d.tasa_escuelas,

      enfermeras_no_aplica:   d.enfermeras_no_aplica,   tasa_no_aplica:   d.tasa_no_aplica,
      enfermeras_no_asignado: d.enfermeras_no_asignado, tasa_no_asignado: d.tasa_no_asignado
    };
  });

  // ==============================
  // Utilidades de cuartiles
  // ==============================
  function computeQuartiles(vals) {
    vals = vals.filter(Number.isFinite).sort((a, b) => a - b);
    if (!vals.length) return { min: 0, q1: 1, q2: 2, q3: 3, max: 4 };
    let min = vals[0], max = vals[vals.length - 1];
    let q1  = d3.quantileSorted(vals, 0.25);
    let q2  = d3.quantileSorted(vals, 0.50);
    let q3  = d3.quantileSorted(vals, 0.75);
    const eps = 1e-6;
    if (!(q1 > min)) q1 = min + eps;
    if (!(q2 > q1)) q2 = q1 + eps;
    if (!(q3 > q2)) q3 = q2 + eps;
    if (!(max > q3)) max = q3 + eps;
    return { min, q1, q2, q3, max };
  }

  function valoresDeMetrica(metricKey) {
    const key = METRICAS[metricKey].tasaKey; // 'tasa_*' o 'poblacion'
    return tasas
      .filter(d => idsEntidades.has(String(d.id)))
      .map(d => +d[key])
      .filter(Number.isFinite);
  }

  // ==============================
  // Proyección y paths de estados
  // ==============================
  const projection = d3.geoMercator()
    .scale(2000)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  const estados = g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("fill", COLOR_SIN);

  // ==============================
  // Pintado + leyenda
  // ==============================
  let min, q1, q2, q3, max;
  let colorScale;

  function paletteFor(metricKey) {
    const pal = METRICAS[metricKey].palette;
    return pal === "poblacion" ? COLORES_POBLACION : COLORES_TASAS;
  }

  function recomputeAndPaint() {
    ({ min, q1, q2, q3, max } = computeQuartiles(valoresDeMetrica(currentMetric)));

    const PALETTE = paletteFor(currentMetric);
    const esPoblacion = currentMetric === "poblacion";

    colorScale = d3.scaleLinear()
      .domain([min, q1, q2, q3, max])
      .range(PALETTE)
      .interpolate(d3.interpolateRgb);

    estados.transition().duration(350)
      .attr("fill", d => {
        const nombre = (d.properties.NOMBRE || "").trim();
        const item = dataByEstado[nombre];
        if (!item) return COLOR_SIN;
        const v = +item[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPoblacion && v <= 0) return COLOR_CERO; // '0.00' solo aplica a tasas
        return colorScale(v);
      });

    legendHost.selectAll("*").remove();

    // Pasos únicos (redondeo distinto para población vs. tasas)
    const pasosCrudos = [min, q1, q2, q3, max];
    const pasos = [];
    const seen = new Set();
    pasosCrudos.forEach(v => {
      const k = esPoblacion ? Math.round(v) : +(+v).toFixed(2);
      if (!seen.has(k)) { seen.add(k); pasos.push(k); }
    });

    crearLeyenda(legendHost, {
      dominio: [min, max],
      pasos,
      colores: PALETTE,
      titulo: METRICAS[currentMetric].label,
      chips: esPoblacion ? null : [
        { color: COLOR_CERO, texto: "0.00" },
        { color: COLOR_SIN,  texto: "s/d"  }
      ]
    });
  }

  // ==============================
  // Tooltips estados
  // ==============================
  estados
    .on("mouseover", function (event, d) {
      const nombre = (d.properties.NOMBRE || "").trim();
      const item = dataByEstado[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, item, {
        metricKey: METRICAS[currentMetric].tasaKey,
        label: METRICAS[currentMetric].label,
        onlyPopulation: currentMetric === "poblacion"
      });
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top",  (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      ocultarTooltip(tooltip);
      d3.select(this).attr("stroke-width", 0.5);
    });

// ==============================
// CAPA DE MARCADORES (clínicas)
// ==============================
const puntos = clinicasRaw.filter(d =>
  Number.isFinite(d.lat) && Number.isFinite(d.lon)
);

const marcadoresCtl = pintarMarcadores(g, puntos, projection, {
  tipo: MARCADORES_TIPOS.CATETER,
  radioBase: 5,
  strokeBase: 1.1,
});

// Tooltip simple para clínicas (local, sin depender de otro export)
function mostrarTooltipClinicaLocal(tooltipSel, event, d) {
  const titulo = d.unidad || d.clinica || "Clínica";
  const cuerpo = `
    <div><strong>${titulo}</strong></div>
    <div>${d.municipio || ""}${d.municipio && d.entidad ? ", " : ""}${d.entidad || ""}</div>
    <div>${d.institucion || ""}${d.inst_cod ? " (" + d.inst_cod + ")" : ""}</div>
    <div>Lat: ${Number(d.lat).toFixed(4)}, Lon: ${Number(d.lon).toFixed(4)}</div>
    ${d.observaciones ? `<div style="margin-top:4px;">${d.observaciones}</div>` : "" }
  `;
  tooltipSel.html(cuerpo)
    .style("opacity", 1)
    .style("left", (event.pageX + 10) + "px")
    .style("top",  (event.pageY - 28) + "px");
}

marcadoresCtl.selection
  .on("mouseover", function (event, d) {
    event.stopPropagation();
    mostrarTooltipClinicaLocal(tooltip, event, d);
  })
  .on("mousemove", function (event) {
    event.stopPropagation();
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top",  (event.pageY - 28) + "px");
  })
  .on("mouseout", function (event) {
    event.stopPropagation();
    ocultarTooltip(tooltip);
  });

// ---- LEYENDA DE MARCADORES (abajo-izquierda) ----
const tiposPresentes = Array.from(new Set(puntos.map(p => p.tipo))).filter(Boolean);
if (tiposPresentes.length) {
  crearLeyendaMarcadores(svg, tiposPresentes, {
    x: 24,                    // margen izquierdo
    y: MAP_HEIGHT - 96,       // posición vertical (pegada abajo)
    title: "Marcadores",        // título de la leyenda
    dx: 0,                    // offset horizontal interno
    dyStep: 20,               // separación entre filas
  });
}


  // ==============================
  // ZOOM (y tamaño visual estable de marcadores)
  // ==============================
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      marcadoresCtl.updateZoom(event.transform.k);
    });

  svg.call(zoom);

  // Botones conectados (si tu componente los usa)
  renderZoomControles(HOST_SEL, {
    svg,
    g,
    zoom,
    showHome: true,
    homeHref: "../entidades/republica-mexicana.html",
    idsPrefix: "clin",
    escalaMin: 1,
    escalaMax: 20,
    paso: 0.5
  });

  // ==============================
  // Etiquetas (apagadas por default)
  // ==============================
  const labelsGroup = g.append("g")
    .attr("id", "etiquetas-municipios")
    .style("display", "none");

  const nombresUnicos = new Set();
  geoData.features.forEach(d => {
    const nombre = (d.properties.NOMBRE || "").trim();
    if (!nombre || nombresUnicos.has(nombre)) return;
    const [x, y] = path.centroid(d);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, { fontSize: "6px" });
    nombresUnicos.add(nombre);
  });

  // ==============================
  // Primera renderización y selector de métrica
  // ==============================
  const sel = document.getElementById("sel-metrica");
  if (sel) currentMetric = sel.value || currentMetric;
  recomputeAndPaint();

  if (sel) {
    sel.addEventListener("change", () => {
      currentMetric = sel.value;
      recomputeAndPaint();
      tablaNac.update(currentMetric);
    });
  }

  // ==============================
  // TABLA NACIONAL (usa utils/tablas.js)
  // ==============================
  const tablaNac = renderTablaNacional({
    data: tasas,
    METRICAS,
    metricKey: currentMetric,
    hostSelector: "#tabla-contenido"
  });

  attachExcelButton({
    buttonSelector: "#descargar-excel",
    filenameBase: "enfermeras-nacional.xlsx",
    sheetName: "Resumen"
  });

  // ==============================
  // DESCARGA PNG (título para clínicas)
  // ==============================
  const nombreTipo = "clínicas de catéter";
  const year = 2025;

  document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTituloClinicas(currentMetric, { nombreTipo, entidad: null, year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "none";
    setTimeout(() => {
      descargarComoPNG(
        `${HOST_SEL} svg`,
        "clinicas-cateteres-sin-nombres.png",
        MAP_WIDTH,
        MAP_HEIGHT,
        { titulo }
      );
    }, 100);
  });

  document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTituloClinicas(currentMetric, { nombreTipo, entidad: null, year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "block";
    setTimeout(() => {
      descargarComoPNG(
        `${HOST_SEL} svg`,
        "clinicas-cateteres-con-nombres.png",
        MAP_WIDTH,
        MAP_HEIGHT,
        { titulo }
      );
      etiquetas.style.display = "none";
    }, 100);
  });

}).catch(err => {
  console.error("Error al cargar el mapa de clínicas:", err);
});
