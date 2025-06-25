
// ==============================
// CONFIGURACIÓN GLOBAL PARA MAPAS DE ENTIDADES
// ==============================

export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 720;
export const MAP_BACKGROUND = "#e6f0f8";

// ==============================
// CREACIÓN DE SVG BASE
// ==============================
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

// ==============================
// CREACIÓN DE LEYENDA GRADIENTE
// ==============================
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

// ==============================
// CREAR ETIQUETA DE MUNICIPIO
// ==============================
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

// ==============================
// INYECTAR CONTROLES DE ZOOM
// ==============================
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

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

  document.getElementById("zoom-home").addEventListener("click", () => {
    window.location.href = urlCasa;
  });
}

// ==============================
// FUNCIONALIDAD DE ZOOM CON BOTONES
// ==============================
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

// ==============================
// DESCARGAR SVG COMO PNG
// ==============================
export function descargarComoPNG(
  svgSelector,
  nombreArchivo = "mapa.png",
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
  nombreEntidad = ""
) {
  const svgElement = document.querySelector(svgSelector);
  const extraTop = 50;
  const extraBottom = 40;
  const newHeight = height + extraTop + extraBottom;
  svgElement.setAttribute("viewBox", `0 ${-extraTop} ${width} ${newHeight}`);

  const fondoTitulo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fondoTitulo.setAttribute("x", -100);
  fondoTitulo.setAttribute("y", -extraTop);
  fondoTitulo.setAttribute("width", width + 200);
  fondoTitulo.setAttribute("height", extraTop);
  fondoTitulo.setAttribute("fill", "white");
  fondoTitulo.setAttribute("fill-opacity", "0.7");
  fondoTitulo.setAttribute("id", "fondo-titulo");
  svgElement.appendChild(fondoTitulo);

  const titulo = document.createElementNS("http://www.w3.org/2000/svg", "text");
  titulo.setAttribute("x", width / 2);
  titulo.setAttribute("y", -extraTop + 30);
  titulo.setAttribute("text-anchor", "middle");
  titulo.setAttribute("font-size", "20px");
  titulo.setAttribute("font-family", "'Noto Sans', sans-serif");
  titulo.setAttribute("fill", "#111");
  titulo.setAttribute("id", "titulo-descarga");
  titulo.textContent = nombreEntidad
    ? `Tasa de enfermeras por cada mil habitantes en ${nombreEntidad} (2025)`
    : `Tasa de enfermeras por cada mil habitantes (2025)`;
  svgElement.appendChild(titulo);

  const fondo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fondo.setAttribute("x", -100);
  fondo.setAttribute("y", height);
  fondo.setAttribute("width", width + 200);
  fondo.setAttribute("height", extraBottom);
  fondo.setAttribute("fill", "white");
  fondo.setAttribute("fill-opacity", "0.7");
  fondo.setAttribute("id", "fondo-cita");
  svgElement.appendChild(fondo);

  const cita = document.createElementNS("http://www.w3.org/2000/svg", "text");
  cita.setAttribute("x", width / 2);
  cita.setAttribute("y", height + 20);
  cita.setAttribute("text-anchor", "middle");
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

  setTimeout(() => {
    svgElement.querySelector("#titulo-descarga")?.remove();
    svgElement.querySelector("#fondo-titulo")?.remove();
    svgElement.querySelector("#marca-descarga")?.remove();
    svgElement.querySelector("#fondo-cita")?.remove();
  }, 200);
}
