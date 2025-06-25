// ==============================
// CONFIGURACIÓN GLOBAL PARA MAPAS DE ENTIDADES
// ==============================

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 600;
export const MAP_BACKGROUND = "#e6f0f8";

/**
 * Crea un SVG base con un grupo <g> dentro de un contenedor.
 */
export function crearSVGBase(selector, ariaLabel = "Mapa interactivo de distribución por entidad federativa") {
  const svg = d3.select(selector)
    .append("svg")
    .attr("width", MAP_WIDTH)
    .attr("height", MAP_HEIGHT)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", ariaLabel)
    .style("background-color", MAP_BACKGROUND);

  const g = svg.append("g");

  return { svg, g };
}

/**
 * Crea una leyenda de colores gradiente para mapas.
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
 * Crea una etiqueta de texto para un municipio o entidad en el mapa.
 */
export function crearEtiquetaMunicipio(grupo, nombre, x, y, opciones = {}) {
  const {
    fontSize = "10px",
    fill = "#000",
    fontFamily = "'Noto Sans', sans-serif",
    className = ""
  } = opciones;

  grupo.append("text")
    .attr("x", x)
    .attr("y", y)
    .text(nombre)
    .attr("font-size", fontSize)
    .attr("fill", fill)
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")
    .attr("class", className)
    .style("font-family", fontFamily);
}

/**
 * Inyecta botones de zoom y botón de casa automáticamente.
 */
export function inyectarControlesBasicos(svg, g, urlCasa = "../entidades/republica-mexicana.html") {
  let contenedor = document.querySelector(".zoom-controles");

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.className = "zoom-controles";
    document.body.appendChild(contenedor);
  }

  const botones = [
    { id: "zoom-in", label: "+", title: "Acercar" },
    { id: "zoom-out", label: "–", title: "Alejar" },
    { id: "zoom-reset", label: "⟳", title: "Restablecer" },
    { id: "zoom-home", label: "🏠", title: "Volver al mapa nacional" }
  ];

  botones.forEach(({ id, label, title }) => {
    let btn = document.getElementById(id);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = id;
      btn.innerText = label;
      btn.className = "boton";
      btn.title = title;
      btn.setAttribute("aria-label", title);
      contenedor.appendChild(btn);
    }
  });

  // Activar funcionalidad de zoom
  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

  // Funcionalidad del botón de casa
  document.getElementById("zoom-home").addEventListener("click", () => {
    window.location.href = urlCasa;
  });
}

/**
 * Habilita controles de zoom con botones personalizados.
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
 * Descarga el SVG como imagen PNG e inserta cita de fuente con fecha.
 */
export function descargarComoPNG(svgSelector, nombreArchivo = "mapa.png", width = MAP_WIDTH, height = MAP_HEIGHT) {
  const svgElement = document.querySelector(svgSelector);

  // Insertar fondo blanco semitransparente detrás del texto
  const fondo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fondo.setAttribute("x", 5);
  fondo.setAttribute("y", height - 25);
  fondo.setAttribute("width", 950);
  fondo.setAttribute("height", 20);
  fondo.setAttribute("fill", "white");
  fondo.setAttribute("fill-opacity", "0.7");
  fondo.setAttribute("id", "fondo-cita");
  svgElement.appendChild(fondo);

  // Insertar texto temporal con la cita de fuente
  const cita = document.createElementNS("http://www.w3.org/2000/svg", "text");
  cita.setAttribute("x", 10);
  cita.setAttribute("y", height - 10);
  cita.setAttribute("font-size", "10px");
  cita.setAttribute("fill", "#333");
  cita.setAttribute("font-family", "'Noto Sans', sans-serif");
  cita.setAttribute("id", "marca-descarga");
  const fecha = new Date().toISOString().split("T")[0];
  cita.textContent = `Fuente: Secretaría de Salud. (enero, 2025). Sistema de Información Administrativa de Recursos Humanos en Enfermería (SIARHE) [Sistema informático]. Consultado el ${fecha}`;
  svgElement.appendChild(cita);

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

  // Eliminar la cita y el fondo del SVG original
  setTimeout(() => {
    const marca = svgElement.querySelector("#marca-descarga");
    const fondoCita = svgElement.querySelector("#fondo-cita");
    if (marca) svgElement.removeChild(marca);
    if (fondoCita) svgElement.removeChild(fondoCita);
  }, 200);
}
