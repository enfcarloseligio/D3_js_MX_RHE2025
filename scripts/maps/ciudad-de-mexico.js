// scripts/maps/ciudad-de-mexico.js
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
  prepararEscalaYLeyenda,
  COLOR_CERO, COLOR_SIN
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';
import { generarTablaMunicipios, habilitarDescargaExcel } from '../utils/tabla-municipios.js';

import { renderMarcadoresControl } from '../componentes/marcadores-control.js';
import { RUTAS_MARCADORES, normalizarClinicaRow } from '../utils/marcadores.config.js';
import {
  MARCADORES_TIPOS,
  pintarMarcadores,
  crearLeyendaMarcadores,
  nombreTipoMarcador
} from '../utils/marcadores.js';

import {
  METRICAS,
  metricLabel,
  metricPalette,
  tasaKey,
  isPopulation
} from '../utils/metricas.js';

// ==============================
// CREACIÓN DEL MAPA
// ==============================
const { svg, g } = crearSVGBase("#mapa-entidad", "Mapa de enfermeras – Ciudad de México");
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// ==============================
// CONSTANTES / CONFIG
// ==============================
const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];

// ✅ Filtro de entidad para marcadores (CDMX)
const ES_CVE_CDMX = "09";
const esDeCDMXRaw = (d) => {
  const ent = String(d.Clave_Entidad || d.cve_ent || d.CVE_ENT || d.entidad_id || "").padStart(2, "0");
  const txt = String(d.Entidad || d.estado || d.entidad || d.estado_nombre || "");
  return ent === ES_CVE_CDMX || /ciudad\s*de\s*m(e|é)x(ico)?|cdmx/i.test(txt);
};

let currentMetric = "tasa_total";

// ==============================
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json("../data/maps/ciudad-de-mexico.geojson"),
  d3.csv("../data/rate/ciudad-de-mexico.csv")
]).then(([geoData, tasasRaw]) => {

  const year = new Date().getFullYear();
  document.title = `SIARHE | Enfermería en Ciudad de México ${year}`;
  document.querySelectorAll(".year").forEach(el => el.textContent = year);

  // --- Parseo robusto ---
  const toNumber = v => {
    if (v == null) return NaN;
    const n = +String(v).trim().replace(/\s+/g, "").replace(",", ".");
    return Number.isFinite(n) ? n : NaN;
  };

  // Nota: usamos "alcaldía" en lugar de "municipio" para CDMX;
  // los helpers de tabla aceptan cualquier CSV con columnas estándar.
  const tasas = tasasRaw.map(d => ({
    ...d,
    poblacion: toNumber(d.poblacion ?? d['población']),
    enfermeras_total: toNumber(d.enfermeras_total),
    tasa_total:       toNumber(d.tasa_total),
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
    enfermeras_administrativas: toNumber(d.enfermeras_administrativas),
    tasa_administrativas:       toNumber(d.tasa_administrativas),
    enfermeras_no_aplica:   toNumber(d.enfermeras_no_aplica),
    tasa_no_aplica:         toNumber(d.tasa_no_aplica),
    enfermeras_no_asignado: toNumber(d.enfermeras_no_asignado),
    tasa_no_asignado:       toNumber(d.tasa_no_asignado),
  }));

  // Total entidad (fila TOTAL o id=9999)
  const filaTotal = tasasRaw.find(d =>
    String(d.id) === "9999" || (d.municipio || d.alcaldia || "").toUpperCase() === "TOTAL"
  );
  const totalEnt = filaTotal ? (Number(filaTotal.enfermeras_total ?? filaTotal.enfermeras) || 0)
                             : d3.sum(tasas, d => +d.enfermeras_total || 0);
  const spanTotal = document.getElementById("total-enfermeras-ent");
  if (spanTotal) spanTotal.textContent = (totalEnt || 0).toLocaleString("es-MX");

  // Diccionario por alcaldía (aceptamos alias de columna)
  const byAlc = {};
  tasas.forEach(d => {
    const nombre = (d.alcaldia || d.municipio || d.demarcacion || d.municipio_nombre || "").trim();
    if (!nombre) return;
    byAlc[nombre] = d;
  });

  const paletteFor = (mk) =>
    metricPalette(mk) === "poblacion" ? COLORES_POBLACION : COLORES_TASAS;

  // ==============================
  // PROYECCIÓN Y PATHS
  // ==============================
  const projection = d3.geoMercator()
    .fitExtent([[20, 20],[MAP_WIDTH - 20, MAP_HEIGHT - 20]], { type: "FeatureCollection", features: geoData.features });

  const path = d3.geoPath().projection(projection);

  g.selectAll("path.alcaldia")
    .data(geoData.features)
    .join("path")
    .attr("class", "alcaldia")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("fill", COLOR_SIN)
    .on("mouseover", function (event, f) {
      const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || f.properties?.ALCALDIA || "").trim();
      const row = byAlc[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, row, {
        metricKey: tasaKey(currentMetric),
        label: metricLabel(currentMetric),
        onlyPopulation: isPopulation(currentMetric)
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
  // REPINTADO
  // ==============================
  function recomputeAndPaint() {
    const pal = paletteFor(currentMetric);
    const esPob = isPopulation(currentMetric);

    const { scale, legendCfg } = prepararEscalaYLeyenda(
      tasas,
      METRICAS,
      currentMetric,
      {
        palette: pal,
        titulo: metricLabel(currentMetric),
        excludeIds: ["8888", "9999"],
        idKey: "id",
        clamp: true,
        ...(esPob ? { capAtPercentile: 0.95 } : {})
      }
    );

    g.selectAll("path.alcaldia")
      .transition().duration(350)
      .attr("fill", f => {
        const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || f.properties?.ALCALDIA || "").trim();
        const row = byAlc[nombre];
        if (!row) return COLOR_SIN;
        const v = +row[tasaKey(currentMetric)];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPob && v <= 0) return COLOR_CERO;
        return scale(v);
      });

    legendHost.selectAll("*").remove();
    crearLeyenda(legendHost, legendCfg);
  }

  // ==============================
  // ZOOM + CONTROLES
  // ==============================
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      for (const ctl of ctlPorTipo.values()) ctl.updateZoom(event.transform.k);
    });
  svg.call(zoom);

  renderZoomControles("#mapa-entidad", {
    svg, g, zoom, showHome: true, idsPrefix: "cdmx", escalaMin: 1, escalaMax: 20, paso: 0.5
  });

  // ==============================
  // CAPA DE MARCADORES
  // ==============================
  const gMarcadores = g.append("g").attr("class", "capa-marcadores");
  const ctlPorTipo = new Map();

  async function cargarYPintar(tipo) {
    const ruta = RUTAS_MARCADORES[tipo];
    if (!ruta) return null;

    const raw = await d3.csv(ruta);
    const rawCDMX = raw.filter(esDeCDMXRaw);

    const pts = rawCDMX
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
    // quitar no seleccionados
    for (const [t, ctl] of ctlPorTipo.entries()) {
      if (!setSel.has(t)) { ctl.selection.remove(); ctlPorTipo.delete(t); }
    }
    // agregar nuevos
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
  // ETIQUETAS (alcaldías)
  // ==============================
  const labelsGroup = g.append("g").attr("id", "etiquetas-municipios").style("display", "none");
  const pathGen = d3.geoPath().projection(projection);
  geoData.features.forEach(f => {
    const nombre = (f.properties?.NOMGEO || f.properties?.NOMBRE || f.properties?.ALCALDIA || "").trim();
    if (!nombre) return;
    const [x, y] = pathGen.centroid(f);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, { fontSize: "6px" });
  });

  // ==============================
  // PINTADO INICIAL + TABLA
  // ==============================
  const sel = document.getElementById("sel-metrica");
  if (sel) currentMetric = sel.value || currentMetric;
  recomputeAndPaint();

  generarTablaMunicipios("../data/rate/ciudad-de-mexico.csv");
  habilitarDescargaExcel("ciudad-de-mexico.xlsx");

  if (sel) {
    sel.addEventListener("change", () => {
      currentMetric = sel.value;
      recomputeAndPaint();
    });
  }

  // ==============================
  // SELECTOR DE MARCADORES
  // ==============================
  const items = Object.values(MARCADORES_TIPOS).map(t => ({
    value: t, label: nombreTipoMarcador(t)
  }));
  const marcCtl = renderMarcadoresControl("#control-marcadores", { items, label: "Marcadores", size: 4 });
  marcCtl.setSelected([]);
  marcCtl.onChange(async () => { await updateMarcadores(marcCtl.getSelected()); });

  // ==============================
  // DESCARGAS PNG
  // ==============================
  document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: "Ciudad de México", year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "none";
    setTimeout(() => {
      descargarComoPNG("#mapa-entidad svg", "mapa-ciudad-de-mexico-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT, { titulo });
    }, 100);
  });

  document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: "Ciudad de México", year });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "block";
    setTimeout(() => {
      descargarComoPNG("#mapa-entidad svg", "mapa-ciudad-de-mexico-con-nombres.png", MAP_WIDTH, MAP_HEIGHT, { titulo });
      etiquetas.style.display = "none";
    }, 100);
  });

}).catch(err => console.error("Error en mapa de Ciudad de México:", err));
