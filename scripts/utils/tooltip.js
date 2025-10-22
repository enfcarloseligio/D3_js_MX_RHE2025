// scripts/utils/tooltip.js
// ==============================
// Crear tooltip (estilos básicos)
// ==============================
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

// ==============================
// Helpers internos
// ==============================
const LABELS = {
  "tasa_total":            "Tasa total",
  "tasa_primer":           "Tasa 1er nivel",
  "tasa_segundo":          "Tasa 2º nivel",
  "tasa_tercer":           "Tasa 3er nivel",
  "tasa_apoyo":            "Tasa en apoyo",
  "tasa_escuelas":         "Tasa en escuelas",
  "tasa_administrativas":  "Tasa en áreas administrativas",
  "tasa_no_aplica":        "Tasa no aplica",
  "tasa_no_asignado":      "Tasa no asignado",
  "poblacion":             "Población"
};
const labelPorMetrica = key => LABELS[key] || "Tasa";

const fmtRate = n => (Number.isFinite(n) ? n.toFixed(2) : "Sin datos");
const fmtNum  = n => (Number.isFinite(+n) ? Number(n).toLocaleString("es-MX") : "—");

// Arma {tasa, enfermeras, poblacion, label} a partir de:
// 1) objeto resumido {tasa, poblacion|población, enfermeras}, o
// 2) registro “ancho” + metricKey (tasa_*/enfermeras_* o 'población')
function pickDatos(datos, metricKey, labelForced) {
  // Normaliza población (admite 'poblacion' o 'población')
  const poblacion = Number.isFinite(+datos?.poblacion)
    ? +datos.poblacion
    : (Number.isFinite(+datos?.["población"]) ? +datos["población"] : NaN);

  // Caso A: datos ya vienen resumidos
  if (datos && ("tasa" in datos || "enfermeras" in datos)) {
    return {
      tasa: Number.isFinite(+datos.tasa) ? +datos.tasa : NaN,
      enfermeras: Number.isFinite(+datos.enfermeras) ? +datos.enfermeras : NaN,
      poblacion,
      label: labelForced || "Tasa"
    };
  }

  // Caso especial: métrica de población (no es tasa)
  if (metricKey === "poblacion") {
    return {
      tasa: NaN,
      enfermeras: NaN,
      poblacion,
      label: "Población",
      isPoblacion: true
    };
  }

  // Caso B: registro ancho + metricKey (tasa_*)
  if (metricKey) {
    const tasaKey = metricKey; // ej. 'tasa_primer'
    const enfKey  = metricKey.replace(/^tasa_/, "enfermeras_");
    const tasa = Number.isFinite(+datos?.[tasaKey]) ? +datos[tasaKey] : NaN;
    const enfermeras = Number.isFinite(+datos?.[enfKey]) ? +datos[enfKey] : NaN;
    return {
      tasa,
      enfermeras,
      poblacion,
      label: labelForced || labelPorMetrica(metricKey),
      isPoblacion: false
    };
  }

  // Caso C: buscar la primera llave tasa_* disponible
  if (datos) {
    const key = Object.keys(datos).find(k => /^tasa_/.test(k) && Number.isFinite(+datos[k]));
    if (key) {
      const tasa = +datos[key];
      const enfKey = key.replace(/^tasa_/, "enfermeras_");
      const enfermeras = Number.isFinite(+datos?.[enfKey]) ? +datos[enfKey] : NaN;
      return { tasa, enfermeras, poblacion, label: labelPorMetrica(key), isPoblacion: false };
    }
  }

  // Fallback sin datos
  return { tasa: NaN, enfermeras: NaN, poblacion, label: labelForced || "Tasa", isPoblacion: false };
}

// ==============================
// Mostrar / ocultar tooltip
// ==============================
//
// Uso típico con estructura “ancha”:
// mostrarTooltip(tooltip, event, nombre, registro, {
//   metricKey: METRICAS[currentMetric].tasaKey || 'poblacion',
//   label: METRICAS[currentMetric].label
// });
//
export function mostrarTooltip(tooltip, event, nombre, datos, opts = {}) {
  const metricKey = opts.metricKey || null;
  const labelUser = opts.label || null;

  const picked = pickDatos(datos, metricKey, labelUser);

  let html;
  if (picked.isPoblacion) {
    // Solo muestra la población (no tasa ni enfermeras)
    html = `
      <strong>${nombre}</strong><br>
      ${picked.label}: ${fmtNum(picked.poblacion)}
    `;
  } else {
    html = `
      <strong>${nombre}</strong><br>
      ${picked.label}: ${fmtRate(picked.tasa)}<br>
      Población: ${fmtNum(picked.poblacion)}<br>
      Enfermeras: ${fmtNum(picked.enfermeras)}
    `;
  }

  tooltip
    .html(html)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px")
    .style("display", "block");
}

export function ocultarTooltip(tooltip) {
  tooltip.style("display", "none");
}

// ==============================
// Tooltip específico para clínicas
// ==============================
export function mostrarTooltipClinica(tooltip, event, campos) {
  const safe = v => (v != null && String(v).trim() !== "" ? String(v).trim() : "N/D");
  const fmt6  = n => (Number.isFinite(n) ? Number(n).toFixed(6) : "N/D");

  const html = `
    <strong>Clínica de catéter</strong><br>
    <div style="margin-top:4px;">
      <div><strong>Unidad:</strong> ${safe(campos.unidad)}</div>
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
