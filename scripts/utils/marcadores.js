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

// Paletas por tipo de marcador
export const MARCADOR_ESTILOS = {
  [MARCADORES_TIPOS.CATETER]: {
    fill: "#1e5b4f",
    hover: "#004d40",
    stroke: "#ffffff",
  },
  [MARCADORES_TIPOS.HERIDAS]: {
    fill: "#3b82f6",
    hover: "#1e40af",
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
