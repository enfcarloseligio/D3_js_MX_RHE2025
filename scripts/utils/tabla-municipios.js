export function generarTablaMunicipios(rutaCSV) {
  d3.csv(rutaCSV).then(data => {
    const contenedor = document.getElementById("tabla-contenido");

    const tabla = document.createElement("table");
    tabla.className = "tabla-datos";

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

    data.forEach(d => {
      const fila = document.createElement("tr");

      const celdaMunicipio = document.createElement("td");
      celdaMunicipio.className = "municipio";
      celdaMunicipio.textContent = d.municipio;

      const celdaEnfermeras = document.createElement("td");
      celdaEnfermeras.className = "numero";
      celdaEnfermeras.textContent = Number(d.enfermeras).toLocaleString('es-MX');

      const celdaPoblacion = document.createElement("td");
      celdaPoblacion.className = "numero";
      celdaPoblacion.textContent = Number(d.población).toLocaleString('es-MX');

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

      // Asignar nueva flecha a este th
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
