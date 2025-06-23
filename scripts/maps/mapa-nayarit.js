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
  d3.json("../data/entidades/mapa-nayarit.json"),
  d3.csv("../data/tasas/tasas-enfermeras-nayarit.csv")
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

  const colorScale = d3.scaleLinear()
    .domain([0.76, 1.55, 2.06, 3.45, 5.32])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  const projection = d3.geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geoData);
  const path = d3.geoPath().projection(projection);

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

  // ==============================
  // ETIQUETAS DE MUNICIPIOS
  // ==============================

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

  // ==============================
  // LEYENDA
  // ==============================

  crearLeyenda(svg, {
    dominio: [0.76, 5.32],
    pasos: [0.76, 1.56, 2.06, 3.45, 5.32],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
  });

  // ==============================
  // CONTROLES (Zoom + Casa)
  // ==============================

  inyectarControlesBasicos(svg, g, "../entidades/republica-mexicana.html");

}).catch(error => {
  console.error("Error al cargar datos del mapa de Nayarit:", error);
});

// ==============================
// DESCARGA DE IMÁGENES PNG
// ==============================

document.getElementById("descargar-sin-etiquetas").addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "none";

  setTimeout(() => {
    descargarComoPNG("#mapa-nayarit svg", "mapa-enfermeras-nayarit-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT);
  }, 100);
});

document.getElementById("descargar-con-etiquetas").addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "block";

  setTimeout(() => {
    descargarComoPNG("#mapa-nayarit svg", "mapa-enfermeras-nayarit-con-nombres.png", MAP_WIDTH, MAP_HEIGHT);
    if (etiquetas) etiquetas.style.display = "none";
  }, 100);
});
// ==============================
// CARGA DE TABLA DE DATOS
// ==============================

d3.csv("../data/tasas/tasas-enfermeras-nayarit.csv").then(data => {
  const contenedor = document.getElementById("tabla-contenido");

  if (!contenedor) return;

  const tabla = document.createElement("table");
  tabla.classList.add("tabla-datos");

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Municipio</th>
      <th>Población</th>
      <th>Enfermeras</th>
      <th>Tasa</th>
    </tr>
  `;
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");
data.forEach(d => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="municipio">${d.municipio}</td>
    <td class="numero">${(+d.población).toLocaleString('es-MX')}</td>
    <td class="numero">${(+d.enfermeras).toLocaleString('es-MX')}</td>
    <td class="numero">${parseFloat(d.tasa).toFixed(2)}</td>
  `;
  tabla.appendChild(row);
});

  tabla.appendChild(tbody);
  contenedor.appendChild(tabla);
});
