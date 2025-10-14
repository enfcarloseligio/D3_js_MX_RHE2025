// scripts/utils/marcadores.js
// =======================================================
// Estilos y helpers para marcadores de clínicas (puntos)
// =======================================================

// Catálogo de tipos (usa estos strings en tus datasets o al pintar)
export const MARCADORES_TIPOS = {
  CATETER: "CATETER",
  HERIDAS: "HERIDAS",
  // Agrega más aquí… p. ej. ONCOLOGIA, PEDIATRIA, etc.
};

// Nombre legible por tipo de marcador (para títulos/leyendas)
export const MARCADOR_NOMBRES = {
  [MARCADORES_TIPOS.CATETER]: "Clínicas de catéteres",
  [MARCADORES_TIPOS.HERIDAS]: "Clínicas de heridas",
};

export function nombreTipoMarcador(tipo) {
  return MARCADOR_NOMBRES[tipo] || "clínicas";
}

// Paletas por tipo de marcador
export const MARCADOR_ESTILOS = {
  [MARCADORES_TIPOS.CATETER]: {
    fill: "#1E5B4F",
    hover: "#002F2A",
    stroke: "#ffffff",
  },
  [MARCADORES_TIPOS.HERIDAS]: {
    fill: "#9B2247",
    hover: "#611232",
    stroke: "#ffffff",
  },
};

// Devuelve el estilo para un tipo dado (con fallback a CATETER)
export function getEstiloMarcador(tipo) {
  return MARCADOR_ESTILOS[tipo] || MARCADOR_ESTILOS[MARCADORES_TIPOS.CATETER];
}

/**
 * Pinta marcadores y devuelve un pequeño controlador con:
 *  - updateZoom(k): reescala radio/borde manteniendo tamaño visual
 *  - recolor(tipo): cambia colores sin recrear los nodos
 */
export function pintarMarcadores(g, puntos, projection, {
  tipo = MARCADORES_TIPOS.CATETER,
  radioBase = 5,
  strokeBase = 1.1,
} = {}) {
  let kActual = 1;
  const estilo = () => getEstiloMarcador(tipo);

  const radioEscalado = (el) =>
    (radioBase * (el.classList.contains("is-hover") ? 1.35 : 1)) / kActual;

  const bordeEscalado = (el) =>
    (strokeBase * (el.classList.contains("is-hover") ? 1.35 : 1)) / kActual;

  const sel = g.append("g")
    .attr("class", "capa-clinicas")
    .selectAll("circle")
    .data(puntos)
    .enter()
    .append("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", function () { return radioEscalado(this); })
    .attr("fill", estilo().fill)
    .attr("stroke", estilo().stroke)
    .attr("stroke-width", function () { return bordeEscalado(this); })
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      event.stopPropagation();
      this.classList.add("is-hover");
      d3.select(this)
        .attr("fill", estilo().hover)
        .attr("r",            () => radioEscalado(this))
        .attr("stroke-width", () => bordeEscalado(this));
    })
    .on("mouseout", function () {
      this.classList.remove("is-hover");
      d3.select(this)
        .attr("fill", estilo().fill)
        .attr("r",            () => radioEscalado(this))
        .attr("stroke-width", () => bordeEscalado(this));
    });

  function updateZoom(k) {
    kActual = k;
    sel
      .attr("r",            function () { return radioEscalado(this); })
      .attr("stroke-width", function () { return bordeEscalado(this); });
  }

  function recolor(nuevoTipo) {
    tipo = nuevoTipo;
    sel
      .attr("fill", d => estilo().fill)
      .attr("stroke", d => estilo().stroke);
  }

  return { selection: sel, updateZoom, recolor };
}

// ==============================
// LEYENDA DE MARCADORES
// ==============================
/**
 * Renderiza una leyenda con círculos de colores para cada tipo de marcador.
 *
 * @param {d3.Selection|SVGElement|string} host  svg | g | selector donde insertar
 * @param {string[]} tiposPresentes              array de tipos presentes (ej. ["CATETER"])
 * @param {object} opciones
 *   - x, y: posición inicial
 *   - title: título de la leyenda
 */
export function crearLeyendaMarcadores(host, tiposPresentes, {
  x = 20,
  y =  MAP_HEIGHT - 100,
  title = "Marcadores",
  dx = 0,
  dyStep = 20
} = {}) {
  const sel = (host && typeof host.select === "function")
    ? host
    : d3.select(host);

  // Elimina leyendas previas de marcadores
  sel.selectAll(".leyenda-marcadores").remove();

  const g = sel.append("g")
    .attr("class", "leyenda-marcadores")
    .attr("transform", `translate(${x},${y})`);

  // Título
  if (title) {
    g.append("text")
      .attr("x", dx)
      .attr("y", 0)
      .attr("font-size", "12px")
      .attr("font-family", "'Noto Sans', sans-serif")
      .style("font-weight", "bold")
      .text(title);
  }

  tiposPresentes.forEach((tipo, i) => {
    const est = getEstiloMarcador(tipo);
    const nombre = nombreTipoMarcador(tipo);

    const gy = g.append("g")
      .attr("transform", `translate(${dx},${(i+1) * dyStep})`);

    // círculo
    gy.append("circle")
      .attr("r", 5)
      .attr("cx", 0)
      .attr("cy", -4)
      .attr("fill", est.fill)
      .attr("stroke", est.stroke)
      .attr("stroke-width", 1);

    // texto
    gy.append("text")
      .attr("x", 12)
      .attr("y", 0)
      .attr("font-size", "12px")
      .attr("font-family", "'Noto Sans', sans-serif")
      .text(nombre);
  });

  return g;
}
