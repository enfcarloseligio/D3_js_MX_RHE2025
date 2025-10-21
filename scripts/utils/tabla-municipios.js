// scripts/utils/tabla-municipios.js
// ===============================================
// TABLA MUNICIPAL DINÁMICA (sincronizada con #sel-metrica)
// ===============================================

import { METRICAS } from "./metricas.js"; // ← usa el diccionario global

let _cache = null;      // datos normalizados del CSV
let _tbody = null;      // referencia al TBODY actual
let _tabla = null;      // referencia a la tabla (para ordenar/descargar)
let _currentMetric = "tasa_total"; // inicial por defecto

// ===== Comparadores / parsers reutilizables =====
const collES = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function getCellText(td) {
  return (td?.textContent || "").trim();
}
function parseNumFromCell(td) {
  // permite miles con espacio/coma y decimales con punto
  const raw = getCellText(td).replace(/[^0-9.\-]/g, "");
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : NaN;
}

// Detecta si la métrica seleccionada es "Población" (flexible con nombres comunes)
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

// ===============================================
// FUNCIÓN PRINCIPAL PARA GENERAR LA TABLA
// ===============================================
export function generarTablaMunicipios(rutaCSV) {
  d3.csv(rutaCSV).then(raw => {
    // 1) Normaliza columnas al esquema ancho
    const data = raw.map(d => {
      const out = { ...d };

      // ID y municipio (mantén lo existente)
      out.id = d.id ?? d.ID ?? d.Id ?? "";
      out.municipio = d.municipio ?? d.MUNICIPIO ?? d.Municipio ?? "";

      // población (acepta "población" o "poblacion")
      const pob = (("población" in d) && d["población"] !== "") ? d["población"] : (d.poblacion ?? d.POB_TOTAL ?? d.pob_total ?? "");
      out.población = +(`${pob}`.replace(/[^0-9.\-]/g, "")) || 0;

      // totales (compat con legado enfermeras/tasa)
      out.enfermeras_total = +((d.enfermeras_total ?? d.enfermeras ?? 0));
      out.tasa_total       = +((d.tasa_total       ?? d.tasa       ?? 0));

      // niveles / ámbitos (si no existen, 0)
      out.enfermeras_primer          = +(d.enfermeras_primer          || 0);
      out.tasa_primer                = +(d.tasa_primer                || 0);
      out.enfermeras_segundo         = +(d.enfermeras_segundo         || 0);
      out.tasa_segundo               = +(d.tasa_segundo               || 0);
      out.enfermeras_tercer          = +(d.enfermeras_tercer          || 0);
      out.tasa_tercer                = +(d.tasa_tercer                || 0);
      out.enfermeras_apoyo           = +(d.enfermeras_apoyo           || 0);
      out.tasa_apoyo                 = +(d.tasa_apoyo                 || 0);
      out.enfermeras_escuelas        = +(d.enfermeras_escuelas        || 0);
      out.tasa_escuelas              = +(d.tasa_escuelas              || 0);
      out.enfermeras_administrativas = +(d.enfermeras_administrativas || 0);
      out.tasa_administrativas       = +(d.tasa_administrativas       || 0);
      out.enfermeras_no_aplica       = +(d.enfermeras_no_aplica       || 0);
      out.tasa_no_aplica             = +(d.tasa_no_aplica             || 0);
      out.enfermeras_no_asignado     = +(d.enfermeras_no_asignado     || 0);
      out.tasa_no_asignado           = +(d.tasa_no_asignado           || 0);

      return out;
    });

    _cache = data;

    // 2) Construye estructura base de la tabla (una sola vez)
    const contenedor = document.getElementById("tabla-contenido");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    const tabla = document.createElement("table");
    tabla.className = "tabla-datos";
    _tabla = tabla;

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th data-type="text"><span class="flecha-orden"></span>Municipio</th>
        <th data-type="num"><span class="flecha-orden"></span>Población</th>
        <th data-type="num"><span class="flecha-orden"></span>Enfermeras</th>
        <th data-type="num"><span class="flecha-orden"></span>Tasa por cada mil habitantes</th>
      </tr>
    `;

    const tbody = document.createElement("tbody");
    _tbody = tbody;

    tabla.appendChild(thead);
    tabla.appendChild(tbody);

    const envoltorio = document.createElement("div");
    envoltorio.className = "tabla-scroll";
    envoltorio.appendChild(tabla);
    contenedor.appendChild(envoltorio);

    // 3) Primer pintado con la métrica actual
    const sel = document.getElementById("sel-metrica");
    _currentMetric = sel?.value || "tasa_total";
    renderTabla(_currentMetric);

    // 4) Ordenamiento interactivo
    activarOrdenamientoTabla(tabla);

    // 5) Escucha cambios del selector (si existe)
    if (sel) {
      sel.addEventListener("change", () => {
        _currentMetric = sel.value;
        renderTabla(_currentMetric);
      });
    }
  }).catch(err => {
    console.error("Error al cargar la tabla de municipios:", err);
  });
}

// ===============================================
// RENDER DINÁMICO SEGÚN MÉTRICA
// ===============================================
function renderTabla(metricKey = "tasa_total") {
  if (!_cache || !_tbody) return;

  const esPoblacion = esMetricaPoblacion(metricKey);
  const def = METRICAS[metricKey] || METRICAS["tasa_total"];
  const { tasaKey, countKey } = def || {};

  // Copia para ordenar sin mutar cache
  const data = _cache.slice();

  // Orden por defecto: 8888/9999 al final, resto alfabético
  data.sort((a, b) => {
    if (a.id === "9999") return 1;
    if (b.id === "9999") return -1;
    if (a.id === "8888") return 1;
    if (b.id === "8888") return -1;
    return collES.compare(a.municipio, b.municipio);
  });

  _tbody.innerHTML = "";
  data.forEach(d => {
    const fila = document.createElement("tr");
    fila.dataset.id = d.id;
    if (d.id === "9999") fila.classList.add("fila-total"); // estilo de total

    // Cuando el indicador es Población, forzamos "-" en enfermeras y tasa
    let enfermerasDisplay, tasaDisplay;

    if (esPoblacion) {
      enfermerasDisplay = "-";
      tasaDisplay = "-";
    } else {
      const enfermerasNum = +(d[countKey] || 0);
      const tasaNum       = +(d[tasaKey]  || 0);
      enfermerasDisplay   = Number(enfermerasNum).toLocaleString("es-MX");
      tasaDisplay         = Number.isFinite(tasaNum) ? tasaNum.toFixed(2) : "—";
    }

    const poblacionDisplay = Number(d.población).toLocaleString("es-MX");

    fila.innerHTML = `
      <td class="municipio">${d.municipio}</td>
      <td class="numero">${poblacionDisplay}</td>
      <td class="numero">${enfermerasDisplay}</td>
      <td class="numero">${tasaDisplay}</td>
    `;

    _tbody.appendChild(fila);
  });
}

// ===============================================
// FUNCIÓN PARA ORDENAR LAS COLUMNAS DE LA TABLA
// ===============================================
function activarOrdenamientoTabla(tabla) {
  const thead = tabla.querySelector('thead');
  const ths = thead.querySelectorAll("th");

  ths.forEach((th, index) => {
    th.style.cursor = "pointer";
    th.setAttribute("data-orden", "asc");

    th.addEventListener("click", () => {
      const tipo = th.dataset.type || "num"; // 'text' | 'num'
      const ordenActual = th.getAttribute("data-orden");
      const nuevoOrden  = ordenActual === "asc" ? "desc" : "asc";

      // Limpiar flechas y marcar la activa
      tabla.querySelectorAll(".flecha-orden").forEach(span => span.textContent = "");
      const flecha = th.querySelector(".flecha-orden");
      if (flecha) flecha.textContent = nuevoOrden === "asc" ? "▲" : "▼";
      th.setAttribute("data-orden", nuevoOrden);

      const filas = Array.from(tabla.querySelectorAll("tbody tr"));

      // Mantén 8888/9999 al final
      const especiales = filas.filter(f => ["8888", "9999"].includes(f.dataset.id));
      const normales   = filas.filter(f => !["8888", "9999"].includes(f.dataset.id));

      // Comparador según tipo
      const cmp = (a, b) => {
        if (tipo === "text") {
          const A = getCellText(a.children[index]);
          const B = getCellText(b.children[index]);
          const res = collES.compare(A, B);
          return nuevoOrden === "asc" ? res : -res;
        } else {
          const A = parseNumFromCell(a.children[index]);
          const B = parseNumFromCell(b.children[index]);
          let res;
          if (Number.isNaN(A) && Number.isNaN(B)) res = 0;
          else if (Number.isNaN(A)) res = 1;
          else if (Number.isNaN(B)) res = -1;
          else res = A - B;
          return nuevoOrden === "asc" ? res : -res;
        }
      };

      normales.sort(cmp);

      const tbody = tabla.querySelector("tbody");
      [...normales, ...especiales].forEach(f => tbody.appendChild(f));
    });
  });
}

// ===============================================
// FUNCIÓN PARA DESCARGAR LA TABLA COMO EXCEL
// ===============================================
export function habilitarDescargaExcel(nombreArchivo = "tasas-enfermeras-municipios.xlsx") {
  const boton = document.getElementById("descargar-excel");
  if (!boton) return;

  // Excel: nombres de hoja <= 31 chars, sin : \ / ? * [ ]
  const sanitizeSheetName = (str) => {
    const cleaned = String(str).replace(/[:\\\/\?\*\[\]]/g, "").trim();
    return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned || "Municipal";
  };

  // (Opcional) también sanear/recortar el nombre de archivo visible
  const sanitizeFileName = (str) => String(str).replace(/[\\\/:\*\?"<>\|]/g, "").trim();

  boton.addEventListener("click", () => {
    const tabla = _tabla || document.querySelector("#tabla-contenido table");
    if (!tabla) return;

    const sel = document.getElementById("sel-metrica");
    const mk  = sel?.value || _currentMetric || "tasa_total";
    const nombreBonito = (METRICAS[mk]?.label || (esMetricaPoblacion(mk) ? "Población" : "Total")).replace(/\s+/g, " ");

    const hoja = sanitizeSheetName(`Municipal - ${nombreBonito}`);
    const wb = XLSX.utils.table_to_book(tabla, { sheet: hoja });

    const base = nombreArchivo.replace(/\.xlsx$/i, "");
    const nombre = sanitizeFileName(`${base} - ${nombreBonito}.xlsx`);

    XLSX.writeFile(wb, nombre);
  });
}
