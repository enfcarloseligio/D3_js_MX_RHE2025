export function crearTooltip() {
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "10px")
    .style("background", "white")
    .style("border", "1px solid #999")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("font-family", "sans-serif");

  return tooltip;
}

export function mostrarTooltip(tooltip, event, nombre, datos) {
  tooltip
    .html(`
      <strong>${nombre}</strong><br>
      Tasa: ${datos ? datos.tasa.toFixed(2) : "Sin datos"}<br>
      Población: ${datos ? datos.poblacion.toLocaleString() : "—"}<br>
      Enfermeras: ${datos ? datos.enfermeras.toLocaleString() : "—"}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px")
    .style("display", "block");
}

export function ocultarTooltip(tooltip) {
  tooltip.style("display", "none");
}
