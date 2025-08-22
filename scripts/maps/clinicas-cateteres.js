// scripts/maps/clinicas-cateteres.js
// ==============================
// IMPORTACIONES
// ==============================
import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';
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

// Helpers para valores del tooltip
const safe = v => (v != null && String(v).trim() !== "" ? String(v).trim() : "N/D");
const fmt6 = n => (Number.isFinite(n) ? Number(n).toFixed(6) : "N/D");

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

  // --- Escala de color (misma que en tu página nacional) ---
  const colorScale = d3.scaleLinear()
    .domain([2.01, 2.39, 2.78, 3.30, 5.89])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  // --- Proyección a México completa ---
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
      tooltip.style("left", (event.pageX + 10) + "px")
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

  // --- Controles (zoom + botón hogar) ---
  inyectarControlesBasicos(svg, g, "../entidades/republica-mexicana.html");

  // ============================================================
  // =============== CAPA DE MARCADORES DE CLÍNICAS =============
  // ============================================================
  const puntos = clinicas.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
  const gMarcadores = g.append("g").attr("class", "capa-clinicas");

  gMarcadores.selectAll("circle")
    .data(puntos)
    .enter()
    .append("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", 5)
    .attr("fill", "#1e5b4f")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.1)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#002f2a").attr("stroke-width", 1.6);

      // Construye un objeto con el orden solicitado
      const datosClinica = {
        "CLUES": safe(d.clues),
        "Institución": safe(d.institucion),
        "Entidad": safe(d.entidad),
        "Municipio": safe(d.municipio),
        "Localidad": safe(d.localidad),
        "Latitud": fmt6(d.lat),
        "Longitud": fmt6(d.lon)
      };

      // Usa tu helper para mostrar el tooltip
      mostrarTooltip(tooltip, event, "Clínica de catéter", datosClinica);
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#1e5b4f").attr("stroke-width", 1.1);
      ocultarTooltip(tooltip);
    });

}).catch(err => {
  console.error("Error al cargar el mapa de clínicas:", err);
});
