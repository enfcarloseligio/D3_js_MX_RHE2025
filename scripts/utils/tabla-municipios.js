// ===============================================
// FUNCIÓN PRINCIPAL PARA GENERAR LA TABLA
// ===============================================
export function generarTablaMunicipios(rutaCSV) {
  d3.csv(rutaCSV).then(data => {
    const contenedor = document.getElementById("tabla-contenido");

    // Crear estructura base de la tabla
    const tabla = document.createElement("table");
    tabla.className = "tabla-datos";

    // Crear encabezado de la tabla
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th><span class="flecha-orden"></span>Municipio</th>
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
      return a.municipio.localeCompare(b.municipio);
    });

    // Generar filas dinámicamente
    data.forEach(d => {
      const fila = document.createElement("tr");
      fila.dataset.id = d.id;

      // Aplicar clase especial a la fila de totales (id 999)
      if (d.id === "9999") {
        fila.classList.add("fila-total");
      }

      // Celda: Municipio
      const celdaMunicipio = document.createElement("td");
      celdaMunicipio.className = "municipio";
      celdaMunicipio.textContent = d.municipio;

      // Celda: Enfermeras
      const celdaEnfermeras = document.createElement("td");
      celdaEnfermeras.className = "numero";
      celdaEnfermeras.textContent = Number(d.enfermeras).toLocaleString("es-MX");

      // Celda: Población
      const celdaPoblacion = document.createElement("td");
      celdaPoblacion.className = "numero";
      celdaPoblacion.textContent = Number(d.población).toLocaleString("es-MX");

      // Celda: Tasa
      const celdaTasa = document.createElement("td");
      celdaTasa.className = "numero";
      celdaTasa.textContent = (+d.tasa).toFixed(2);

      // Añadir celdas a la fila
      fila.appendChild(celdaMunicipio);
      fila.appendChild(celdaEnfermeras);
      fila.appendChild(celdaPoblacion);
      fila.appendChild(celdaTasa);

      // Añadir fila al cuerpo de la tabla
      tbody.appendChild(fila);
    });

    // Armar la tabla
    tabla.appendChild(thead);
    tabla.appendChild(tbody);

    // Envolver tabla para scroll
    const envoltorio = document.createElement("div");
    envoltorio.className = "tabla-scroll";
    envoltorio.appendChild(tabla);

    // Inyectar en el contenedor
    contenedor.appendChild(envoltorio);

    // Activar ordenamiento interactivo
    activarOrdenamientoTabla(tabla);
  }).catch(error => {
    console.error("Error al cargar la tabla de municipios:", error);
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

      // Limpiar todas las flechas
      tabla.querySelectorAll(".flecha-orden").forEach(span => span.textContent = "");

      // Mostrar flecha en la columna activa
      const flecha = th.querySelector(".flecha-orden");
      if (flecha) flecha.textContent = nuevoOrden === "asc" ? "▲" : "▼";

      const filas = Array.from(tabla.querySelectorAll("tbody tr"));

      // Separar filas con id 8888 y 9999 (datos especiales que deben ir al final)
      const especiales = filas.filter(f => ["8888", "9999"].includes(f.dataset.id));
      const normales = filas.filter(f => !["8888", "9999"].includes(f.dataset.id));

      // Ordenar filas normales según la columna seleccionada
      normales.sort((a, b) => {
        const celdaA = a.children[index].textContent.trim().replace(/,/g, "");
        const celdaB = b.children[index].textContent.trim().replace(/,/g, "");

        const valorA = isNaN(celdaA) ? celdaA.toLowerCase() : parseFloat(celdaA);
        const valorB = isNaN(celdaB) ? celdaB.toLowerCase() : parseFloat(celdaB);

        if (valorA < valorB) return nuevoOrden === "asc" ? -1 : 1;
        if (valorA > valorB) return nuevoOrden === "asc" ? 1 : -1;
        return 0;
      });

      // Reinsertar filas: primero normales, después especiales
      const tbody = tabla.querySelector("tbody");
      [...normales, ...especiales].forEach(fila => tbody.appendChild(fila));

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
    const tabla = document.querySelector("#tabla-contenido table");
    if (!tabla) return;

    const wb = XLSX.utils.table_to_book(tabla, { sheet: "Resumen Municipal" });
    XLSX.writeFile(wb, nombreArchivo);
  });
}
const fila = document.createElement("tr");
