// ==============================
// IMPORTACIÓN DE UTILIDADES
// ==============================

import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';
import {
  crearSVGBase,
  MAP_WIDTH,
  MAP_HEIGHT,
  crearLeyenda,
  descargarComoPNG,
  crearEtiquetaMunicipio,
  inyectarControlesBasicos
} from '../utils/config-mapa.js';

// ==============================
// CREACIÓN DEL SVG Y TOOLTIP
// ==============================

const { svg, g } = crearSVGBase("#mapa-nayarit", "Mapa de distribución de enfermeras en el Estado de Nayarit");
const tooltip = crearTooltip();

// ==============================
// CARGA DE DATOS Y DIBUJO DEL MAPA
// ==============================

Promise.all([
  d3.json("../data/maps/nayarit.geojson"),
  d3.csv("../data/rate/nayarit.csv")
]).then(([geoData, tasas]) => {

  const tasaMap = {};
  tasas.forEach(d => {
    const nombre = d.municipio.trim();
    tasaMap[nombre] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  // Insertar total de enfermeras si hay fila con id = 9999
  const total = tasas.find(d => d.id === "9999");
  if (total) {
    const spanTotal = document.getElementById("total-enfermeras");
    if (spanTotal) spanTotal.textContent = Number(total.enfermeras).toLocaleString("es-MX");
  }

  const colorScale = d3.scaleLinear()
    .domain([0.76, 1.55, 2.06, 3.45, 5.32])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  const projection = d3.geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geoData);
  const path = d3.geoPath().projection(projection);

  g.attr("transform", "scale(1.0) translate(0,0)");

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

  // Etiquetas
  const labelsGroup = g.append("g")
    .attr("id", "etiquetas-municipios")
    .style("display", "none");

  geoData.features.forEach(d => {
    const nombre = d.properties.NOMGEO.trim();
    const [x, y] = path.centroid(d);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, {
      fontSize: "11px"
    });
  });

  // Leyenda
  crearLeyenda(svg, {
    dominio: [0.76, 5.32],
    pasos: [0.76, 1.56, 2.06, 3.45, 5.32],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
  });

  // Controles
  inyectarControlesBasicos(svg, g, "../entidades/republica-mexicana.html");

}).catch(error => {
  console.error("Error al cargar datos del mapa de Nayarit:", error);
});

// ==============================
// DESCARGA DE IMÁGENES PNG
// ==============================

const nombreEntidadArchivo = location.pathname.split("/").pop().replace(".html", "");
const nombreEntidad = nombreEntidadArchivo
  .split("-")
  .map(p => p.charAt(0).toUpperCase() + p.slice(1))
  .join(" ");

document.getElementById("descargar-sin-etiquetas").addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "none";
  setTimeout(() => {
    descargarComoPNG("#mapa-nayarit svg", `mapa-enfermeras-${nombreEntidadArchivo}-sin-nombres.png`, MAP_WIDTH, MAP_HEIGHT, nombreEntidad);
  }, 100);
});

document.getElementById("descargar-con-etiquetas").addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "block";
  setTimeout(() => {
    descargarComoPNG("#mapa-nayarit svg", `mapa-enfermeras-${nombreEntidadArchivo}-con-nombres.png`, MAP_WIDTH, MAP_HEIGHT, nombreEntidad);
    if (etiquetas) etiquetas.style.display = "none";
  }, 100);
});
