// ==============================
// IMPORTACIÓN DE UTILIDADES
// ==============================

import {
  crearTooltip,
  mostrarTooltip,
  ocultarTooltip
} from '../utils/tooltip.js';

import {
  crearSVGBase,
  MAP_WIDTH,
  MAP_HEIGHT,
  crearLeyenda,
  descargarComoPNG,
  activarZoomConBotones
} from '../utils/config-mapa.js';


// ==============================
// CREACIÓN DEL SVG Y TOOLTIP
// ==============================

const { svg, g } = crearSVGBase("#mapa-nacional", "Mapa de distribución nacional de enfermeras");

const tooltip = crearTooltip();


// ==============================
// CARGA Y RENDERIZADO DE DATOS
// ==============================

Promise.all([
  d3.json("../data/entidades-mx.json"),
  d3.csv("../data/tasas-enfermeras-mx.csv")
]).then(([geoData, tasas]) => {

  const tasaMap = {};
  tasas.forEach(d => {
    const estado = d.estado.trim();
    tasaMap[estado] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  const colorScale = d3.scaleLinear()
    .domain([2.01, 2.39, 2.78, 3.30, 5.89])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  const projection = d3.geoMercator()
    .scale(1500)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

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

  // Leyenda
  crearLeyenda(svg, {
    dominio: [2.01, 5.89],
    pasos: [2.01, 2.39, 2.78, 3.30, 5.89],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
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
