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

// Tooltip específico para clínicas
export function mostrarTooltipClinica(tooltip, event, campos) {
  // Helpers locales
  const safe = v => (v != null && String(v).trim() !== "" ? String(v).trim() : "N/D");
  const fmt6 = n => (Number.isFinite(n) ? Number(n).toFixed(6) : "N/D");

  // Espera propiedades: clues, institucion, entidad, municipio, localidad, lat, lon
  const html = `
    <strong>Clínica de catéter</strong><br>
    <div style="margin-top:4px;">
      <div><strong>CLUES:</strong> ${safe(campos.clues)}</div>
      <div><strong>Institución:</strong> ${safe(campos.institucion)}</div>
      <div><strong>Entidad:</strong> ${safe(campos.entidad)}</div>
      <div><strong>Municipio:</strong> ${safe(campos.municipio)}</div>
      <div><strong>Localidad:</strong> ${safe(campos.localidad)}</div>
      <div><strong>Latitud:</strong> ${fmt6(campos.lat)}</div>
      <div><strong>Longitud:</strong> ${fmt6(campos.lon)}</div>
    </div>
  `;

  tooltip
    .html(html)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px")
    .style("display", "block");
}