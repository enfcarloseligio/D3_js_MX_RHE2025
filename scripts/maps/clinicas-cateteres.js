// scripts/maps/clinicas-cateteres.js

// ==============================
// IMPORTACIONES
// ==============================
import {
  crearTooltip,
  mostrarTooltip,
  ocultarTooltip,
  mostrarTooltipClinica
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG, crearEtiquetaMunicipio,
  construirTituloClinicas,
  prepararEscalaYLeyenda // ← helper para escala + leyenda equidistante
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';
import { renderTablaNacional, attachExcelButton } from '../utils/tablas.js';
import { normalizarDataset } from '../utils/normalizacion.js';

import {
  pintarMarcadores,
  MARCADORES_TIPOS
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

// ← Tus paletas se mantienen idénticas
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
const RUTA_CLINICAS = "../data/clinicas/clinicas-cateteres.csv";

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
  const tasas = normalizarDataset(tasasRaw, { scope: "nacional", extras: [] })
    // Solo estados 1..32 (evita filas TOTAL/otros ids)
    .filter(d => idsEntidades.has(String(d.id)));

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
  // Pintado + leyenda (con helpers)
// ==============================
  function paletteFor(metricKey) {
    return METRICAS[metricKey].palette === "poblacion"
      ? COLORES_POBLACION
      : COLORES_TASAS;
  }

  function recomputeAndPaint() {
    const PALETTE = paletteFor(currentMetric);
    const esPoblacion = currentMetric === "poblacion";

    // Helper centralizado: calcula escala y config de leyenda con
    // cortes E Q U I D I S T A N T E S min–s1–s2–s3–max a partir de los datos
    const { scale, legendCfg } = prepararEscalaYLeyenda(
      tasas,
      METRICAS,
      currentMetric,
      {
        palette: PALETTE,          // ← tus colores
        titulo: METRICAS[currentMetric].label,
        idKey: "id",
        excludeIds: ["8888","9999"], // ignora TOTAL u otros
        clamp: true,                 // valores fuera de rango se capean al extremo
        // sin P95: se usa min y max reales del conjunto 1..32
        // y con cortes equidistantes generados por el helper
      }
    );

    // Pintado consistente con la leyenda
    estados.transition().duration(350)
      .attr("fill", d => {
        const nombre = (d.properties.NOMBRE || "").trim();
        const item = dataByEstado[nombre];
        if (!item) return COLOR_SIN;
        const v = +item[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPoblacion && v <= 0) return COLOR_CERO; // 0.00 en gris
        return scale(v);
      });

    // Leyenda: el helper ya trae los mismos cortes usados por la escala
    legendHost.selectAll("*").remove();
    crearLeyenda(legendHost, legendCfg);
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

  // Tooltip de clínicas
  marcadoresCtl.selection
    .on("mouseover", function (event, d) {
      event.stopPropagation();
      mostrarTooltipClinica(tooltip, event, d);
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

  // ======= LEYENDA DE MARCADORES (chip dinámico) =======
  function dibujarLeyendaMarcadores() {
    svg.selectAll(".leyenda-marcadores").remove();

    // Toma los estilos reales del primer marcador para garantizar coincidencia
    const sampleNode = marcadoresCtl.selection.node();
    const fill   = sampleNode ? sampleNode.getAttribute("fill")   : "#0a7a56";
    const stroke = sampleNode ? sampleNode.getAttribute("stroke") : "#0b2e2e";

    const root = svg.append("g")
      .attr("class", "leyenda-marcadores")
      .attr("transform", `translate(${30}, ${MAP_HEIGHT - 110})`);

    // Título
    root.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-size", "13px")
      .attr("font-weight", "700")
      .style("font-family", "'Noto Sans', sans-serif")
      .text("Marcadores");

    // Ítem
    const item = root.append("g").attr("transform", "translate(0, 16)");
    item.append("circle")
      .attr("cx", 8).attr("cy", 6).attr("r", 6)
      .attr("fill", fill)
      .attr("stroke", stroke)
      .attr("stroke-width", 1.5);

    item.append("text")
      .attr("x", 22).attr("y", 10)
      .attr("font-size", "12px")
      .style("font-family", "'Noto Sans', sans-serif")
      .text("Clínicas de catéteres");
  }

  dibujarLeyendaMarcadores();

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

  // Botones conectados
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
  // TABLA NACIONAL
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
