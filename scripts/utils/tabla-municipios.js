export function generarTablaMunicipios(rutaCSV) {
  d3.csv(rutaCSV).then(data => {
    const contenedor = document.getElementById("tabla-contenido");

    const tabla = document.createElement("table");
    tabla.className = "tabla-datos";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Municipio</th>
        <th>Enfermeras</th>
        <th>Población</th>
        <th>Tasa por cada mil habitantes</th>
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

    // ENVOLTORIO SCROLLABLE
    const envoltorio = document.createElement("div");
    envoltorio.className = "tabla-scroll";
    envoltorio.appendChild(tabla);

    contenedor.appendChild(envoltorio);
  }).catch(error => {
    console.error("Error al cargar la tabla de municipios:", error);
  });
}
