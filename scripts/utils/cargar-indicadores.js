document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("contenedor-indicadores");

  d3.csv("../data/indicators/indicadores-clave.csv").then(data => {
    const row = data[0]; // Solo hay una fila

    const etiquetas = {
      enfermeras: { nombre: "Enfermeras registradas", unidad: "" },
      tasa: { nombre: "Tasa nacional", unidad: "por cada mil habitantes" },
      edad: { nombre: "Promedio de edad", unidad: "años" },
      licenciatura: { nombre: "Con nivel académico", unidad: "%" },
    };

    const formatearNumero = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    Object.keys(row).forEach(key => {
      let valor = row[key];
      if (valor) {
        const { nombre, unidad } = etiquetas[key] || { nombre: key, unidad: "" };
        const valorFormateado = formatearNumero.format(parseFloat(valor));
        const div = document.createElement("div");
        div.className = "indicador";
        div.innerHTML = `
          <strong>${valorFormateado}</strong><br>
          ${nombre}${unidad ? ` (${unidad})` : ""}
        `;
        contenedor.appendChild(div);
      }
    });
  }).catch(error => {
    console.error("Error al cargar los indicadores:", error);
  });
});
