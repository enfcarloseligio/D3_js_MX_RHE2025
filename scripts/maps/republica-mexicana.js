// scripts/maps/republica-mexicana.js

// ==============================
// IMPORTACIONES
// ==============================
import {
  crearTooltip,
  mostrarTooltip,
  ocultarTooltip,
  mostrarTooltipClinica, // tooltip estándar para clínicas (como en catéteres)
} from '../utils/tooltip.js';

import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, descargarComoPNG, crearEtiquetaMunicipio,
  construirTitulo,
  prepararEscalaYLeyenda // ← añadido: helper para cortes equidistantes
} from '../utils/config-mapa.js';

import { renderZoomControles } from '../componentes/zoom-controles.js';
import { renderTablaNacional, attachExcelButton } from '../utils/tablas.js';
import { normalizarDataset } from '../utils/normalizacion.js';
import { urlEntidad } from '../utils/enlaces.js';

// Selector multi de marcadores + rutas/normalizador + estilos/leyenda
import { renderMarcadoresControl } from '../componentes/marcadores-control.js';
import { RUTAS_MARCADORES, normalizarClinicaRow } from '../utils/marcadores.config.js';
import {
  MARCADORES_TIPOS,
  pintarMarcadores,
  crearLeyendaMarcadores,
  nombreTipoMarcador
} from '../utils/marcadores.js';

// ==============================
// CREACIÓN DEL MAPA
// ==============================
const { svg, g } = crearSVGBase("#mapa-nacional", "Mapa de distribución nacional de enfermeras");
const tooltip = crearTooltip();
const legendHost = svg.append("g").attr("id", "legend-host");

// ==============================
// CONSTANTES / CONFIG
// ==============================
const COLOR_CERO = '#bfbfbf';   // 0.00 (solo para tasas)
const COLOR_SIN  = '#d9d9d9';   // s/d

const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen'];
const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'];

// ids válidos de entidad para el cálculo de cuartiles (1..32)
const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));

// Definición de métricas
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
  d3.json("../data/maps/republica-mexicana.geojson"),
  d3.csv("../data/rate/republica-mexicana.csv")
]).then(([geoData, tasasRaw]) => {

  // === Año dinámico ===
  const year = new Date().getFullYear();
  document.querySelectorAll(".year").forEach(el => el.textContent = year);

  // === Total nacional (fila id=9999 del CSV crudo) ===
  const fila9999 = tasasRaw.find(d => String(d.id) === "9999");
  const totalNacional = fila9999
    ? (Number(fila9999.enfermeras_total ?? fila9999.enfermeras) || 0)
    : 0;
  const spanTotalNac = document.getElementById("total-enfermeras-nac");
  if (spanTotalNac) spanTotalNac.textContent = totalNacional.toLocaleString("es-MX");

  // === Número de entidades federativas: auto + respaldo manual (32) ===
  const NUM_ENTIDADES_FED = 32;
  function contarEntidadesFederativas(geo) {
    try {
      const nombresUnicos = new Set(
        (geo?.features ?? [])
          .map(f => (f.properties?.NOMBRE || f.properties?.nom_ent || "").trim())
          .filter(Boolean)
      );
      const n = nombresUnicos.size;
      // si luce razonable (20–40), usa ese valor; si no, fija 32
      return n >= 20 && n <= 40 ? n : NUM_ENTIDADES_FED;
    } catch {
      return NUM_ENTIDADES_FED;
    }
  }
  const numEntidades = contarEntidadesFederativas(geoData);
  const spanEnt = document.getElementById("total-entidades");
  if (spanEnt) spanEnt.textContent = numEntidades.toLocaleString("es-MX");

  // (Opcional) Título SEO dinámico con año
  document.title = `SIARHE | Distribución de Profesionales de Enfermería en México ${year}`;

  // ==============================
  // Normalización (GLOBAL)
  // ==============================
  const tasas = normalizarDataset(tasasRaw, { scope: "nacional", extras: [] });

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
  // Utilidad: paleta por métrica (se mantiene)
// ==============================
  function paletteFor(metricKey) {
    const pal = METRICAS[metricKey].palette;
    return pal === "poblacion" ? COLORES_POBLACION : COLORES_TASAS;
  }

  // ==============================
  // Pintado + leyenda (EQUI-DISTANTE con helper)
// ==============================
  function recomputeAndPaint() {
    const PALETTE = paletteFor(currentMetric);
    const esPoblacion = currentMetric === "poblacion";

    // Cortes equidistantes min–s1–s2–s3–max y escala alineada con la leyenda
    const { scale, legendCfg } = prepararEscalaYLeyenda(
      // datos base:
      tasas.filter(d => idsEntidades.has(String(d.id))), // solo 1..32 para calcular rango
      METRICAS,
      currentMetric,
      // opciones:
      {
        palette: PALETTE,                     // ← mantiene tus colores
        titulo: METRICAS[currentMetric].label,
        idKey: "id",
        excludeIds: ["8888", "9999"],         // por si vienen en el CSV
        clamp: true                           // fuera de rango → extremo
        // sin P95: usa min/max reales; el helper hace tramos equidistantes
      }
    );

    // Pintado del mapa usando EXACTAMENTE la misma escala que la leyenda
    g.selectAll("path.estado")
      .transition().duration(350)
      .attr("fill", d => {
        const nombre = (d.properties.NOMBRE || "").trim();
        const item = dataByEstado[nombre];
        if (!item) return COLOR_SIN;
        const v = +item[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN;
        if (!esPoblacion && v <= 0) return COLOR_CERO; // 0.00 en gris
        return scale(v);
      });

    // Leyenda
    legendHost.selectAll("*").remove();
    crearLeyenda(legendHost, legendCfg);
  }

  // ==============================
  // Proyección y paths (doble clic -> entidad)
  // ==============================
  const projection = d3.geoMercator()
    .scale(2000)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  let ultimoClick = 0;

  g.selectAll("path.estado")
    .data(geoData.features)
    .join("path")
    .attr("class", "estado")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("fill", COLOR_SIN) // por si la primera pintura tarda
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
    })
    .on("click", function (event, d) {
      const ahora = Date.now();
      if (ahora - ultimoClick < 350) {
        const nombre = (d.properties.NOMBRE || "").trim();
        const href = urlEntidad(nombre);
        if (href) window.location.href = href;
      }
      ultimoClick = ahora;
    });

  // ==============================
  // CAPA DE MARCADORES (multi-tipo)
  // ==============================
  const gMarcadores = g.append("g").attr("class", "capa-marcadores");
  let marcadoresCtlPorTipo = new Map(); // tipo -> controlador pintarMarcadores

  // Carga un CSV por tipo, normaliza y pinta; devuelve controlador
  async function cargarYPintarTipo(tipo) {
    const ruta = RUTAS_MARCADORES[tipo];
    if (!ruta) return null;

    const raw = await d3.csv(ruta);
    const puntos = raw
      .map(d => normalizarClinicaRow(d, tipo))
      .filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));

    const ctl = pintarMarcadores(gMarcadores, puntos, projection, { tipo });

    // Tooltips de clínica: MISMA VISTA que “Clínicas de catéteres”
    ctl.selection
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

    return ctl;
  }

  // Actualiza marcadores según selección (añade/quita y actualiza leyenda)
  async function updateMarcadores(tiposSeleccionados = []) {
    const setSel = new Set(tiposSeleccionados);

    // Remover tipos que ya no están seleccionados
    for (const [tipo, ctl] of marcadoresCtlPorTipo.entries()) {
      if (!setSel.has(tipo)) {
        ctl.selection.remove();
        marcadoresCtlPorTipo.delete(tipo);
      }
    }

    // Cargar/pintar los nuevos tipos seleccionados
    for (const tipo of setSel) {
      if (!marcadoresCtlPorTipo.has(tipo)) {
        const ctl = await cargarYPintarTipo(tipo);
        if (ctl) marcadoresCtlPorTipo.set(tipo, ctl);
      }
    }

    // Leyenda de marcadores (posición abajo-izquierda)
    const tiposPresentes = Array.from(marcadoresCtlPorTipo.keys());
    svg.selectAll(".leyenda-marcadores").remove();
    if (tiposPresentes.length) {
      crearLeyendaMarcadores(svg, tiposPresentes, {
        x: 30,
        y: MAP_HEIGHT - 110,
        title: "Marcadores",
        dx: 0,
        dyStep: 18
      });
    }
  }

  // ==============================
  // ZOOM (y tamaño visual estable de marcadores)
  // ==============================
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      // reescala cada capa de marcadores activa
      for (const ctl of marcadoresCtlPorTipo.values()) {
        ctl.updateZoom(event.transform.k);
      }
    });

  svg.call(zoom);

  // Controles de zoom (sin “home”, esta vista es el home)
  renderZoomControles("#mapa-nacional", {
    svg,
    g,
    zoom,            // conecta botones al mismo zoom
    showHome: false, // sin botón home
    idsPrefix: "rep",
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
// --- SELECTOR + TABLA SINCRONIZADOS ---
  // ==============================
  const selMetrica = document.getElementById("sel-metrica");
  if (selMetrica) currentMetric = selMetrica.value || currentMetric;

  // Primera pintura del mapa con la métrica actual
  recomputeAndPaint();

  // TABLA NACIONAL (creación)
  const tablaNac = renderTablaNacional({
    data: tasas,
    METRICAS,
    metricKey: currentMetric,
    hostSelector: "#tabla-contenido"
  });

  // === DESCARGA DE EXCEL DINÁMICA (según indicador actual, sin listeners duplicados) ===
  function resetExcelButtonListener() {
    const btn = document.querySelector("#descargar-excel");
    if (!btn) return;
    const clone = btn.cloneNode(true);          // sin listeners
    btn.parentNode.replaceChild(clone, btn);    // reemplaza
  }

  function actualizarDescargaExcel() {
    const metric = METRICAS[currentMetric] || { label: currentMetric };
    const nombreArchivo = `enfermeras-${currentMetric}.xlsx`;
    const nombreHoja = metric.label;

    resetExcelButtonListener(); // limpia listeners previos
    attachExcelButton({
      buttonSelector: "#descargar-excel",
      filenameBase: nombreArchivo,
      sheetName: nombreHoja
    });
  }

  // Inicializa con la métrica vigente
  actualizarDescargaExcel();

  // Cuando cambias el indicador: repinta, actualiza tabla y reconfigura Excel
  if (selMetrica) {
    selMetrica.addEventListener("change", () => {
      currentMetric = selMetrica.value;
      recomputeAndPaint();
      tablaNac.update(currentMetric);
      actualizarDescargaExcel();
    });
  }

  // ==============================
  // SELECTOR DE MARCADORES
  // ==============================
  const itemsMarcadores = Object.values(MARCADORES_TIPOS).map(t => ({
    value: t,
    label: nombreTipoMarcador(t)
  }));

  const marcCtl = renderMarcadoresControl("#control-marcadores", {
    items: itemsMarcadores,
    label: "Marcadores",
    size: 4
  });

  // Por defecto, sin marcadores seleccionados
  marcCtl.setSelected([]);

  marcCtl.onChange(async () => {
    const seleccion = marcCtl.getSelected();
    await updateMarcadores(seleccion);
  });

  // ==============================
  // DESCARGA PNG
  // ==============================
  document.getElementById("descargar-sin-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: null, year });
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

  document.getElementById("descargar-con-etiquetas")?.addEventListener("click", () => {
    const titulo = construirTitulo(currentMetric, { entidad: null, year });
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
