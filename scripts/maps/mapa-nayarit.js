import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';

// ==============================
// CONFIGURACIÓN DEL MAPA DE NAYARIT
// ==============================

const width = 960;
const height = 600;

const svg = d3.select("#mapa-nayarit")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background-color", "#e6f0f8");

const g = svg.append("g");

const tooltip = crearTooltip();

// ==============================
// CARGA DE DATOS Y RENDERIZADO
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

  const projection = d3.geoMercator().fitSize([width, height], geoData);
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
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      ocultarTooltip(tooltip);
      d3.select(this).attr("stroke-width", 0.5);
    });

  // ==============================
  // LEYENDA
  // ==============================

  const legendWidth = 20;
  const legendHeight = 200;

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

  linearGradient.selectAll("stop")
    .data([
      { offset: "0%", color: '#9b2247' },
      { offset: "25%", color: 'orange' },
      { offset: "50%", color: '#e6d194' },
      { offset: "75%", color: 'green' },
      { offset: "100%", color: 'darkgreen' }
    ])
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  svg.append("rect")
    .attr("x", 30)
    .attr("y", 50)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  const legendScale = d3.scaleLinear()
    .domain([0.76, 5.32])
    .range([legendHeight + 50, 50]);

  const legendAxis = d3.axisRight(legendScale)
    .tickValues([0.76, 1.56, 2.06, 3.45, 5.32])
    .tickFormat(d3.format(".2f"));

  svg.append("g")
    .attr("transform", `translate(${30 + legendWidth}, 0)`)
    .call(legendAxis);

  // ==============================
  // ZOOM INTERACTIVO
  // ==============================

  svg.call(d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", event => {
      g.attr("transform", event.transform);
    }));

}).catch(error => {
  console.error("Error al cargar datos del mapa de Nayarit:", error);
});

// ==============================
// DESCARGAR COMO PNG
// ==============================

document.getElementById("descargar-png").addEventListener("click", function () {
  const svgElement = document.querySelector("#mapa-nayarit svg");
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const width = svgElement.viewBox?.baseVal.width || svgElement.getBoundingClientRect().width;
  const height = svgElement.viewBox?.baseVal.height || svgElement.getBoundingClientRect().height;

  canvas.width = width;
  canvas.height = height;

  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = function () {
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = png;
    a.download = "mapa-enfermeras-nayarit.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  image.src = url;
});
// ==============================
// ZOOM INTERACTIVO CON BOTONES
// ==============================

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", event => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

// Controles manuales
const zoomStep = 0.5;
let currentTransform = d3.zoomIdentity;

svg.call(zoom).on("zoom", (event) => {
  currentTransform = event.transform;
  g.attr("transform", currentTransform);
});

document.getElementById("zoom-in").addEventListener("click", () => {
  svg.transition().call(zoom.scaleBy, 1 + zoomStep);
});

document.getElementById("zoom-out").addEventListener("click", () => {
  svg.transition().call(zoom.scaleBy, 1 - zoomStep);
});

document.getElementById("zoom-reset").addEventListener("click", () => {
  svg.transition().call(zoom.transform, d3.zoomIdentity);
});
