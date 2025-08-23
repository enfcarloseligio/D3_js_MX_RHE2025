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
  crearLeyenda, inyectarControlesBasicos
} from '../utils/config-mapa.js';

// ==============================
// CREAR SVG + TOOLTIP
// ==============================
const { svg, g } = crearSVGBase("#mapa-clinicas", "Mapa nacional de tasa de enfermeras (base)");
const tooltip = crearTooltip();

// Parser para números (permite comas decimales)
const toNum = v => {
  if (v == null) return NaN;
  const n = +String(v).trim().replace(",", ".");
  return Number.isFinite(n) ? n : NaN;
};

// ==============================
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json("../data/maps/republica-mexicana.geojson"),
  d3.csv("../data/rate/republica-mexicana.csv"),
  d3.csv("../data/clinicas/clinicas-cateteres.csv", d => ({
    lat: toNum(d.lat ?? d.LATITUD ?? d.Latitud),
    lon: toNum(d.lon ?? d.LONGITUD ?? d.Longitud),
    clues: d.clues ?? d.CLUES ?? "",
    institucion: d.institucion ?? d.INSTITUCION ?? d.Institucion ?? "",
    entidad: (d.entidad ?? d.Entidad ?? d.ESTADO ?? d.estado ?? "").trim(),
    municipio: (d.municipio ?? d.MUNICIPIO ?? d.mpo ?? "").trim(),
    localidad: (d.localidad ?? d.LOCALIDAD ?? "").trim()
  }))
]).then(([geoData, tasas, clinicas]) => {
  // --- Mapa (estado -> {tasa, poblacion, enfermeras}) ---
  const tasaMap = {};
  tasas.forEach(d => {
    const estado = (d.estado || d.Estado || "").trim();
    tasaMap[estado] = {
      tasa: +d.tasa,
      poblacion: +d.población || +d.poblacion || NaN,
      enfermeras: +d.enfermeras || NaN
    };
  });

  // --- Escala de color (igual que en tu página nacional) ---
  const colorScale = d3.scaleLinear()
    .domain([2.01, 2.39, 2.78, 3.30, 5.89])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  // --- Proyección México (coincidente con tu base) ---
  const projection = d3.geoMercator()
    .scale(2000)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  // --- Dibujo de entidades (coroplético) ---
  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const nombre = (d.properties.NOMBRE || "").trim();
      const dato = tasaMap[nombre];
      return dato ? colorScale(dato.tasa) : "#ccc";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const nombre = (d.properties.NOMBRE || "").trim();
      const datos = tasaMap[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, datos);
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

  // --- Leyenda del coroplético ---
  crearLeyenda(svg, {
    dominio: [2.01, 5.89],
    pasos: [2.01, 2.39, 2.78, 3.30, 5.89],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
  });

  // --- Controles (zoom + botón hogar a la nacional) ---
  inyectarControlesBasicos(svg, g, "../entidades/republica-mexicana.html");

  // ============================================================
  // =============== CAPA DE MARCADORES DE CLÍNICAS =============
  // ============================================================
  const puntos = clinicas.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
  if (!puntos.length) {
    console.warn("No hay coordenadas válidas en ../data/clinicas/clinicas-cateteres.csv");
  }

  const gMarcadores = g.append("g").attr("class", "capa-clinicas");
  gMarcadores.raise(); // asegúralo por encima de la capa de entidades

  const RADIO_BASE = 5;
  const STROKE_BASE = 1.1;

  gMarcadores.selectAll("circle")
    .data(puntos)
    .enter()
    .append("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", RADIO_BASE)
    .attr("fill", "#1e5b4f")           // verde institucional
    .attr("stroke", "#fff")
    .attr("stroke-width", STROKE_BASE)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      // Evita que el path del estado "pise" el tooltip del punto
      event.stopPropagation();
      d3.select(this).attr("fill", "#002f2a").attr("stroke-width", STROKE_BASE * 1.45);
      mostrarTooltipClinica(tooltip, event, d);  // tooltip especializado de clínica
    })
    .on("mousemove", function (event) {
      event.stopPropagation();
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function (event) {
      event.stopPropagation();
      d3.select(this).attr("fill", "#1e5b4f").attr("stroke-width", STROKE_BASE);
      ocultarTooltip(tooltip);
    });

  // ==============================
  // ZOOM con círculos dinámicos
  // ==============================
  const zoom = d3.zoom()
    .scaleExtent([1, 20])            // nivel mínimo y máximo de zoom
    .on("zoom", (event) => {
      // aplica el zoom a todo el grupo g (estados + marcadores)
      g.attr("transform", event.transform);

      // Ajusta tamaño de círculos y grosor de borde inversamente al zoom
      const k = event.transform.k;
      gMarcadores.selectAll("circle")
        .attr("r", RADIO_BASE / k)
        .attr("stroke-width", STROKE_BASE / k);
    });

  // Vincula el zoom al SVG (convive con los controles existentes)
  svg.call(zoom);

}).catch(err => {
  console.error("Error al cargar el mapa de clínicas:", err);
});
