// scripts/utils/normalizacion.js
// =======================================================
// Normalización uniforme para CSVs nacionales y estatales
// =======================================================

// Parser numérico robusto (soporta coma decimal y espacios)
export function toNum(v, def = 0) {
  if (v == null) return def;
  const n = +String(v).trim().replace(/\s+/g, "").replace(",", ".");
  return Number.isFinite(n) ? n : def;
}

// Pequeño alias getter
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

// -----------------------------------------------
// Normaliza una fila “nacional” (agregada por estado)
// -----------------------------------------------
export function normalizarFilaNacional(d, { extras = [] } = {}) {
  const out = { ...d };

  // Id y nombre de estado
  out.id     = String(pick(d, "id", "ID") ?? "").trim();
  out.estado = String(pick(d, "estado", "Estado") ?? "").trim();

  // Población: con y sin acento
  out["población"] = toNum(pick(d, "población", "poblacion"), 0);
  out.poblacion    = out["población"];

  // Totales (compat nombres viejos: enfermeras / tasa)
  out.enfermeras_total = toNum(pick(d, "enfermeras_total", "enfermeras"), 0);
  out.tasa_total       = toNum(pick(d, "tasa_total", "tasa"), 0);

  // Niveles / ámbitos “base”
  const base = [
    "primer",
    "segundo",
    "tercer",
    "apoyo",
    "escuelas",
    "administrativas",   
    "no_aplica",
    "no_asignado",
  ];

  for (const k of [...base, ...extras]) {
    const ek = `enfermeras_${k}`;
    const tk = `tasa_${k}`;
    out[ek] = toNum(d[ek], 0);
    out[tk] = toNum(d[tk], 0);
  }

  return out;
}

// -----------------------------------------------
// Normaliza una fila “entidad” (por municipio)
// -----------------------------------------------
export function normalizarFilaEntidad(d, { extras = [] } = {}) {
  const out = { ...d };

  // Ids y nombres
  out.id        = String(pick(d, "id", "ID") ?? "").trim(); // suele ser id entidad
  out.estado    = String(pick(d, "estado", "Estado") ?? "").trim();
  out.cve_mun   = String(pick(d, "cve_mun", "clave_municipio", "CLAVE_MUNICIPIO") ?? "").padStart(3, "0");
  out.municipio = String(pick(d, "municipio", "Municipio", "MUNICIPIO") ?? "").trim();

  // Población
  out["población"] = toNum(pick(d, "población", "poblacion"), 0);
  out.poblacion    = out["población"];

  // Totales
  out.enfermeras_total = toNum(pick(d, "enfermeras_total", "enfermeras"), 0);
  out.tasa_total       = toNum(pick(d, "tasa_total", "tasa"), 0);

  // Niveles / ámbitos + extras
  const base = [
    "primer",
    "segundo",
    "tercer",
    "apoyo",
    "escuelas",
    "administrativas", 
    "no_aplica",
    "no_asignado",
  ];

  for (const k of [...base, ...extras]) {
    const ek = `enfermeras_${k}`;
    const tk = `tasa_${k}`;
    out[ek] = toNum(d[ek], 0);
    out[tk] = toNum(d[tk], 0);
  }

  return out;
}

// -----------------------------------------------
// Normaliza todo un dataset
// -----------------------------------------------
export function normalizarDataset(rows, { scope = "nacional", extras = [] } = {}) {
  const fn = scope === "entidad" ? normalizarFilaEntidad : normalizarFilaNacional;
  return rows.map(r => fn(r, { extras }));
}
