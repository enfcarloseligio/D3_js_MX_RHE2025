// ==============================
// CONFIGURACIÓN GLOBAL PARA MAPAS DE ENTIDADES
// ==============================

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 600;
export const MAP_BACKGROUND = "#e6f0f8";

/**
 * Crea un SVG base con un grupo <g> dentro de un contenedor.
 * @param {string} selector - Selector del contenedor donde se inyectará el SVG.
 * @returns {object} - Objeto con referencias a { svg, g }
 */
export function crearSVGBase(selector) {
  const svg = d3.select(selector)
    .append("svg")
    .attr("width", MAP_WIDTH)
    .attr("height", MAP_HEIGHT)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .style("background-color", MAP_BACKGROUND);

  const g = svg.append("g");

  return { svg, g };
}

/**
 * Crea una leyenda de colores gradiente para mapas.
 * @param {object} svg - Elemento SVG donde se añadirá la leyenda.
 * @param {object} opciones - Configuración de la leyenda.
 */
export function crearLeyenda(svg, {
  dominio,
  pasos,
  colores,
  posicion = { x: 30, y: 50, ancho: 20, alto: 200 },
  id = "legend-gradient"
}) {
  const { x, y, ancho, alto } = posicion;

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", id)
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

  linearGradient.selectAll("stop")
    .data(pasos.map((val, i) => ({
      offset: `${(i / (pasos.length - 1)) * 100}%`,
      color: colores[i]
    })))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  svg.append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", ancho)
    .attr("height", alto)
    .style("fill", `url(#${id})`);

  const escala = d3.scaleLinear()
    .domain([dominio[0], dominio[1]])
    .range([y + alto, y]);

  const eje = d3.axisRight(escala)
    .tickValues(pasos)
    .tickFormat(d3.format(".2f"));

  svg.append("g")
    .attr("transform", `translate(${x + ancho}, 0)`)
    .call(eje);
}

/**
 * Habilita controles de zoom con botones personalizados.
 * @param {object} svg - Elemento SVG.
 * @param {object} g - Grupo <g> transformable.
 * @param {object} config - Selectores y opciones.
 */
export function activarZoomConBotones(svg, g, {
  selectorZoomIn = "#zoom-in",
  selectorZoomOut = "#zoom-out",
  selectorZoomReset = "#zoom-reset",
  escalaMin = 1,
  escalaMax = 8,
  paso = 0.5
} = {}) {
  const zoom = d3.zoom()
    .scaleExtent([escalaMin, escalaMax])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      currentTransform = event.transform;
    });

  svg.call(zoom);

  let currentTransform = d3.zoomIdentity;

  document.querySelector(selectorZoomIn)?.addEventListener("click", () => {
    svg.transition().call(zoom.scaleBy, 1 + paso);
  });

  document.querySelector(selectorZoomOut)?.addEventListener("click", () => {
    svg.transition().call(zoom.scaleBy, 1 - paso);
  });

  document.querySelector(selectorZoomReset)?.addEventListener("click", () => {
    svg.transition().call(zoom.transform, d3.zoomIdentity);
  });
}

/**
 * Descarga el SVG como imagen PNG.
 * @param {string} svgSelector - Selector CSS del SVG.
 * @param {string} nombreArchivo - Nombre del archivo a descargar.
 * @param {number} width - Ancho del canvas.
 * @param {number} height - Alto del canvas.
 */
export function descargarComoPNG(svgSelector, nombreArchivo = "mapa.png", width = MAP_WIDTH, height = MAP_HEIGHT) {
  const svgElement = document.querySelector(svgSelector);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = function () {
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = png;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  image.src = url;
}
