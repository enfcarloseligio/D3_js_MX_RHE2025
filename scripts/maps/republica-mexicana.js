// ==============================
// IMPORTACIÓN DE UTILIDADES
// ==============================

import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';

import {
  crearSVGBase,
  MAP_WIDTH,
  MAP_HEIGHT,
  crearLeyenda,
  activarZoomConBotones,
  descargarComoPNG
} from '../utils/config-mapa.js';


// ==============================
// CREACIÓN DEL SVG Y TOOLTIP
// ==============================

// Se crea el SVG con su grupo interno <g>, accesible por screen readers
const { svg, g } = crearSVGBase("#mapa-nacional", "Mapa de distribución nacional de enfermeras");

// Se genera el tooltip flotante reutilizable
const tooltip = crearTooltip();


// ==============================
// CARGA Y RENDERIZADO DE DATOS
// ==============================

Promise.all([
  d3.json("../data/entidades-mx.json"),           // GeoJSON nacional
  d3.csv("../data/tasas-enfermeras-mx.csv")       // CSV nacional
]).then(([geoData, tasas]) => {

  // Se construye un diccionario con los datos del CSV
  const tasaMap = {};
  tasas.forEach(d => {
    const estado = d.estado.trim();
    tasaMap[estado] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  // Escala de colores para las tasas nacionales
  const colorScale = d3.scaleLinear()
    .domain([2.01, 2.39, 2.78, 3.30, 5.89])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  // Configuración de proyección centrada en México
  const projection = d3.geoMercator()
    .scale(1500)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  // Dibuja las entidades federativas
  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const nombre = d.properties.NOMBRE.trim();
      const datos = tasaMap[nombre];
      return datos ? colorScale(datos.tasa) : "#ccc";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMBRE.trim();
      const datos = tasaMap[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, datos); // Muestra tooltip
    })
    .on("mousemove", event => {
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
    dominio: [2.01, 5.89],
    pasos: [2.01, 2.39, 2.78, 3.30, 5.89],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
  });

  // ==============================
  // ZOOM CON BOTONES
  // ==============================

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

}).catch(error => {
  console.error("Error al cargar los datos del mapa nacional:", error);
});


// ==============================
// DESCARGAR COMO PNG
// ==============================

document.getElementById("descargar-png").addEventListener("click", () => {
  descargarComoPNG("#mapa-nacional svg", "mapa-enfermeras-mexico.png", MAP_WIDTH, MAP_HEIGHT);
});
