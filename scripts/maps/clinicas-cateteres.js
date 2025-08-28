// scripts/maps/clinicas-cateteres.js
// ==============================
// IMPORTACIONES
// ==============================
import {
  crearTooltip,
  mostrarTooltip,       // tooltip para ESTADOS (tasas / población)
  ocultarTooltip,
  mostrarTooltipClinica // tooltip para CLÍNICAS (CLUES, institución, etc.)
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';

// ==============================
// CREAR SVG + TOOLTIP + HOST LEYENDA
// ==============================
const { svg, g } = crearSVGBase(
  "#mapa-clinicas",
  "Mapa nacional de tasas de enfermeras con clínicas de catéter"
);
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// Paletas y colores
const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];
const COLOR_CERO = '#bfbfbf';  // para 0.00 (solo en tasas)
const COLOR_SIN  = '#d9d9d9';  // s/d

// Parser números (soporta coma decimal)
const toNum = v => {
  if (v == null) return NaN;
  const n = +String(v).trim().replace(",", ".");
  return Number.isFinite(n) ? n : NaN;
};

// ==============================
// CONFIG DE MÉTRICAS
// ==============================
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

// Solo ids 1..32 para cortes (excluye 8888/9999)
const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));

// ==============================
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json("../data/maps/republica-mexicana.geojson"),
  d3.csv("../data/rate/republica-mexicana.csv"),
  d3.csv("../data/clinicas/clinicas-cateteres.csv", d => ({
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
    lat: toNum(d.LATITUD),
    lon: toNum(d.LONGITUD),
    observaciones: (d.Observaciones || "").trim()
  }))
]).then(([geoData, tasas, clinicas]) => {

  // ==============================
  // Normalización “ancha”
  // ==============================
  tasas.forEach(d => {
    d.población            = +((("población" in d) && d["población"] !== "") ? d["población"] : (d.poblacion || 0));
    d.poblacion            = d["población"]; // alias sin acento
    d.enfermeras_total     = +((d.enfermeras_total ?? d.enfermeras) || 0);
    d.tasa_total           = +((d.tasa_total       ?? d.tasa)       || 0);

    d.enfermeras_primer      = +(d.enfermeras_primer      || 0);
    d.tasa_primer            = +(d.tasa_primer            || 0);
    d.enfermeras_segundo     = +(d.enfermeras_segundo     || 0);
    d.tasa_segundo           = +(d.tasa_segundo           || 0);
    d.enfermeras_tercer      = +(d.enfermeras_tercer      || 0);
    d.tasa_tercer            = +(d.tasa_tercer            || 0);
    d.enfermeras_apoyo       = +(d.enfermeras_apoyo       || 0);
    d.tasa_apoyo             = +(d.tasa_apoyo             || 0);
    d.enfermeras_escuelas    = +(d.enfermeras_escuelas    || 0);
    d.tasa_escuelas          = +(d.tasa_escuelas          || 0);
    d.enfermeras_no_aplica   = +(d.enfermeras_no_aplica   || 0);
    d.tasa_no_aplica         = +(d.tasa_no_aplica         || 0);
    d.enfermeras_no_asignado = +(d.enfermeras_no_asignado || 0);
    d.tasa_no_asignado       = +(d.tasa_no_asignado       || 0);
  });

  // ==============================
  // Diccionario por estado
  // ==============================
  const dataByEstado = {};
  tasas.forEach(d => {
    const estado = (d.estado || d.Estado || "").trim();
    if (!estado) return;
    dataByEstado[estado] = {
      poblacion: d.poblacion,
      enfermeras_total:       d.enfermeras_total,       tasa_total:       d.tasa_total,
      enfermeras_primer:      d.enfermeras_primer,      tasa_primer:      d.tasa_primer,
      enfermeras_segundo:     d.enfermeras_segundo,     tasa_segundo:     d.tasa_segundo,
      enfermeras_tercer:      d.enfermeras_tercer,      tasa_tercer:      d.tasa_tercer,
      enfermeras_apoyo:       d.enfermeras_apoyo,       tasa_apoyo:       d.tasa_apoyo,
      enfermeras_escuelas:    d.enfermeras_escuelas,    tasa_escuelas:    d.tasa_escuelas,
      enfermeras_no_aplica:   d.enfermeras_no_aplica,   tasa_no_aplica:   d.tasa_no_aplica,
      enfermeras_no_asignado: d.enfermeras_no_asignado, tasa_no_asignado: d.tasa_no_asignado
    };
  });

  // ==============================
  // Cuartiles + valores
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
      .map(d => +d[key === "poblacion" ? "poblacion" : key])
      .filter(Number.isFinite);
  }

  // ==============================
  // Proyección y paths
  // ==============================
  const projection = d3.geoMercator()
    .scale(2000)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  // ==============================
  // Estados base
  // ==============================
  const estados = g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .style("cursor", "default");

  // ==============================
  // Pintado + leyenda
  // ==============================
  let min, q1, q2, q3, max;
  let colorScale;

  function recomputeAndPaint() {
    ({ min, q1, q2, q3, max } = computeQuartiles(valoresDeMetrica(currentMetric)));

    const esPoblacion = currentMetric === "poblacion";
    const PALETTE = esPoblacion ? COLORES_POBLACION : COLORES_TASAS;

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
        if (!esPoblacion && v <= 0) return COLOR_CERO; // CERO solo para tasas
        return colorScale(v);
      });

    // Leyenda (formato según métrica)
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
  // Capa de marcadores de clínicas
  // ==============================
  const puntos = clinicas.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
  const gMarcadores = g.append("g").attr("class", "capa-clinicas");
  gMarcadores.raise();

  const RADIO_BASE   = 5;
  const STROKE_BASE  = 1.1;
  const HOVER_FACTOR = 1.35;
  let currentK = 1;

  const radioEscalado = el => (RADIO_BASE  * (el.classList.contains("is-hover") ? HOVER_FACTOR : 1)) / currentK;
  const bordeEscalado = el => (STROKE_BASE * (el.classList.contains("is-hover") ? HOVER_FACTOR : 1)) / currentK;

  gMarcadores.selectAll("circle")
    .data(puntos)
    .enter()
    .append("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", function() { return radioEscalado(this); })
    .attr("fill", "#002f2a")
    .attr("stroke", "#fff")
    .attr("stroke-width", function() { return bordeEscalado(this); })
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      event.stopPropagation();
      d3.select(this)
        .classed("is-hover", true)
        .attr("fill", "#002f2a")
        .attr("r",            () => radioEscalado(this))
        .attr("stroke-width", () => bordeEscalado(this));
      mostrarTooltipClinica(tooltip, event, d);
    })
    .on("mousemove", function (event) {
      event.stopPropagation();
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top",  (event.pageY - 28) + "px");
    })
    .on("mouseout", function (event) {
      event.stopPropagation();
      d3.select(this)
        .classed("is-hover", false)
        .attr("fill", "#1e5b4f")
        .attr("r",            () => radioEscalado(this))
        .attr("stroke-width", () => bordeEscalado(this));
      ocultarTooltip(tooltip);
    });

// ==============================
// ZOOM + Botones (componente lo cablea a TU zoom)
// ==============================

// 1) Crea tu zoom (mantiene tamaño visual de los puntos)
const zoom = d3.zoom()
  .scaleExtent([1, 20])
  .on("zoom", (event) => {
    currentK = event.transform.k;
    g.attr("transform", event.transform);

    // mantener tamaño visual de los puntos
    gMarcadores.selectAll("circle")
      .attr("r",            function () { return (RADIO_BASE  * (this.classList.contains("is-hover") ? HOVER_FACTOR : 1)) / currentK; })
      .attr("stroke-width", function () { return (STROKE_BASE * (this.classList.contains("is-hover") ? HOVER_FACTOR : 1)) / currentK; });
  });

// 2) Vincula ESTE zoom al SVG
svg.call(zoom);

// 3) Inyecta los controles y pásale tu zoom para que los conecte
renderZoomControles("#mapa-clinicas", {
  svg,
  g,
  zoom,                  // el componente conecta +/−/⟳ a ESTA instancia
  showHome: true,
  homeHref: "../entidades/republica-mexicana.html",
  idsPrefix: "clin",
  escalaMin: 1,
  escalaMax: 20,
  paso: 0.5
});

// ==============================
// Render inicial + selector
// ==============================
const sel = document.getElementById("sel-metrica");
if (sel) currentMetric = sel.value || currentMetric;

recomputeAndPaint();

if (sel) {
  sel.addEventListener("change", () => {
    currentMetric = sel.value;
    recomputeAndPaint();
  });
}

// ==============================
// DESCARGA PNG
// ==============================
document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
  descargarComoPNG("#mapa-clinicas svg", "mapa-clinicas-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT, "México");
});

document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "block";
  setTimeout(() => {
    descargarComoPNG("#mapa-clinicas svg", "mapa-clinicas-con-nombres.png", MAP_WIDTH, MAP_HEIGHT, "México");
    if (etiquetas) etiquetas.style.display = "none";
  }, 100);
});

}).catch(err => {
  console.error("Error al cargar el mapa de clínicas:", err);
});
