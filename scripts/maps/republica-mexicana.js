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

Promise.all([
  d3.json("../data/maps/republica-mexicana.geojson"),
  d3.csv("../data/rate/republica-mexicana.csv")
]).then(([geoData, tasas]) => {
  const tasaMap = {};
  tasas.forEach(d => {
    const estado = d.estado.trim();
    tasaMap[estado] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  // ======== CUARTILES DINÁMICOS (ids 1..32) ========
  const colores = ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']; // paleta institucional
  const idsEntidades = new Set(Array.from({ length: 32 }, (_, i) => String(i + 1)));
  const valores = tasas
    .filter(d => idsEntidades.has(String(d.id)))
    .map(d => +d.tasa)
    .filter(v => Number.isFinite(v))
    .sort(d3.ascending);

  let min = d3.min(valores);
  let max = d3.max(valores);
  let q1 = d3.quantileSorted(valores, 0.25);
  let q2 = d3.quantileSorted(valores, 0.50);
  let q3 = d3.quantileSorted(valores, 0.75);

  // Fallback si hubiera pocos datos válidos
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0; q1 = 1; q2 = 2; q3 = 3; max = 4;
  } else {
    const eps = 1e-12; // evita cortes iguales por empates
    if (!(q1 > min)) q1 = min + eps;
    if (!(q2 > q1)) q2 = q1 + eps;
    if (!(q3 > q2)) q3 = q2 + eps;
    if (!(max > q3)) max = q3 + eps;
  }

// Gradiente continuo entre min, Q1, Q2, Q3 y max
const colorScale = d3.scaleLinear()
  .domain([min, q1, q2, q3, max]) // stops del gradiente
  .range(colores)                  // ['#9b2247','orange','#e6d194','green','darkgreen']
  .interpolate(d3.interpolateRgb); // interpolación suave

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
    .attr("fill", d => {
      const nombre = d.properties.NOMBRE.trim();
      const datos = tasaMap[nombre];
      return datos ? colorScale(datos.tasa) : "#ccc";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMBRE.trim();
      const datos = tasaMap[nombre];
      d3.select(this).attr("stroke-width", 1.5);
      mostrarTooltip(tooltip, event, nombre, datos);
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

  // Leyenda dinámica con los mismos cortes
  crearLeyenda(svg, {
    dominio: [min, max],
    pasos: [min, q1, q2, q3, max],
    colores
  });

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

  generarTablaNacional("../data/rate/republica-mexicana.csv");
  habilitarDescargaExcel("enfermeras-nacional.xlsx");
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

// ==============================
// TABLA NACIONAL
// ==============================

function generarTablaNacional(rutaCSV) {
  d3.csv(rutaCSV).then(data => {
    const contenedor = document.getElementById("tabla-contenido");

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

    // Ordenar datos para colocar "No disponible" (8888) y "Total" (9999) al final
    data.sort((a, b) => {
      if (a.id === "9999") return 1;
      if (b.id === "9999") return -1;
      if (a.id === "8888") return 1;
      if (b.id === "8888") return -1;
      return a.estado.localeCompare(b.estado);
    });

    data.forEach(d => {
      const fila = document.createElement("tr");
      fila.dataset.id = d.id;

      if (d.id === "9999") {
        fila.classList.add("fila-total"); // estilo especial para el total
      }

      fila.innerHTML = `
        <td class="municipio">${d.estado}</td>
        <td class="numero">${Number(d.enfermeras).toLocaleString('es-MX')}</td>
        <td class="numero">${Number(d.población).toLocaleString('es-MX')}</td>
        <td class="numero">${(+d.tasa).toFixed(2)}</td>
      `;
      tbody.appendChild(fila);
    });

    tabla.appendChild(thead);
    tabla.appendChild(tbody);

    const envoltorio = document.createElement("div");
    envoltorio.className = "tabla-scroll";
    envoltorio.appendChild(tabla);

    contenedor.appendChild(envoltorio);

    activarOrdenamientoTabla(tabla);
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

      // Separar filas especiales (9999 y 8888)
      const especiales = filas.filter(f => ["8888", "9999"].includes(f.dataset.id));
      const normales = filas.filter(f => !["8888", "9999"].includes(f.dataset.id));

      // Ordenar solo las normales
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

      // Reinsertar: primero normales, luego especiales
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

    const wb = XLSX.utils.table_to_book(tabla, { sheet: "Resumen Nacional" });
    XLSX.writeFile(wb, nombreArchivo);
  });
}
