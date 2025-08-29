// scripts/maps/republica-mexicana.js
// ==============================
// IMPORTACIONES
// ==============================
import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';
import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG, crearEtiquetaMunicipio,
  construirTitulo
} from '../utils/config-mapa.js';
import { renderZoomControles } from '../componentes/zoom-controles.js';
import { renderTablaNacional, attachExcelButton } from '../utils/tablas.js';
import { normalizarDataset } from '../utils/normalizacion.js';

// ==============================
// CREACIÓN DEL MAPA
// ==============================
const { svg, g } = crearSVGBase("#mapa-nacional", "Mapa de distribución nacional de enfermeras");
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// ==============================
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json("../data/maps/republica-mexicana.geojson"),
  d3.csv("../data/rate/republica-mexicana.csv")
]).then(([geoData, tasasRaw]) => {

  // ==============================
  // Normalización de columnas (GLOBAL)
  // ==============================
  let tasas = normalizarDataset(tasasRaw, { scope: "nacional", extras: [] });

  // ==============================
  // Diccionario por estado
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
  // Configuración de métricas
  // ==============================
  const COLOR_CERO = '#bfbfbf';
  const COLOR_SIN  = '#d9d9d9';

  const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
  const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];

  const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));

  const METRICAS = {
    tasa_total:       { label: "Tasa total",           tasaKey: "tasa_total",    countKey: "enfermeras_total",   palette: "tasas" },
    tasa_primer:      { label: "Tasa 1er nivel",       tasaKey: "tasa_primer",   countKey: "enfermeras_primer",  palette: "tasas" },
    tasa_segundo:     { label: "Tasa 2º nivel",        tasaKey: "tasa_segundo",  countKey: "enfermeras_segundo", palette: "tasas" },
    tasa_tercer:      { label: "Tasa 3er nivel",       tasaKey: "tasa_tercer",   countKey: "enfermeras_tercer",  palette: "tasas" },
    tasa_apoyo:       { label: "Tasa en apoyo",        tasaKey: "tasa_apoyo",    countKey: "enfermeras_apoyo",   palette: "tasas" },
    tasa_escuelas:    { label: "Tasa en escuelas",     tasaKey: "tasa_escuelas", countKey: "enfermeras_escuelas",palette: "tasas" },
    tasa_no_aplica:   { label: "Tasa no aplica",       tasaKey: "tasa_no_aplica",   countKey: "enfermeras_no_aplica", palette: "tasas" },
    tasa_no_asignado: { label: "Tasa no asignado",     tasaKey: "tasa_no_asignado", countKey: "enfermeras_no_asignado", palette: "tasas" },
    poblacion:        { label: "Población",            tasaKey: "poblacion",     countKey: "poblacion",          palette: "poblacion" }
  };

  let currentMetric = "tasa_total";

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
    const key = METRICAS[metricKey].tasaKey;
    return tasas
      .filter(d => idsEntidades.has(String(d.id)))
      .map(d => +d[key])
      .filter(Number.isFinite);
  }

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

    g.selectAll("path")
      .transition().duration(350)
      .attr("fill", d => {
        const nombre = d.properties.NOMBRE.trim();
        const item = dataByEstado[nombre];
        if (!item) return COLOR_SIN;
        const v = +item[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPoblacion && v <= 0) return COLOR_CERO;
        return colorScale(v);
      });

    legendHost.selectAll("*").remove();

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
  // Proyección y paths
  // ==============================
  const projection = d3.geoMercator()
    .scale(2000)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMBRE.trim();
      const item = dataByEstado[nombre];

      d3.select(this).attr("stroke-width", 1.5);

      const isPob = currentMetric === "poblacion";
      mostrarTooltip(tooltip, event, nombre, item, {
        metricKey: METRICAS[currentMetric].tasaKey,
        label: METRICAS[currentMetric].label,
        onlyPopulation: isPob
      });
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      ocultarTooltip(tooltip);
      d3.select(this).attr("stroke-width", 0.5);
    });

  // Etiquetas (apagadas por default)
  const labelsGroup = g.append("g")
    .attr("id", "etiquetas-municipios")
    .style("display", "none");

  const nombresUnicos = new Set();
  geoData.features.forEach(d => {
    const nombre = d.properties.NOMBRE.trim();
    if (nombresUnicos.has(nombre)) return;
    const [x, y] = path.centroid(d);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, { fontSize: "6px" });
    nombresUnicos.add(nombre);
  });

  // Primera renderización (mapa)
  recomputeAndPaint();

  // Inyecta y conecta los controles de zoom
  renderZoomControles("#mapa-nacional", {
    svg,
    g,
    showHome: false,
    escalaMin: 1,
    escalaMax: 8,
    paso: 0.5
  });

  // ==============================
  // TABLA NACIONAL (usa utils/tablas.js)
  // ==============================
  const tablaNac = renderTablaNacional({
    data: tasas,              // CSV normalizado
    METRICAS,                 // objeto de métricas del mapa
    metricKey: currentMetric, // ej. 'tasa_total'
    hostSelector: "#tabla-contenido"
  });

  attachExcelButton({
    buttonSelector: "#descargar-excel",
    filenameBase: "enfermeras-nacional.xlsx",
    sheetName: "Resumen"
  });

  // Sincronizar selector: mapa + tabla
  const sel = document.getElementById("sel-metrica");
  if (sel) {
    sel.addEventListener("change", () => {
      currentMetric = sel.value;
      recomputeAndPaint();           // mapa
      tablaNac.update(currentMetric); // tabla
    });
  }

  // ==============================
  // DESCARGA PNG
  // ==============================
  document.getElementById("descargar-sin-etiquetas").addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: null, year: 2025 });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "none";
    setTimeout(() => {
      descargarComoPNG(
        "#mapa-nacional svg",
        "mapa-enfermeras-mexico-sin-nombres.png",
        MAP_WIDTH,
        MAP_HEIGHT,
        { titulo }
      );
    }, 100);
  });

  document.getElementById("descargar-con-etiquetas").addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: null, year: 2025 });
    const etiquetas = document.getElementById("etiquetas-municipios");
    if (etiquetas) etiquetas.style.display = "block";
    setTimeout(() => {
      descargarComoPNG(
        "#mapa-nacional svg",
        "mapa-enfermeras-mexico-con-nombres.png",
        MAP_WIDTH,
        MAP_HEIGHT,
        { titulo }
      );
      etiquetas.style.display = "none";
    }, 100);
  });

}).catch(error => {
  console.error("Error al cargar los datos del mapa nacional:", error);
});
