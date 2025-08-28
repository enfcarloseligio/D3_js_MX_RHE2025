// ==============================
// IMPORTACIONES
// ==============================
import { crearTooltip, mostrarTooltip, ocultarTooltip } from '../utils/tooltip.js';
import {
  crearSVGBase, MAP_WIDTH, MAP_HEIGHT,
  crearLeyenda, activarZoomConBotones,
  descargarComoPNG, crearEtiquetaMunicipio
} from '../utils/config-mapa.js';

// ==============================
// CREACIÓN DEL MAPA
// ==============================
const { svg, g } = crearSVGBase("#mapa-nacional", "Mapa de distribución nacional de enfermeras");
const tooltip = crearTooltip();

// Host fijo para la leyenda (evita superposiciones)
const legendHost = svg.append("g").attr("id", "legend-host");

// ==============================
// CARGA DE DATOS
// ==============================
Promise.all([
  d3.json("../data/maps/republica-mexicana.geojson"),
  d3.csv("../data/rate/republica-mexicana.csv")
]).then(([geoData, tasas]) => {

  // ==============================
  // Normalización de columnas
  // ==============================
  tasas.forEach(d => {
    // Población con alias sin/ con acento (ambas disponibles)
    d["población"] = +(("población" in d && d["población"] !== "") ? d["población"] : (d.poblacion || 0));
    d.poblacion = d["población"];  // alias consistente

    // Totales (nuevo esquema / legado)
    d.enfermeras_total = +((d.enfermeras_total ?? d.enfermeras) || 0);
    d.tasa_total       = +((d.tasa_total ?? d.tasa) || 0);

    // Niveles / ámbitos
    d.enfermeras_primer   = +(d.enfermeras_primer   || 0);
    d.tasa_primer         = +(d.tasa_primer         || 0);
    d.enfermeras_segundo  = +(d.enfermeras_segundo  || 0);
    d.tasa_segundo        = +(d.tasa_segundo        || 0);
    d.enfermeras_tercer   = +(d.enfermeras_tercer   || 0);
    d.tasa_tercer         = +(d.tasa_tercer         || 0);
    d.enfermeras_apoyo    = +(d.enfermeras_apoyo    || 0);
    d.tasa_apoyo          = +(d.tasa_apoyo          || 0);
    d.enfermeras_escuelas = +(d.enfermeras_escuelas || 0);
    d.tasa_escuelas       = +(d.tasa_escuelas       || 0);
    d.enfermeras_no_aplica   = +(d.enfermeras_no_aplica   || 0);
    d.tasa_no_aplica         = +(d.tasa_no_aplica         || 0);
    d.enfermeras_no_asignado = +(d.enfermeras_no_asignado || 0);
    d.tasa_no_asignado       = +(d.tasa_no_asignado       || 0);
  });

  // ==============================
  // Diccionario por estado (ancho)
  // ==============================
  const dataByEstado = {};
  tasas.forEach(d => {
    const estado = (d.estado || "").trim();
    if (!estado) return;
    dataByEstado[estado] = {
      poblacion: d.poblacion, // clave sin acento para JS

      enfermeras_total:   d.enfermeras_total,   tasa_total:   d.tasa_total,
      enfermeras_primer:  d.enfermeras_primer,  tasa_primer:  d.tasa_primer,
      enfermeras_segundo: d.enfermeras_segundo, tasa_segundo: d.tasa_segundo,
      enfermeras_tercer:  d.enfermeras_tercer,  tasa_tercer:  d.tasa_tercer,

      enfermeras_apoyo:   d.enfermeras_apoyo,   tasa_apoyo:   d.tasa_apoyo,
      enfermeras_escuelas:d.enfermeras_escuelas,tasa_escuelas:d.tasa_escuelas,

      enfermeras_no_aplica:   d.enfermeras_no_aplica,   tasa_no_aplica:   d.tasa_no_aplica,
      enfermeras_no_asignado: d.enfermeras_no_asignado, tasa_no_asignado: d.tasa_no_asignado
    };
  });

  // ==============================
  // Configuración de métricas
  // ==============================
  const COLOR_CERO = '#bfbfbf'; // gris para 0.00
  const COLOR_SIN  = '#d9d9d9'; // gris claro s/d

  const COLORES_TASAS     = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']; // institucional (tasas)
  const COLORES_POBLACION = ['#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c']; // verdes (población)

  // ids 1..32
  const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));

  const METRICAS = {
    tasa_total:       { label: "Tasa total",           tasaKey: "tasa_total",    countKey: "enfermeras_total",   palette: "tasas" },
    tasa_primer:      { label: "Tasa 1er nivel",       tasaKey: "tasa_primer",   countKey: "enfermeras_primer",  palette: "tasas" },
    tasa_segundo:     { label: "Tasa 2º nivel",        tasaKey: "tasa_segundo",  countKey: "enfermeras_segundo", palette: "tasas" },
    tasa_tercer:      { label: "Tasa 3er nivel",       tasaKey: "tasa_tercer",   countKey: "enfermeras_tercer",  palette: "tasas" },
    tasa_apoyo:       { label: "Tasa en apoyo",        tasaKey: "tasa_apoyo",    countKey: "enfermeras_apoyo",   palette: "tasas" },
    tasa_escuelas:    { label: "Tasa en escuelas",     tasaKey: "tasa_escuelas", countKey: "enfermeras_escuelas",palette: "tasas" },
    tasa_no_aplica:   { label: "Tasa no aplica",       tasaKey: "tasa_no_aplica",   countKey: "enfermeras_no_aplica", palette: "tasas" },
    tasa_no_asignado: { label: "Tasa no asignado",     tasaKey: "tasa_no_asignado", countKey: "enfermeras_no_asignado", palette: "tasas" },
    poblacion:        { label: "Población",            tasaKey: "poblacion",     countKey: "poblacion",          palette: "poblacion" }
  };

  let currentMetric = "tasa_total";

  // ==============================
  // Utilidades de cuartiles
  // ==============================
  function computeQuartiles(vals) {
    vals = vals.filter(Number.isFinite).sort((a, b) => a - b);
    if (!vals.length) return { min: 0, q1: 1, q2: 2, q3: 3, max: 4 };

    let min = vals[0], max = vals[vals.length - 1];
    let q1  = d3.quantileSorted(vals, 0.25);
    let q2  = d3.quantileSorted(vals, 0.50);
    let q3  = d3.quantileSorted(vals, 0.75);

    const eps = 1e-6; // evita cortes iguales
    if (!(q1 > min)) q1 = min + eps;
    if (!(q2 > q1)) q2 = q1 + eps;
    if (!(q3 > q2)) q3 = q2 + eps;
    if (!(max > q3)) max = q3 + eps;

    return { min, q1, q2, q3, max };
  }

  function valoresDeMetrica(metricKey) {
    const key = METRICAS[metricKey].tasaKey; // 'tasa_*' o 'poblacion'
    return tasas
      .filter(d => idsEntidades.has(String(d.id)))
      .map(d => +d[key === "poblacion" ? "poblacion" : key])  // población sin acento
      .filter(Number.isFinite);
  }

  let min, q1, q2, q3, max;
  let colorScale;

  function paletteFor(metricKey) {
    const pal = METRICAS[metricKey].palette;
    return pal === "poblacion" ? COLORES_POBLACION : COLORES_TASAS;
  }

  function recomputeAndPaint() {
    // 1) cuartiles
    ({ min, q1, q2, q3, max } = computeQuartiles(valoresDeMetrica(currentMetric)));

    // 2) paleta por métrica
    const PALETTE = paletteFor(currentMetric);
    const esPoblacion = currentMetric === "poblacion";

    // 3) escala continua
    colorScale = d3.scaleLinear()
      .domain([min, q1, q2, q3, max])
      .range(PALETTE)
      .interpolate(d3.interpolateRgb);

    // 4) repintar mapa
    g.selectAll("path")
      .transition().duration(350)
      .attr("fill", d => {
        const nombre = d.properties.NOMBRE.trim();
        const item = dataByEstado[nombre];
        if (!item) return COLOR_SIN;
        const v = +item[METRICAS[currentMetric].tasaKey];
        if (!Number.isFinite(v)) return COLOR_SIN; // s/d
        if (!esPoblacion && v <= 0) return COLOR_CERO; // 0.00 solo aplica a tasas
        return colorScale(v);
      });

    // 5) leyenda (limpiar y redibujar)
    legendHost.selectAll("*").remove();

    const pasosCrudos = [min, q1, q2, q3, max];
    const pasos = [];
    const seen = new Set();
    pasosCrudos.forEach(v => {
      const k = esPoblacion ? Math.round(v) : +(+v).toFixed(2);
      if (!seen.has(k)) { seen.add(k); pasos.push(k); }
    });

    crearLeyenda(legendHost, {
      dominio: [min, max],
      pasos,
      colores: PALETTE,
      titulo: METRICAS[currentMetric].label,          // "Población" o la etiqueta de tasa
      chips: esPoblacion ? null : [                   // sin chips en Población
        { color: COLOR_CERO, texto: "0.00" },
        { color: COLOR_SIN,  texto: "s/d"  }
      ]
    });
  }

  // ==============================
  // Proyección y paths base
  // ==============================
  const projection = d3.geoMercator()
    .scale(2000)
    .center([-102, 24])
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

  const path = d3.geoPath().projection(projection);

  const enlacesEntidad = {
    "Aguascalientes": "../entidades/aguascalientes.html",
    "Baja California": "../entidades/baja-california.html",
    "Baja California Sur": "../entidades/baja-california-sur.html",
    "Campeche": "../entidades/campeche.html",
    "Chiapas": "../entidades/chiapas.html",
    "Chihuahua": "../entidades/chihuahua.html",
    "Ciudad de México": "../entidades/ciudad-de-mexico.html",
    "Coahuila": "../entidades/coahuila.html",
    "Colima": "../entidades/colima.html",
    "Durango": "../entidades/durango.html",
    "Estado de México": "../entidades/estado-de-mexico.html",
    "Guanajuato": "../entidades/guanajuato.html",
    "Guerrero": "../entidades/guerrero.html",
    "Hidalgo": "../entidades/hidalgo.html",
    "Jalisco": "../entidades/jalisco.html",
    "Michoacán": "../entidades/michoacan.html",
    "Morelos": "../entidades/morelos.html",
    "Nayarit": "../entidades/nayarit.html",
    "Nuevo León": "../entidades/nuevo-leon.html",
    "Oaxaca": "../entidades/oaxaca.html",
    "Puebla": "../entidades/puebla.html",
    "Querétaro": "../entidades/queretaro.html",
    "Quintana Roo": "../entidades/quintana-roo.html",
    "San Luis Potosí": "../entidades/san-luis-potosi.html",
    "Sinaloa": "../entidades/sinaloa.html",
    "Sonora": "../entidades/sonora.html",
    "Tabasco": "../entidades/tabasco.html",
    "Tamaulipas": "../entidades/tamaulipas.html",
    "Tlaxcala": "../entidades/tlaxcala.html",
    "Veracruz de Ignacio de la Llave": "../entidades/veracruz.html",
    "Yucatán": "../entidades/yucatan.html",
    "Zacatecas": "../entidades/zacatecas.html"
  };

  let ultimoClick = 0;

  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMBRE.trim();
      const item = dataByEstado[nombre];

      d3.select(this).attr("stroke-width", 1.5);

      // Tooltip: si es población, sólo población (onlyPopulation:true)
      const isPob = currentMetric === "poblacion";
      mostrarTooltip(tooltip, event, nombre, item, {
        metricKey: METRICAS[currentMetric].tasaKey, // 'tasa_*' o 'poblacion'
        label: METRICAS[currentMetric].label,
        onlyPopulation: isPob
      });
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      ocultarTooltip(tooltip);
      d3.select(this).attr("stroke-width", 0.5);
    })
    .on("click", function (event, d) {
      const ahora = new Date().getTime();
      const nombre = d.properties.NOMBRE.trim();
      const enlace = enlacesEntidad[nombre];
      if (ahora - ultimoClick < 350 && enlace) {
        window.location.href = enlace;
      }
      ultimoClick = ahora;
    });

  // Etiquetas (apagadas por default)
  const labelsGroup = g.append("g")
    .attr("id", "etiquetas-municipios")
    .style("display", "none");

  const nombresUnicos = new Set();
  geoData.features.forEach(d => {
    const nombre = d.properties.NOMBRE.trim();
    if (nombresUnicos.has(nombre)) return;
    const [x, y] = path.centroid(d);
    crearEtiquetaMunicipio(labelsGroup, nombre, x, y, { fontSize: "6px" });
    nombresUnicos.add(nombre);
  });

  // Primera renderización
  recomputeAndPaint();

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

  // ==============================
  // TABLA NACIONAL (dinámica)
  // ==============================
  let _tablaCache = null;
  let _tbodyElem  = null;

  function initTablaNacional(rutaCSV) {
    d3.csv(rutaCSV).then(data => {
      // normaliza igual que arriba
      data.forEach(d => {
        d["población"] = +(("población" in d && d["población"] !== "") ? d["población"] : (d.poblacion || 0));
        d.poblacion = d["población"];

        d.enfermeras_total = +((d.enfermeras_total ?? d.enfermeras) || 0);
        d.tasa_total       = +((d.tasa_total ?? d.tasa) || 0);

        d.enfermeras_primer   = +(d.enfermeras_primer   || 0);
        d.tasa_primer         = +(d.tasa_primer         || 0);
        d.enfermeras_segundo  = +(d.enfermeras_segundo  || 0);
        d.tasa_segundo        = +(d.tasa_segundo        || 0);
        d.enfermeras_tercer   = +(d.enfermeras_tercer   || 0);
        d.tasa_tercer         = +(d.tasa_tercer         || 0);
        d.enfermeras_apoyo    = +(d.enfermeras_apoyo    || 0);
        d.tasa_apoyo          = +(d.tasa_apoyo          || 0);
        d.enfermeras_escuelas = +(d.enfermeras_escuelas || 0);
        d.tasa_escuelas       = +(d.tasa_escuelas       || 0);
        d.enfermeras_no_aplica   = +(d.enfermeras_no_aplica   || 0);
        d.tasa_no_aplica         = +(d.tasa_no_aplica         || 0);
        d.enfermeras_no_asignado = +(d.enfermeras_no_asignado || 0);
        d.tasa_no_asignado       = +(d.tasa_no_asignado       || 0);
      });

      _tablaCache = data;

      const contenedor = document.getElementById("tabla-contenido");
      if (!contenedor) return;
      contenedor.innerHTML = "";

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
      _tbodyElem = tbody;

      tabla.appendChild(thead);
      tabla.appendChild(tbody);

      const envoltorio = document.createElement("div");
      envoltorio.className = "tabla-scroll";
      envoltorio.appendChild(tabla);
      contenedor.appendChild(envoltorio);

      updateTablaNacional(currentMetric); // primer pintado
      activarOrdenamientoTabla(tabla);
    });
  }

  function updateTablaNacional(metricKey = "tasa_total") {
    if (!_tablaCache || !_tbodyElem) return;

    const def = METRICAS[metricKey] || METRICAS["tasa_total"];
    const { tasaKey, countKey } = def;
    const isPob = metricKey === "poblacion";

    // Copia para ordenar sin mutar cache
    const data = _tablaCache.slice();

    // Fija 8888 y 9999 al final
    data.sort((a, b) => {
      if (a.id === "9999") return 1;
      if (b.id === "9999") return -1;
      if (a.id === "8888") return 1;
      if (b.id === "8888") return -1;
      return a.estado.localeCompare(b.estado);
    });

    _tbodyElem.innerHTML = "";
    data.forEach(d => {
      const fila = document.createElement("tr");
      fila.dataset.id = d.id;
      if (d.id === "9999") fila.classList.add("fila-total");

      const poblSel = +(d.poblacion || 0);

      // Para población: mostramos solo población; enfermeras/tasa van “—”
      const enfermerasSel = isPob ? null : +(d[countKey] || 0);
      const tasaSel       = isPob ? null : +(d[tasaKey]  || 0);

      fila.innerHTML = `
        <td class="municipio">${d.estado}</td>
        <td class="numero">${isPob ? "—" : Number(enfermerasSel).toLocaleString('es-MX')}</td>
        <td class="numero">${Number(poblSel).toLocaleString('es-MX')}</td>
        <td class="numero">${isPob ? "—" : (Number.isFinite(tasaSel) ? tasaSel.toFixed(2) : "—")}</td>
      `;
      _tbodyElem.appendChild(fila);
    });
  }

  function activarOrdenamientoTabla(tabla) {
    const ths = tabla.querySelectorAll("thead th");

    ths.forEach((th, index) => {
      th.style.cursor = "pointer";
      th.setAttribute("data-orden", "asc");

      th.addEventListener("click", () => {
        const ordenActual = th.getAttribute("data-orden");
        const nuevoOrden = ordenActual === "asc" ? "desc" : "asc";

        tabla.querySelectorAll(".flecha-orden").forEach(span => span.textContent = "");
        const flecha = th.querySelector(".flecha-orden");
        if (flecha) flecha.textContent = nuevoOrden === "asc" ? "▲" : "▼";

        const filas = Array.from(tabla.querySelectorAll("tbody tr"));

        const especiales = filas.filter(f => ["8888", "9999"].includes(f.dataset.id));
        const normales   = filas.filter(f => !["8888", "9999"].includes(f.dataset.id));

        normales.sort((a, b) => {
          const rawA = a.children[index].textContent.trim().replace(/[^\d.-]/g, "");
          const rawB = b.children[index].textContent.trim().replace(/[^\d.-]/g, "");
          const isNum = v => /^-?\d+(\.\d+)?$/.test(v);

          const valA = isNum(rawA) ? parseFloat(rawA) : rawA.toLowerCase();
          const valB = isNum(rawB) ? parseFloat(rawB) : rawB.toLowerCase();

          if (typeof valA === "number" && typeof valB === "number") {
            return nuevoOrden === "asc" ? valA - valB : valB - valA;
          }
          return rawA.localeCompare(rawB, 'es', { sensitivity: 'base' }) * (nuevoOrden === "asc" ? 1 : -1);
        });

        const tbody = tabla.querySelector("tbody");
        [...normales, ...especiales].forEach(f => tbody.appendChild(f));

        th.setAttribute("data-orden", nuevoOrden);
      });
    });
  }

  function habilitarDescargaExcel(nombreArchivo = "enfermeras-nacional.xlsx") {
    const boton = document.getElementById("descargar-excel");
    if (!boton) return;

    boton.addEventListener("click", () => {
      const tabla = document.querySelector("#tabla-contenido table");
      if (!tabla) return;

      const sel = document.getElementById("sel-metrica");
      const metricKey = sel ? sel.value : "tasa_total";
      const nombreBonito = (METRICAS[metricKey]?.label || "Total").replace(/\s+/g, " ");

      const wb = XLSX.utils.table_to_book(tabla, { sheet: `Resumen ${nombreBonito}` });
      const nombre = nombreArchivo.replace(".xlsx", ` - ${nombreBonito}.xlsx`);
      XLSX.writeFile(wb, nombre);
    });
  }

  // Inicializa tabla y Excel
  initTablaNacional("../data/rate/republica-mexicana.csv");
  habilitarDescargaExcel("enfermeras-nacional.xlsx");

  // UI: selector para mapa + tabla
  const sel = document.getElementById("sel-metrica");
  if (sel) {
    sel.addEventListener("change", () => {
      currentMetric = sel.value;
      recomputeAndPaint();                // mapa
      updateTablaNacional(currentMetric); // tabla
    });
  }
}).catch(error => {
  console.error("Error al cargar los datos del mapa nacional:", error);
});

// ==============================
// DESCARGA PNG
// ==============================
document.getElementById("descargar-sin-etiquetas").addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "none";
  setTimeout(() => {
    descargarComoPNG("#mapa-nacional svg", "mapa-enfermeras-mexico-sin-nombres.png", MAP_WIDTH, MAP_HEIGHT);
  }, 100);
});

document.getElementById("descargar-con-etiquetas").addEventListener("click", () => {
  const etiquetas = document.getElementById("etiquetas-municipios");
  if (etiquetas) etiquetas.style.display = "block";
  setTimeout(() => {
    descargarComoPNG("#mapa-nacional svg", "mapa-enfermeras-mexico-con-nombres.png", MAP_WIDTH, MAP_HEIGHT);
    etiquetas.style.display = "none";
  }, 100);
});
