// scripts/maps/clinicas-cateteres.js
// ==============================
// IMPORTACIONES
// ==============================
import {
  crearTooltip,
  mostrarTooltip,          // tooltip para ESTADOS (tasa/población/enfermeras)
  ocultarTooltip,
  mostrarTooltipClinica    // tooltip para CLÍNICAS (CLUES, institución, etc.)
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, inyectarControlesBasicos,
  descargarComoPNG
} from '../utils/config-mapa.js';

// ==============================
// CREAR SVG + TOOLTIP + HOST LEYENDA
// ==============================
const { svg, g } = crearSVGBase("#mapa-clinicas", "Mapa nacional de tasas de enfermeras con clínicas de catéter");
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// Paleta institucional y colores de “cero/sin dato”
const COLORES    = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLOR_CERO = '#bfbfbf';  // v == 0
const COLOR_SIN  = '#d9d9d9';  // s/d

// Parser para números (permite comas decimales)
const toNum = v => {
  if (v == null) return NaN;
  const n = +String(v).trim().replace(",", ".");
  return Number.isFinite(n) ? n : NaN;
};

// ==============================
// CONFIG DE MÉTRICAS
// ==============================
const METRICAS = {
  tasa_total:       { label: "Tasa total",           tasaKey: "tasa_total",       countKey: "enfermeras_total" },
  tasa_primer:      { label: "Tasa 1er nivel",       tasaKey: "tasa_primer",      countKey: "enfermeras_primer" },
  tasa_segundo:     { label: "Tasa 2º nivel",        tasaKey: "tasa_segundo",     countKey: "enfermeras_segundo" },
  tasa_tercer:      { label: "Tasa 3er nivel",       tasaKey: "tasa_tercer",      countKey: "enfermeras_tercer" },
  tasa_apoyo:       { label: "Tasa en apoyo",        tasaKey: "tasa_apoyo",       countKey: "enfermeras_apoyo" },
  tasa_escuelas:    { label: "Tasa en escuelas",     tasaKey: "tasa_escuelas",    countKey: "enfermeras_escuelas" },
  tasa_no_aplica:   { label: "Tasa no aplica",       tasaKey: "tasa_no_aplica",   countKey: "enfermeras_no_aplica" },
  tasa_no_asignado: { label: "Tasa no asignado",     tasaKey: "tasa_no_asignado", countKey: "enfermeras_no_asignado" }
};
let currentMetric = "tasa_total";

// Solo ids 1..32 para calcular cortes (excluye 8888/9999)
const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));

  // ==============================
  // CARGA DE DATOS
  // ==============================
  Promise.all([
    d3.json("../data/maps/republica-mexicana.geojson"),
    d3.csv("../data/rate/republica-mexicana.csv"),
    d3.csv("../data/clinicas/clinicas-cateteres.csv", d => ({
      // —— columnas estandarizadas que definiste ——
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
  // Normalización de columnas “anchas”
  // ==============================
  tasas.forEach(d => {
    d.población = +((("población" in d) && d["población"] !== "") ? d["población"] : (d.poblacion || 0));
    d.enfermeras_total = +((d.enfermeras_total ?? d.enfermeras) || 0);
    d.tasa_total       = +((d.tasa_total       ?? d.tasa)       || 0);

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
  // Diccionario por estado (registro “ancho”)
  // ==============================
  const dataByEstado = {};
  tasas.forEach(d => {
    const estado = (d.estado || d.Estado || "").trim();
    if (!estado) return;
    dataByEstado[estado] = {
      poblacion: d.población,
      // totales
      enfermeras_total:       d.enfermeras_total,       tasa_total:       d.tasa_total,
      // niveles / ámbitos
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
  // Utilidades: cuartiles + valores por métrica
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
    const key = METRICAS[metricKey].tasaKey;
    return tasas
      .filter(d => idsEntidades.has(String(d.id)))
      .map(d => +d[key])
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
  // Dibujo base de entidades (sin fill, se pinta luego)
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
  // Pintado inicial + leyenda
  // ==============================
  let min, q1, q2, q3, max;
  let colorScale;

  function recomputeAndPaint() {
    ({ min, q1, q2, q3, max } = computeQuartiles(valoresDeMetrica(currentMetric)));
    colorScale = d3.scaleLinear()
      .domain([min, q1, q2, q3, max])
      .range(COLORES)
      .interpolate(d3.interpolateRgb);

    estados.transition().duration(350)
      .attr("fill", d => {
        const nombre = (d.properties.NOMBRE || "").trim();
        const item = dataByEstado[nombre];
        if (!item) return COLOR_SIN;
        const v = +item[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN; // s/d
        if (v <= 0) return COLOR_CERO;            // cero
        return colorScale(v);                     // gradiente
      });

    // Leyenda limpia y coherente
    crearLeyenda(legendHost, {
      dominio: [min, max],
      pasos: Array.from(new Set([min, q1, q2, q3, max].map(x => +x.toFixed(2)))),
      colores: COLORES,
      titulo: METRICAS[currentMetric].label,
      chips: [
        { color: COLOR_CERO, texto: "0.00" },
        { color: COLOR_SIN,  texto: "s/d"  }
      ]
    });
  }

  // ==============================
  // Tooltips para estados
  // ==============================
  estados
    .on("mouseover", function (event, d) {
      const nombre = (d.properties.NOMBRE || "").trim();
      const item = dataByEstado[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, item, {
        metricKey: METRICAS[currentMetric].tasaKey,
        label: METRICAS[currentMetric].label
      });
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      ocultarTooltip(tooltip);
      d3.select(this).attr("stroke-width", 0.5);
    });

  // ==============================
  // Controles (zoom + botón hogar)
  // ==============================
  inyectarControlesBasicos(svg, g, "../entidades/republica-mexicana.html");

  // ============================================================
  // =============== CAPA DE MARCADORES DE CLÍNICAS =============
  // ============================================================
const puntos = clinicas.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));

const gMarcadores = g.append("g").attr("class", "capa-clinicas");
gMarcadores.raise();

const RADIO_BASE   = 5;
const STROKE_BASE  = 1.1;
const HOVER_FACTOR = 1.35;   // agrandar en hover
let currentK = 1;            // nivel de zoom actual

// helper: escala radio y borde según k y si está en hover
function radioEscalado(el) {
  const f = el.classList.contains("is-hover") ? HOVER_FACTOR : 1;
  return (RADIO_BASE * f) / currentK;
}
function bordeEscalado(el) {
  const f = el.classList.contains("is-hover") ? HOVER_FACTOR : 1;
  return (STROKE_BASE * f) / currentK;
}

const circles = gMarcadores.selectAll("circle")
  .data(puntos)
  .enter()
  .append("circle")
  .attr("cx", d => projection([d.lon, d.lat])[0])
  .attr("cy", d => projection([d.lon, d.lat])[1])
  .attr("r", function() { return radioEscalado(this); })
  .attr("fill", "#1e5b4f")
  .attr("stroke", "#fff")
  .attr("stroke-width", function() { return bordeEscalado(this); })
  .style("cursor", "pointer")
  .on("mouseover", function (event, d) {
    event.stopPropagation();
    d3.select(this)
      .classed("is-hover", true)
      .attr("fill", "#002f2a")
      .attr("r",        () => radioEscalado(this))
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
      .attr("r",        () => radioEscalado(this))
      .attr("stroke-width", () => bordeEscalado(this));
    ocultarTooltip(tooltip);
  });

  // ==============================
  // ZOOM con círculos dinámicos (convive con controles)
  // ==============================
  const zoom = d3.zoom()
  .scaleExtent([1, 20])
  .on("zoom", (event) => {
    currentK = event.transform.k;
    g.attr("transform", event.transform);

    gMarcadores.selectAll("circle")
      .attr("r", function() { return radioEscalado(this); })
      .attr("stroke-width", function() { return bordeEscalado(this); });
  });

svg.call(zoom);

  // Vincula el zoom al SVG (si ya había uno, este toma control — está bien para los círculos)
  svg.call(zoom);

  // === Re-cablear los botones de zoom para usar ESTE zoom ===
  (function wireZoomButtonsFor(zoom, step = 0.5) {
    // util para eliminar todos los listeners previos del botón y poner los nuestros
    const rebind = (id, handler) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const clone = btn.cloneNode(true);           // elimina listeners previos
      btn.parentNode.replaceChild(clone, btn);     // sustituye por el clon “limpio”
      clone.addEventListener("click", handler);    // añade nuestro listener
    };

    rebind("zoom-in",  () => svg.transition().call(zoom.scaleBy, 1 + step));
    rebind("zoom-out", () => svg.transition().call(zoom.scaleBy, 1 - step));
    rebind("zoom-reset", () => svg.transition().call(zoom.transform, d3.zoomIdentity));
  })(zoom);


  // ==============================
  // Render inicial + UI selector
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
  // DESCARGA PNG (igual que en República)
  // ==============================
  document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
    // En este mapa normalmente no hay etiquetas de estados; solo exporta tal cual
    descargarComoPNG("#mapa-clinicas svg", "mapa-clinicas-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT, "México");
  });

  document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
    // Si en el futuro agregas un grupo con id="etiquetas-municipios", lo mostramos temporalmente
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
