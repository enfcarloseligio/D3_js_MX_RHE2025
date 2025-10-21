// scripts/utils/metricas.js
// =======================================================
// Catálogo central de métricas de enfermería (versión compacta)
// =======================================================

export const METRICAS = {
  tasa_total:            { label: "Tasa total", tasaKey: "tasa_total", countKey: "enfermeras_total", palette: "tasas", desc: "Enfermeras por cada mil habitantes (todas las áreas)." },
  tasa_primer:           { label: "Tasa 1er nivel", tasaKey: "tasa_primer", countKey: "enfermeras_primer", palette: "tasas", desc: "Primer nivel de atención." },
  tasa_segundo:          { label: "Tasa 2º nivel", tasaKey: "tasa_segundo", countKey: "enfermeras_segundo", palette: "tasas", desc: "Segundo nivel de atención." },
  tasa_tercer:           { label: "Tasa 3er nivel", tasaKey: "tasa_tercer", countKey: "enfermeras_tercer", palette: "tasas", desc: "Tercer nivel de atención." },
  tasa_apoyo:            { label: "Tasa en establecimientos de apoyo", tasaKey: "tasa_apoyo", countKey: "enfermeras_apoyo", palette: "tasas", desc: "Establecimientos de apoyo." },
  tasa_escuelas:         { label: "Tasa en escuelas", tasaKey: "tasa_escuelas", countKey: "enfermeras_escuelas", palette: "tasas", desc: "Escuelas." },
  tasa_administrativas:  { label: "Tasa en áreas administrativas", tasaKey: "tasa_administrativas", countKey: "enfermeras_administrativas", palette: "tasas", desc: "Áreas administrativas." },
  tasa_no_aplica:        { label: "Tasa no aplica", tasaKey: "tasa_no_aplica", countKey: "enfermeras_no_aplica", palette: "tasas", desc: "Registros marcados como 'No aplica'." },
  tasa_no_asignado:      { label: "Tasa no asignado", tasaKey: "tasa_no_asignado", countKey: "enfermeras_no_asignado", palette: "tasas", desc: "Registros 'No asignado'." },
  poblacion:             { label: "Población", tasaKey: "poblacion", countKey: "poblacion", palette: "poblacion", desc: "Población total." }
};

export const METRIC_ORDER = [
  "tasa_total",
  "poblacion",
  "tasa_primer",
  "tasa_segundo",
  "tasa_tercer",
  "tasa_apoyo",
  "tasa_escuelas",
  "tasa_administrativas",
  "tasa_no_aplica",
  "tasa_no_asignado"
];

// === Helpers ===
export const isPopulation = key => String(key) === "poblacion";
export const metricDef = key => METRICAS[key] || METRICAS.tasa_total;
export const metricKeys = () => METRIC_ORDER.filter(k => METRICAS[k]);
export const metricOptions = () => metricKeys().map(k => ({ value: k, label: METRICAS[k].label }));
export const metricLabel = key => metricDef(key).label;
export const tasaKey = key => metricDef(key).tasaKey;
export const countKey = key => metricDef(key).countKey;
export const metricPalette = key => metricDef(key).palette;
export const metricShortDescription = key => metricDef(key).desc || "";
