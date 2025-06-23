// ==============================
// IMPORTACIÓN DE UTILIDADES
// ==============================

import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';

import {
  crearSVGBase,           // Crea el contenedor SVG y grupo <g>
  MAP_WIDTH,              // Ancho del SVG estándar
  MAP_HEIGHT,             // Alto del SVG estándar
  crearLeyenda,           // Genera una leyenda visual
  activarZoomConBotones,  // Activa botones de zoom personalizados
  descargarComoPNG        // Convierte el SVG en imagen PNG descargable
} from '../utils/config-mapa.js';


// ==============================
// CREACIÓN DEL SVG Y TOOLTIP
// ==============================

// Se inserta un SVG dentro del contenedor con id #mapa-nayarit
const { svg, g } = crearSVGBase("#mapa-nayarit", "Mapa de distribución de enfermeras en el Estado de Nayarit");

// Crea un tooltip flotante reutilizable
const tooltip = crearTooltip();


// ==============================
// CARGA DE DATOS Y DIBUJO DEL MAPA
// ==============================

Promise.all([
  d3.json("../data/entidades/mapa-nayarit.json"),                      // GeoJSON del estado
  d3.csv("../data/tasas/tasas-enfermeras-nayarit.csv")                 // CSV con tasas por municipio
]).then(([geoData, tasas]) => {

  // Se construye un diccionario con los datos del CSV
  const tasaMap = {};
  tasas.forEach(d => {
    const nombre = d.municipio.trim();
    tasaMap[nombre] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  // Escala de colores para las tasas
  const colorScale = d3.scaleLinear()
    .domain([0.76, 1.55, 2.06, 3.45, 5.32])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  // Configura proyección geográfica y genera path
  const projection = d3.geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geoData);
  const path = d3.geoPath().projection(projection);

  // Dibuja los municipios del estado
  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const nombre = d.properties.NOMGEO.trim();
      const datos = tasaMap[nombre];
      return datos ? colorScale(datos.tasa) : "#ccc";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMGEO.trim();
      const datos = tasaMap[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, datos); // Muestra tooltip
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      ocultarTooltip(tooltip); // Oculta tooltip
      d3.select(this).attr("stroke-width", 0.5);
    });

  // ==============================
  // LEYENDA GRADIENTE
  // ==============================

  crearLeyenda(svg, {
    dominio: [0.76, 5.32],
    pasos: [0.76, 1.56, 2.06, 3.45, 5.32],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
  });

  // ==============================
  // ZOOM CON BOTONES PERSONALIZADOS
  // ==============================

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

}).catch(error => {
  console.error("Error al cargar datos del mapa de Nayarit:", error);
});


// ==============================
// DESCARGAR COMO PNG
// ==============================

document.getElementById("descargar-png").addEventListener("click", () => {
  descargarComoPNG("#mapa-nayarit svg", "mapa-enfermeras-nayarit.png", MAP_WIDTH, MAP_HEIGHT);
});
