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

  const colorScale = d3.scaleLinear()
    .domain([2.01, 2.39, 2.78, 3.30, 5.89])
    .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']);

  const projection = d3.geoMercator()
    .scale(1500)
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
  "Veracruz": "../entidades/veracruz.html",
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

  crearLeyenda(svg, {
    dominio: [2.01, 5.89],
    pasos: [2.01, 2.39, 2.78, 3.30, 5.89],
    colores: ['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']
  });

  activarZoomConBotones(svg, g, {
    selectorZoomIn: "#zoom-in",
    selectorZoomOut: "#zoom-out",
    selectorZoomReset: "#zoom-reset"
  });

  generarTablaNacional("../data/tasas-enfermeras-mx.csv");
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

    data.forEach(d => {
      const fila = document.createElement("tr");

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

      filas.sort((a, b) => {
        const celdaA = a.children[index].textContent.trim().replace(/,/g, "");
        const celdaB = b.children[index].textContent.trim().replace(/,/g, "");

        const valorA = isNaN(celdaA) ? celdaA.toLowerCase() : parseFloat(celdaA);
        const valorB = isNaN(celdaB) ? celdaB.toLowerCase() : parseFloat(celdaB);

        if (valorA < valorB) return nuevoOrden === "asc" ? -1 : 1;
        if (valorA > valorB) return nuevoOrden === "asc" ? 1 : -1;
        return 0;
      });

      const tbody = tabla.querySelector("tbody");
      filas.forEach(fila => tbody.appendChild(fila));

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
