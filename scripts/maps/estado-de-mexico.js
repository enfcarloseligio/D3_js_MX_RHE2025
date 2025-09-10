// scripts/maps/estado-de-mexico.js
// ==============================
// IMPORTACIONES
// ==============================
import {
  crearTooltip, mostrarTooltip, ocultarTooltip, mostrarTooltipClinica
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG, crearEtiquetaMunicipio,
  construirTitulo,
  prepararEscalaYLeyenda,   // helper global
  COLOR_CERO, COLOR_SIN     // colores globales
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';

// Builder de tabla municipal + exportación Excel
import { generarTablaMunicipios, habilitarDescargaExcel } from '../utils/tabla-municipios.js';

// Marcadores: control, rutas y estilos
import { renderMarcadoresControl } from '../componentes/marcadores-control.js';
import { RUTAS_MARCADORES, normalizarClinicaRow } from '../utils/marcadores.config.js';
import { MARCADORES_TIPOS, pintarMarcadores, crearLeyendaMarcadores } from '../utils/marcadores.js';

// ==============================
// CREACIÓN DEL MAPA
// ==============================
const { svg, g } = crearSVGBase("#mapa-entidad", "Mapa de enfermeras – Estado de México");
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// ==============================
// CONSTANTES / CONFIG
// ==============================
const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];

// ✅ Filtro de entidad para marcadores (Estado de México)
const ES_CVE_EDOMEX = "15";
const esDeEdomexRaw = (d) =>
  String(d.Clave_Entidad || d.cve_ent || d.CVE_ENT || d.entidad_id)
    .padStart(2, "0") === ES_CVE_EDOMEX
  || /estado\s*de\s*m[eé]xico/i.test(String(d.Entidad || d.estado || d.entidad || ""));

// Definición de métricas disponibles (mismas que en Tamaulipas)
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
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json("../data/maps/estado-de-mexico.geojson"),
  d3.csv("../data/rate/estado-de-mexico.csv") // agrega ?v=Date.now() si quieres cache-buster
]).then(([geoData, tasasRaw]) => {

  // Año dinámico en título y etiquetas
  const year = new Date().getFullYear();
  document.title = `SIARHE | Enfermería en Estado de México ${year}`;
  document.querySelectorAll(".year").forEach(el => el.textContent = year);

  // --- Parseo robusto ---
  const toNumber = v => {
    const n = +v;
    return Number.isFinite(n) ? n : NaN;
  };

  const tasas = tasasRaw.map(d => ({
    ...d,
    // soporta acento en población
    poblacion: toNumber(d.poblacion ?? d['población']),
    // totales
    enfermeras_total: toNumber(d.enfermeras_total),
    tasa_total:       toNumber(d.tasa_total),
    // niveles
    enfermeras_primer:   toNumber(d.enfermeras_primer),
    tasa_primer:         toNumber(d.tasa_primer),
    enfermeras_segundo:  toNumber(d.enfermeras_segundo),
    tasa_segundo:        toNumber(d.tasa_segundo),
    enfermeras_tercer:   toNumber(d.enfermeras_tercer),
    tasa_tercer:         toNumber(d.tasa_tercer),
    enfermeras_apoyo:    toNumber(d.enfermeras_apoyo),
    tasa_apoyo:          toNumber(d.tasa_apoyo),
    enfermeras_escuelas: toNumber(d.enfermeras_escuelas),
    tasa_escuelas:       toNumber(d.tasa_escuelas),
    enfermeras_no_aplica:   toNumber(d.enfermeras_no_aplica),
    tasa_no_aplica:         toNumber(d.tasa_no_aplica),
    enfermeras_no_asignado: toNumber(d.enfermeras_no_asignado),
    tasa_no_asignado:       toNumber(d.tasa_no_asignado),
  }));

  // Total de la entidad (fila id=9999 o TOTAL)
  const filaTotal = tasasRaw.find(d => String(d.id) === "9999" || (d.municipio || "").toUpperCase() === "TOTAL");
  const totalEnt = filaTotal ? (Number(filaTotal.enfermeras_total ?? filaTotal.enfermeras) || 0)
                             : d3.sum(tasas, d => +d.enfermeras_total || 0);
  const spanTotal = document.getElementById("total-enfermeras-ent");
  if (spanTotal) spanTotal.textContent = (totalEnt || 0).toLocaleString("es-MX");

  // Diccionario por municipio (clave: nombre normalizado)
  const byMun = {};
  tasas.forEach(d => {
    const mun = (d.municipio || d.municipio_nombre || "").trim();
    if (!mun) return;
    byMun[mun] = d;
  });

  // Paleta por métrica
  function paletteFor(metricKey) {
    return METRICAS[metricKey].palette === "poblacion" ? COLORES_POBLACION : COLORES_TASAS;
  }

  // ==============================
  // PROYECCIÓN Y PATHS MUNICIPALES
  // ==============================
  const projection = d3.geoMercator()
    .fitExtent([[20, 20],[MAP_WIDTH - 20, MAP_HEIGHT - 20]], { type: "FeatureCollection", features: geoData.features });

  const path = d3.geoPath().projection(projection);

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

  // ==============================
  // REPINTADO (usa helpers globales)
  // ==============================
  function recomputeAndPaint() {
    const pal = paletteFor(currentMetric);
    const esPob = (currentMetric === "poblacion");

    // (Conserva tu estrategia actual)
    const extraPob = { capAtPercentile: 0.95 };
    // const extraPob = { fixedDomain: [6000, 15000, 30000, 60000, 120000] };

    const { scale, legendCfg } = prepararEscalaYLeyenda(
      tasas,
      METRICAS,
      currentMetric,
      {
        palette: pal,
        titulo: METRICAS[currentMetric].label,
        excludeIds: ["8888", "9999"], // ignora s/d y total
        idKey: "id",
        clamp: true,
        ...(esPob ? extraPob : {})   // solo aplica a población
      }
    );

    // Colorear municipios
    g.selectAll("path.municipio")
      .transition().duration(350)
      .attr("fill", f => {
        const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || "").trim();
        const row = byMun[nombre];
        if (!row) return COLOR_SIN;
        const v = +row[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPob && v <= 0)     return COLOR_CERO;  // 0.00 en gris
        return scale(v);
      });

    // Leyenda
    legendHost.selectAll("*").remove();
    crearLeyenda(legendHost, legendCfg);
  }

  // ==============================
  // ZOOM Y CONTROLES
  // ==============================
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      for (const ctl of ctlPorTipo.values()) ctl.updateZoom(event.transform.k);
    });
  svg.call(zoom);

  renderZoomControles("#mapa-entidad", {
    svg, g, zoom, showHome: true, idsPrefix: "edomex", escalaMin: 1, escalaMax: 20, paso: 0.5
  });

  // ==============================
  // CAPA DE MARCADORES (opcional)
  // ==============================
  const gMarcadores = g.append("g").attr("class", "capa-marcadores");
  const ctlPorTipo = new Map();

  async function cargarYPintar(tipo) {
    const ruta = RUTAS_MARCADORES[tipo];
    if (!ruta) return null;

    const raw = await d3.csv(ruta);

    // ✅ Solo marcadores del Estado de México (Clave_Entidad=15 o Entidad='Estado de México')
    const rawEdomex = raw.filter(esDeEdomexRaw);

    const pts = rawEdomex
      .map(d => normalizarClinicaRow(d, tipo))
      .filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));

    const ctl = pintarMarcadores(gMarcadores, pts, projection, { tipo });
    ctl.selection
      .on("mouseover", (event, d) => { event.stopPropagation(); mostrarTooltipClinica(tooltip, event, d); })
      .on("mousemove", (event) => { event.stopPropagation(); tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY - 28) + "px"); })
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
    // leyenda de marcadores
    const tipos = Array.from(ctlPorTipo.keys());
    svg.selectAll(".leyenda-marcadores").remove();
    if (tipos.length) {
      crearLeyendaMarcadores(svg, tipos, {
        x: 30, y: MAP_HEIGHT - 110, title: "Marcadores", dx: 0, dyStep: 18
      });
    }
  }

  // ==============================
  // ETIQUETAS MUNICIPALES
  // ==============================
  const labelsGroup = g.append("g").attr("id", "etiquetas-municipios").style("display", "none");
  geoData.features.forEach(f => {
    const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || "").trim();
    if (!nombre) return;
    const [x, y] = path.centroid(f);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, { fontSize: "6px" });
  });

  // ==============================
  // PINTADO INICIAL
  // ==============================
  const sel = document.getElementById("sel-metrica");
  if (sel) currentMetric = sel.value || currentMetric;
  recomputeAndPaint();

  // Tabla municipal vinculada al selector
  generarTablaMunicipios("../data/rate/estado-de-mexico.csv");
  habilitarDescargaExcel("estado-de-mexico.xlsx");

  // Cambio de métrica -> repinta mapa
  if (sel) {
    sel.addEventListener("change", () => {
      currentMetric = sel.value;
      recomputeAndPaint();
    });
  }

  // Selector de marcadores
  const items = Object.values(MARCADORES_TIPOS).map(t => ({ value: t, label: t }));
  const marcCtl = renderMarcadoresControl("#control-marcadores", { items, label: "Marcadores", size: 4 });
  marcCtl.setSelected([]); // por defecto, sin marcadores
  marcCtl.onChange(async () => { await updateMarcadores(marcCtl.getSelected()); });

  // ==============================
  // DESCARGAS PNG
  // ==============================
  document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: "Estado de México", year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "none";
    setTimeout(() => {
      descargarComoPNG("#mapa-entidad svg", "mapa-edomex-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT, { titulo });
    }, 100);
  });

  document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: "Estado de México", year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "block";
    setTimeout(() => {
      descargarComoPNG("#mapa-entidad svg", "mapa-edomex-con-nombres.png", MAP_WIDTH, MAP_HEIGHT, { titulo });
      etiquetas.style.display = "none";
    }, 100);
  });

}).catch(err => console.error("Error en mapa de Estado de México:", err));
