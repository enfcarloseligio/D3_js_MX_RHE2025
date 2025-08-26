// tabla-municipios.js
// ===============================================
// TABLA MUNICIPAL DINÁMICA (sincronizada con #sel-metrica)
// ===============================================

// Mapeo de métricas disponibles
const METRICAS = {
  tasa_total:       { label: "Tasa total",           tasaKey: "tasa_total",       countKey: "enfermeras_total" },
  tasa_primer:      { label: "Tasa 1er nivel",       tasaKey: "tasa_primer",      countKey: "enfermeras_primer" },
  tasa_segundo:     { label: "Tasa 2º nivel",        tasaKey: "tasa_segundo",     countKey: "enfermeras_segundo" },
  tasa_tercer:      { label: "Tasa 3er nivel",       tasaKey: "tasa_tercer",      countKey: "enfermeras_tercer" },
  tasa_apoyo:       { label: "Tasa en apoyo",        tasaKey: "tasa_apoyo",       countKey: "enfermeras_apoyo" },
  tasa_escuelas:    { label: "Tasa en escuelas",     tasaKey: "tasa_escuelas",    countKey: "enfermeras_escuelas" },
  tasa_no_aplica:   { label: "Tasa no aplica",       tasaKey: "tasa_no_aplica",   countKey: "enfermeras_no_aplica" },
  tasa_no_asignado: { label: "Tasa no asignado",     tasaKey: "tasa_no_asignado", countKey: "enfermeras_no_asignado" }
};

let _cache = null;      // datos normalizados del CSV
let _tbody = null;      // referencia al TBODY actual
let _tabla = null;      // referencia a la tabla (para ordenar/descargar)
let _currentMetric = "tasa_total"; // inicial por defecto

// ===============================================
// FUNCIÓN PRINCIPAL PARA GENERAR LA TABLA
// ===============================================
export function generarTablaMunicipios(rutaCSV) {
  d3.csv(rutaCSV).then(raw => {
    // 1) Normaliza columnas al esquema ancho
    const data = raw.map(d => {
      const out = { ...d };
      // población (acepta "población" o "poblacion")
      out.población = +((("población" in d) && d["población"] !== "") ? d["población"] : (d.poblacion || 0));

      // totales (compat con legado enfermeras/tasa)
      out.enfermeras_total = +((d.enfermeras_total ?? d.enfermeras) || 0);
      out.tasa_total       = +((d.tasa_total       ?? d.tasa)       || 0);

      // niveles / ámbitos (si no existen, 0)
      out.enfermeras_primer      = +(d.enfermeras_primer      || 0);
      out.tasa_primer            = +(d.tasa_primer            || 0);
      out.enfermeras_segundo     = +(d.enfermeras_segundo     || 0);
      out.tasa_segundo           = +(d.tasa_segundo           || 0);
      out.enfermeras_tercer      = +(d.enfermeras_tercer      || 0);
      out.tasa_tercer            = +(d.tasa_tercer            || 0);
      out.enfermeras_apoyo       = +(d.enfermeras_apoyo       || 0);
      out.tasa_apoyo             = +(d.tasa_apoyo             || 0);
      out.enfermeras_escuelas    = +(d.enfermeras_escuelas    || 0);
      out.tasa_escuelas          = +(d.tasa_escuelas          || 0);
      out.enfermeras_no_aplica   = +(d.enfermeras_no_aplica   || 0);
      out.tasa_no_aplica         = +(d.tasa_no_aplica         || 0);
      out.enfermeras_no_asignado = +(d.enfermeras_no_asignado || 0);
      out.tasa_no_asignado       = +(d.tasa_no_asignado       || 0);

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
        <th><span class="flecha-orden"></span>Municipio</th>
        <th><span class="flecha-orden"></span>Población</th>
        <th><span class="flecha-orden"></span>Enfermeras</th>
        <th><span class="flecha-orden"></span>Tasa por cada mil habitantes</th>
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

  const def = METRICAS[metricKey] || METRICAS["tasa_total"];
  const { tasaKey, countKey } = def;

  // Copia para ordenar sin mutar cache
  const data = _cache.slice();

  // Orden por defecto: 8888/9999 al final, resto alfabético
  data.sort((a, b) => {
    if (a.id === "9999") return 1;
    if (b.id === "9999") return -1;
    if (a.id === "8888") return 1;
    if (b.id === "8888") return -1;
    return a.municipio.localeCompare(b.municipio, "es", { sensitivity: "base" });
  });

  _tbody.innerHTML = "";
  data.forEach(d => {
    const fila = document.createElement("tr");
    fila.dataset.id = d.id;
    if (d.id === "9999") fila.classList.add("fila-total"); // estilo de total

    const enfermeras = +(d[countKey] || 0);
    const tasa       = +(d[tasaKey]  || 0);

    fila.innerHTML = `
      <td class="municipio">${d.municipio}</td>
      <td class="numero">${Number(d.población).toLocaleString("es-MX")}</td>
      <td class="numero">${Number(enfermeras).toLocaleString("es-MX")}</td>
      <td class="numero">${Number.isFinite(tasa) ? tasa.toFixed(2) : "—"}</td>
    `;

    _tbody.appendChild(fila);
  });
}

// ===============================================
// FUNCIÓN PARA ORDENAR LAS COLUMNAS DE LA TABLA
// ===============================================
function activarOrdenamientoTabla(tabla) {
  const ths = tabla.querySelectorAll("thead th");

  ths.forEach((th, index) => {
    th.style.cursor = "pointer";
    th.setAttribute("data-orden", "asc");

    th.addEventListener("click", () => {
      const ordenActual = th.getAttribute("data-orden");
      const nuevoOrden = ordenActual === "asc" ? "desc" : "asc";

      // Limpiar flechas
      tabla.querySelectorAll(".flecha-orden").forEach(span => span.textContent = "");
      const flecha = th.querySelector(".flecha-orden");
      if (flecha) flecha.textContent = nuevoOrden === "asc" ? "▲" : "▼";

      const filas = Array.from(tabla.querySelectorAll("tbody tr"));

      // Mantén 8888/9999 al final
      const especiales = filas.filter(f => ["8888", "9999"].includes(f.dataset.id));
      const normales   = filas.filter(f => !["8888", "9999"].includes(f.dataset.id));

      // Ordena comparando texto o número
      normales.sort((a, b) => {
        const rawA = a.children[index].textContent.trim().replace(/[^\d.-]/g, "");
        const rawB = b.children[index].textContent.trim().replace(/[^\d.-]/g, "");
        const isNum = v => /^-?\d+(\.\d+)?$/.test(v);

        const valA = isNum(rawA) ? parseFloat(rawA) : rawA.toLowerCase();
        const valB = isNum(rawB) ? parseFloat(rawB) : rawB.toLowerCase();

        if (typeof valA === "number" && typeof valB === "number") {
          return nuevoOrden === "asc" ? valA - valB : valB - valA;
        }
        return rawA.localeCompare(rawB, "es", { sensitivity: "base" }) * (nuevoOrden === "asc" ? 1 : -1);
      });

      const tbody = tabla.querySelector("tbody");
      [...normales, ...especiales].forEach(f => tbody.appendChild(f));

      th.setAttribute("data-orden", nuevoOrden);
    });
  });
}

// ===============================================
// FUNCIÓN PARA DESCARGAR LA TABLA COMO EXCEL
// ===============================================
export function habilitarDescargaExcel(nombreArchivo = "tasas-enfermeras-municipios.xlsx") {
  const boton = document.getElementById("descargar-excel");
  if (!boton) return;

  boton.addEventListener("click", () => {
    const tabla = _tabla || document.querySelector("#tabla-contenido table");
    if (!tabla) return;

    const sel = document.getElementById("sel-metrica");
    const mk  = sel?.value || _currentMetric || "tasa_total";
    const nombreBonito = (METRICAS[mk]?.label || "Total").replace(/\s+/g, " ");

    const wb = XLSX.utils.table_to_book(tabla, { sheet: `Municipal - ${nombreBonito}` });
    const nombre = nombreArchivo.replace(".xlsx", ` - ${nombreBonito}.xlsx`);
    XLSX.writeFile(wb, nombre);
  });
}
