// ===============================================
// FUNCIÓN PRINCIPAL PARA GENERAR LA TABLA
// ===============================================
export function generarTablaMunicipios(rutaCSV) {
  d3.csv(rutaCSV).then(data => {
    const contenedor = document.getElementById("tabla-contenido");

    // Crear estructura base de la tabla
    const tabla = document.createElement("table");
    tabla.className = "tabla-datos";

    // Encabezado
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

    // Orden inicial: dejar registros 888 (No disponible) y 999 (Total) al final
    data.sort((a, b) => {
      if (a.id === "999") return 1;
      if (b.id === "999") return -1;
      if (a.id === "888") return 1;
      if (b.id === "888") return -1;
      return a.municipio.localeCompare(b.municipio);
    });

    // Crear filas con datos
    data.forEach(d => {
      const fila = document.createElement("tr");
      fila.dataset.id = d.id; // Guardamos el id para uso posterior

      const celdaMunicipio = document.createElement("td");
      celdaMunicipio.className = "municipio";
      celdaMunicipio.textContent = d.municipio;

      const celdaEnfermeras = document.createElement("td");
      celdaEnfermeras.className = "numero";
      celdaEnfermeras.textContent = Number(d.enfermeras).toLocaleString("es-MX");

      const celdaPoblacion = document.createElement("td");
      celdaPoblacion.className = "numero";
      celdaPoblacion.textContent = Number(d.población).toLocaleString("es-MX");

      const celdaTasa = document.createElement("td");
      celdaTasa.className = "numero";
      celdaTasa.textContent = (+d.tasa).toFixed(2);

      fila.appendChild(celdaMunicipio);
      fila.appendChild(celdaEnfermeras);
      fila.appendChild(celdaPoblacion);
      fila.appendChild(celdaTasa);

      tbody.appendChild(fila);
    });

    tabla.appendChild(thead);
    tabla.appendChild(tbody);

    const envoltorio = document.createElement("div");
    envoltorio.className = "tabla-scroll";
    envoltorio.appendChild(tabla);

    contenedor.appendChild(envoltorio);

    activarOrdenamientoTabla(tabla); // Activar ordenamiento interactivo
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

      // Separar filas con id 888 y 999 (datos especiales que deben ir al final)
      const especiales = filas.filter(f => ["888", "999"].includes(f.dataset.id));
      const normales = filas.filter(f => !["888", "999"].includes(f.dataset.id));

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
