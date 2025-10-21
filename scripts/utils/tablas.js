// scripts/utils/tablas.js
// =======================================================
// Tablas unificadas (nacional y municipales)
// - Orden estable con "especiales" fijos al final
// - Estilos por fila (ej. total república)
// - Exportación a Excel con label dinámico
// =======================================================

import { METRICAS } from "./metricas.js";

// -------------------------------
// Utilidades comunes
// -------------------------------
function prioridadId(id) {
  const s = String(id);
  if (s === "34")   return 1; // Laborando en el extranjero
  if (s === "8888") return 2; // No disponible
  if (s === "9999") return 3; // Total República Mexicana
  return 0;                    // Normal
}

function esMetricaPoblacion(metricKey) {
  if (!metricKey) return false;
  const mk = String(metricKey).toLowerCase();
  return (
    mk === "poblacion" ||
    mk === "población" ||
    mk === "pob_total" ||
    mk === "pob" ||
    mk === "pobl" ||
    /^pob/.test(mk) ||
    /poblaci[oó]n/.test(mk)
  );
}

// Excel: nombres de hoja <= 31 chars, sin : \ / ? * [ ]
const sanitizeSheetName = (str) => {
  const cleaned = String(str).replace(/[:\\\/\?\*\[\]]/g, "").trim();
  return cleaned.length > 31 ? cleaned.slice(0, 31) : (cleaned || "Resumen");
};

// También sanea nombre de archivo visible (evita caracteres ilegales)
const sanitizeFileName = (str) => String(str).replace(/[\\\/:\*\?"<>\|]/g, "").trim();

// -------------------------------
// Tabla Nacional
// -------------------------------
/**
 * Renderiza la tabla nacional con datos ya normalizados.
 *
 * @param {Object} opts
 *  - data: array CSV normalizado (incluye 1..32 + 34 + 8888 + 9999)
 *  - metricKey: métrica inicial ("tasa_total", "poblacion", ...)
 *  - hostSelector: contenedor donde insertar la tabla (#tabla-contenido)
 *  - rowClasses: (opcional) mapa { id: "clase-css" } para decorar filas
 */
export function renderTablaNacional({
  data = [],
  metricKey = "tasa_total",
  hostSelector = "#tabla-contenido",
  rowClasses = { "9999": "fila-total" } // por defecto, Total con clase especial
} = {}) {
  const host = document.querySelector(hostSelector);
  if (!host) {
    console.warn("[renderTablaNacional] No se encontró host:", hostSelector);
    return { update: () => {} };
  }

  // Construye estructura fija
  host.innerHTML = "";
  const tabla = document.createElement("table");
  tabla.className = "tabla-datos";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th><span class="flecha-orden"></span>Estado</th>
      <th><span class="flecha-orden"></span>Enfermeras</th>
      <th><span class="flecha-orden"></span>Población</th>
      <th><span class="flecha-orden"></span>Tasa por cada mil habitantes</th>
    </tr>
  `;

  const tbody = document.createElement("tbody");
  tabla.appendChild(thead);
  tabla.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "tabla-scroll";
  wrap.appendChild(tabla);
  host.appendChild(wrap);

  // ------- helpers de pintado --------
  function buildRowsFor(metricKey) {
    const def = METRICAS[metricKey] || METRICAS["tasa_total"];
    const { tasaKey, countKey } = def;
    const esPob = esMetricaPoblacion(metricKey);

    // Mapeo universal (incluye 34, 8888, 9999)
    const filas = data.map(d => {
      const id     = String(d.id || d.ID || "").trim();
      const estado = (d.estado || d.Estado || "").trim();
      const pobl   = Number.isFinite(+d.poblacion) ? +d.poblacion
                     : (Number.isFinite(+d["población"]) ? +d["población"] : 0);
      const enf    = esPob ? null : (Number.isFinite(+d[countKey]) ? +d[countKey] : NaN);
      const tasa   = esPob ? null : (Number.isFinite(+d[tasaKey])  ? +d[tasaKey]  : NaN);
      return { id, estado, pobl, enf, tasa, esPob };
    });

    // Orden estable: primero normales por nombre; luego especiales (34, 8888, 9999) en ese orden
    const normales   = filas
      .filter(f => prioridadId(f.id) === 0)
      .sort((a,b) => a.estado.localeCompare(b.estado, 'es', { sensitivity: 'base' }));

    const especiales = [
      ...filas.filter(f => f.id === "34"),
      ...filas.filter(f => f.id === "8888"),
      ...filas.filter(f => f.id === "9999"),
    ];

    return [...normales, ...especiales];
  }

  function pintar(metricKey) {
    const filas = buildRowsFor(metricKey);
    tbody.innerHTML = "";

    filas.forEach(row => {
      const tr = document.createElement("tr");
      tr.dataset.id = row.id;
      if (rowClasses[row.id]) tr.classList.add(rowClasses[row.id]);

      tr.innerHTML = `
        <td class="municipio">${row.estado || "—"}</td>
        <td class="numero">${row.esPob ? "—" : (Number.isFinite(row.enf) ? Number(row.enf).toLocaleString("es-MX") : "—")}</td>
        <td class="numero">${Number.isFinite(row.pobl) ? Number(row.pobl).toLocaleString("es-MX") : "—"}</td>
        <td class="numero">${row.esPob ? "—" : (Number.isFinite(row.tasa) ? row.tasa.toFixed(2) : "—")}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Pintado inicial
  pintar(metricKey);

  // ------- Ordenamiento (sin mover especiales) --------
  // Al ordenar, sólo se reordena el bloque "normal" (1..32). Las filas especiales
  // quedan fijadas al final en el orden 34, 8888, 9999.
  const ths = thead.querySelectorAll("th");
  ths.forEach((th, idx) => {
    th.style.cursor = "pointer";
    th.setAttribute("data-orden", "asc");

    th.addEventListener("click", () => {
      // toggle flecha
      const ordenActual = th.getAttribute("data-orden");
      const nuevoOrden  = ordenActual === "asc" ? "desc" : "asc";
      thead.querySelectorAll(".flecha-orden").forEach(s => s.textContent = "");
      th.querySelector(".flecha-orden").textContent = nuevoOrden === "asc" ? "▲" : "▼";
      th.setAttribute("data-orden", nuevoOrden);

      // separar normales vs especiales sobre el DOM actual
      const filasDom   = Array.from(tbody.querySelectorAll("tr"));
      const normales   = filasDom.filter(tr => prioridadId(tr.dataset.id) === 0);
      const especiales = [
        ...filasDom.filter(tr => tr.dataset.id === "34"),
        ...filasDom.filter(tr => tr.dataset.id === "8888"),
        ...filasDom.filter(tr => tr.dataset.id === "9999"),
      ];

      // ordenar sólo las normales por columna idx
      normales.sort((a, b) => {
        const ta = a.children[idx].textContent.trim();
        const tb = b.children[idx].textContent.trim();

        const na = ta.replace(/[^\d.-]/g, "");
        const nb = tb.replace(/[^\d.-]/g, "");
        const isNum = v => /^-?\d+(\.\d+)?$/.test(v);

        if (isNum(na) && isNum(nb)) {
          const va = parseFloat(na), vb = parseFloat(nb);
          return (va - vb) * (nuevoOrden === "asc" ? 1 : -1);
        }
        return ta.localeCompare(tb, 'es', { sensitivity: 'base' }) * (nuevoOrden === "asc" ? 1 : -1);
      });

      // Pegar nuevamente: primero normales ordenadas, luego especiales en orden fijo
      tbody.innerHTML = "";
      normales.forEach(tr => tbody.appendChild(tr));
      especiales.forEach(tr => tbody.appendChild(tr)); // mantiene 34, 8888, 9999 fijos
    });
  });

  // API pública
  function update(newMetricKey) {
    pintar(newMetricKey);
  }

  return { update };
}

// -------------------------------
// Exportación a Excel (tabla visible)
// -------------------------------
/**
 * Vincula el botón para exportar la tabla visible a Excel.
 * - filenameBase: nombre base del archivo .xlsx (sin sufijo dinámico)
 * - sheetName: nombre de la hoja por defecto (si no hay selector o label)
 */
export function attachExcelButton({
  buttonSelector = "#descargar-excel",
  filenameBase = "tabla.xlsx",
  sheetName = "Resumen"
} = {}) {
  const boton = document.querySelector(buttonSelector);
  if (!boton) return;

  boton.addEventListener("click", () => {
    const tabla = document.querySelector("#tabla-contenido table");
    if (!tabla) return;

    // Lee la métrica actual del selector, si existe
    const key = document.getElementById("sel-metrica")?.value || "";
    const labelFromMetric = METRICAS[key]?.label;
    const label = (labelFromMetric || (esMetricaPoblacion(key) ? "Población" : null) || sheetName).replace(/\s+/g, " ");

    const hoja = sanitizeSheetName(label);
    const wb = XLSX.utils.table_to_book(tabla, { sheet: hoja });

    const base = filenameBase.replace(/\.xlsx$/i, "");
    const nombre = sanitizeFileName(`${base} - ${label}.xlsx`);

    XLSX.writeFile(wb, nombre);
  });
}
