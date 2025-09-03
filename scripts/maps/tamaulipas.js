// scripts/maps/tamaulipas.js

import {
  crearTooltip, mostrarTooltip, ocultarTooltip, mostrarTooltipClinica
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG, crearEtiquetaMunicipio,
  construirTitulo
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';
import { renderTablaNacional as renderTabla, attachExcelButton } from '../utils/tablas.js';
import { normalizarDataset } from '../utils/normalizacion.js';

import { renderMarcadoresControl } from '../componentes/marcadores-control.js';
import { RUTAS_MARCADORES, normalizarClinicaRow } from '../utils/marcadores.config.js';
import { MARCADORES_TIPOS, pintarMarcadores, crearLeyendaMarcadores } from '../utils/marcadores.js';

// ====== SVG y tooltip ======
const { svg, g } = crearSVGBase("#mapa-entidad", "Mapa de enfermeras – Tamaulipas");
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// ====== Paletas ======
const COLOR_CERO = '#bfbfbf';
const COLOR_SIN  = '#d9d9d9';
const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];

// ====== Métricas (mismo set que nacional) ======
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

// ====== Carga de datos ======
Promise.all([
  d3.json("../data/maps/tamaulipas.geojson"),
  d3.csv("../data/rate/tamaulipas.csv")
]).then(([geoData, tasasRaw]) => {

  // Año y título dinámico
  const year = new Date().getFullYear();
  document.title = `SIARHE | Enfermería en Tamaulipas ${year}`;
  document.querySelectorAll(".year").forEach(el => el.textContent = year);

  // Normalizar dataset al “scope” entidad
  const tasas = normalizarDataset(tasasRaw, { scope: "entidad", extras: [] });

  // Total entidad (si tu CSV trae una fila agregada “id=9999” o “municipio=TOTAL”)
  const filaTotal = tasasRaw.find(d => String(d.id) === "9999" || (d.municipio || "").toUpperCase() === "TOTAL");
  const totalEnt = filaTotal ? (Number(filaTotal.enfermeras_total ?? filaTotal.enfermeras) || 0) : d3.sum(tasas, d => +d.enfermeras_total || 0);
  const spanTotal = document.getElementById("total-enfermeras-ent");
  if (spanTotal) spanTotal.textContent = (totalEnt || 0).toLocaleString("es-MX");

  // Diccionario por municipio (clave: nombre o id normalizado)
  const byMun = {};
  tasas.forEach(d => {
    const mun = (d.municipio || d.municipio_nombre || "").trim();
    if (!mun) return;
    byMun[mun] = d;
  });

  // ====== Cuartiles y escala de color ======
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

  function valores(metricKey) {
    const key = METRICAS[metricKey].tasaKey;
    return tasas.map(d => +d[key]).filter(Number.isFinite);
  }

  let colorScale, min, q1, q2, q3, max;

  function paletteFor(metricKey) {
    return METRICAS[metricKey].palette === "poblacion" ? COLORES_POBLACION : COLORES_TASAS;
  }

  function recomputeAndPaint() {
    ({ min, q1, q2, q3, max } = computeQuartiles(valores(currentMetric)));
    const pal = paletteFor(currentMetric);
    const esPob = currentMetric === "poblacion";

    colorScale = d3.scaleLinear()
      .domain([min, q1, q2, q3, max])
      .range(pal)
      .interpolate(d3.interpolateRgb);

    g.selectAll("path.municipio")
      .transition().duration(350)
      .attr("fill", f => {
        const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || "").trim();
        const row = byMun[nombre];
        if (!row) return COLOR_SIN;
        const v = +row[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPob && v <= 0) return COLOR_CERO;
        return colorScale(v);
      });

    // Leyenda
    legendHost.selectAll("*").remove();
    const pasosCrudos = [min, q1, q2, q3, max];
    const pasos = [];
    const seen = new Set();
    pasosCrudos.forEach(v => {
      const k = esPob ? Math.round(v) : +(+v).toFixed(2);
      if (!seen.has(k)) { seen.add(k); pasos.push(k); }
    });

    crearLeyenda(legendHost, {
      dominio: [min, max],
      pasos,
      colores: pal,
      titulo: METRICAS[currentMetric].label,
      chips: esPob ? null : [
        { color: COLOR_CERO, texto: "0.00" },
        { color: COLOR_SIN,  texto: "s/d"  }
      ]
    });
  }

  // ====== Proyección ======
  const projection = d3.geoMercator()
    .fitExtent([[20, 20],[MAP_WIDTH - 20, MAP_HEIGHT - 20]], { type: "FeatureCollection", features: geoData.features });

  const path = d3.geoPath().projection(projection);

  // ====== Paths municipales ======
  g.selectAll("path.municipio")
    .data(geoData.features)
    .join("path")
    .attr("class", "municipio")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("fill", COLOR_SIN)
    .on("mouseover", function (event, f) {
      const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || "").trim();
      const row = byMun[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, row, {
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

  // ====== Marcadores (opcional) ======
  const gMarcadores = g.append("g").attr("class", "capa-marcadores");
  const ctlPorTipo = new Map();

  async function cargarYPintar(tipo) {
    const ruta = RUTAS_MARCADORES[tipo];
    if (!ruta) return null;
    const raw = await d3.csv(ruta);
    const pts = raw.map(d => normalizarClinicaRow(d, tipo))
                   .filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
    const ctl = pintarMarcadores(gMarcadores, pts, projection, { tipo });
    ctl.selection
      .on("mouseover", (event, d) => { event.stopPropagation(); mostrarTooltipClinica(tooltip, event, d); })
      .on("mousemove", (event) => { event.stopPropagation(); tooltip.style("left", (event.pageX + 10) + "px").style("top",  (event.pageY - 28) + "px"); })
      .on("mouseout",  (event) => { event.stopPropagation(); ocultarTooltip(tooltip); });
    return ctl;
  }

  async function updateMarcadores(sel = []) {
    const setSel = new Set(sel);
    // quitar
    for (const [t, ctl] of ctlPorTipo.entries()) {
      if (!setSel.has(t)) { ctl.selection.remove(); ctlPorTipo.delete(t); }
    }
    // agregar
    for (const t of setSel) {
      if (!ctlPorTipo.has(t)) {
        const ctl = await cargarYPintar(t);
        if (ctl) ctlPorTipo.set(t, ctl);
      }
    }
    // leyenda
    const tipos = Array.from(ctlPorTipo.keys());
    svg.selectAll(".leyenda-marcadores").remove();
    if (tipos.length) {
      crearLeyendaMarcadores(svg, tipos, {
        x: 30, y: MAP_HEIGHT - 110, title: "Marcadores", dx: 0, dyStep: 18
      });
    }
  }

  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      for (const ctl of ctlPorTipo.values()) ctl.updateZoom(event.transform.k);
    });
  svg.call(zoom);

  renderZoomControles("#mapa-entidad", {
    svg, g, zoom, showHome: true, idsPrefix: "tam", escalaMin: 1, escalaMax: 20, paso: 0.5
  });

  // ====== Etiquetas municipales (apagadas por defecto) ======
  const labelsGroup = g.append("g").attr("id", "etiquetas-municipios").style("display", "none");
  geoData.features.forEach(f => {
    const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || "").trim();
    if (!nombre) return;
    const [x, y] = path.centroid(f);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, { fontSize: "6px" });
  });

  // ====== Pintado inicial ======
  const sel = document.getElementById("sel-metrica");
  if (sel) currentMetric = sel.value || currentMetric;
  recomputeAndPaint();

  // ====== Tabla municipal (reutilizando utilidad de tabla) ======
  const tabla = renderTabla({
    data: tasas,            // tu normalización ya expone columnas consistentes
    METRICAS,
    metricKey: currentMetric,
    hostSelector: "#tabla-contenido"
  });

  // ====== Botón Excel sincronizado con la métrica ======
  function resetExcelButtonListener() {
    const btn = document.querySelector("#descargar-excel");
    if (!btn) return;
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
  }
  function actualizarDescargaExcel() {
    const metric = METRICAS[currentMetric] || { label: currentMetric };
    const filename = `tamaulipas-${currentMetric}.xlsx`;
    resetExcelButtonListener();
    attachExcelButton({
      buttonSelector: "#descargar-excel",
      filenameBase: filename,
      sheetName: metric.label
    });
  }
  actualizarDescargaExcel();

  if (sel) {
    sel.addEventListener("change", () => {
      currentMetric = sel.value;
      recomputeAndPaint();
      tabla.update(currentMetric);
      actualizarDescargaExcel();
    });
  }

  // ====== Selector de marcadores ======
  const items = Object.values(MARCADORES_TIPOS).map(t => ({ value: t, label: t }));
  const marcCtl = renderMarcadoresControl("#control-marcadores", { items, label: "Marcadores", size: 4 });
  marcCtl.setSelected([]); // por defecto, sin marcadores
  marcCtl.onChange(async () => { await updateMarcadores(marcCtl.getSelected()); });

  // ====== Descargas PNG ======
  document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: "Tamaulipas", year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "none";
    setTimeout(() => {
      descargarComoPNG("#mapa-entidad svg", "mapa-tamaulipas-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT, { titulo });
    }, 100);
  });

  document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: "Tamaulipas", year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "block";
    setTimeout(() => {
      descargarComoPNG("#mapa-entidad svg", "mapa-tamaulipas-con-nombres.png", MAP_WIDTH, MAP_HEIGHT, { titulo });
      etiquetas.style.display = "none";
    }, 100);
  });

}).catch(err => console.error("Error en mapa de Tamaulipas:", err));
