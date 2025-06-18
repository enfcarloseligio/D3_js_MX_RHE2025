// ==============================
// CONFIGURACIÓN GENERAL Y ENTORNO
// ==============================

// Dimensiones del mapa
const width = 960;
const height = 600;

// Crear el contenedor SVG en el div con id "mapa"
const svg = d3.select("#mapa-nacional")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background-color", "#81D4FA"); // Fondo azul claro

// Configurar proyección geográfica centrada en México
const projection = d3.geoMercator()
  .scale(1500)
  .center([-102, 24])
  .translate([width / 2, height / 2]);

// Generador de rutas geográficas usando la proyección
const path = d3.geoPath().projection(projection);


// ==============================
// ESCALA DE COLORES Y LEYENDA
// ==============================

// Escala de colores para la tasa de enfermeras
const colorScale = d3.scaleLinear()
  .domain([2.01, 2.39, 2.78, 3.30, 5.89]) // Dominios definidos por rangos significativos
  .range(['#9b2247', 'orange', '#e6d194', 'green', 'darkgreen']); // Paleta institucional

// Dimensiones de la leyenda
const legendWidth = 20;
const legendHeight = 200;

// Definir el gradiente para la leyenda
const defs = svg.append("defs");
const linearGradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%").attr("y1", "100%")
  .attr("x2", "0%").attr("y2", "0%");

// Agregar los colores al gradiente
linearGradient.selectAll("stop")
  .data([
    { offset: "0%", color: '#9b2247' },
    { offset: "25%", color: 'orange' },
    { offset: "50%", color: '#e6d194' },
    { offset: "75%", color: 'green' },
    { offset: "100%", color: 'darkgreen' }
  ])
  .enter().append("stop")
  .attr("offset", d => d.offset)
  .attr("stop-color", d => d.color);

// Dibujar la barra de leyenda
svg.append("rect")
  .attr("x", 30)
  .attr("y", 50)
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", "url(#legend-gradient)");

// Escala para eje de leyenda
const legendScale = d3.scaleLinear()
  .domain([2.01, 5.89])
  .range([legendHeight + 50, 50]);

// Eje de leyenda a la derecha de la barra
const legendAxis = d3.axisRight(legendScale)
  .tickValues([2.01, 2.39, 2.78, 3.30, 5.89])
  .tickFormat(d3.format(".2f"));

svg.append("g")
  .attr("transform", `translate(${30 + legendWidth}, 0)`)
  .call(legendAxis);


// ==============================
// TOOLTIP (CUADRO DE INFORMACIÓN DINÁMICO)
// ==============================

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("padding", "10px")
  .style("background", "white")
  .style("border", "1px solid #999")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("display", "none")
  .style("font-family", "sans-serif");


// ==============================
// CARGA Y RENDERIZADO DE DATOS
// ==============================

Promise.all([
  d3.json("../data/entidades-mx.json"),      // GeoJSON nacional
  d3.csv("../data/tasas-enfermeras-mx.csv")       // CSV nacional
]).then(([geoData, tasas]) => {

  // Crear diccionario de datos por estado
  const tasaMap = {};
  tasas.forEach(d => {
    tasaMap[d.estado] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  // Dibujar estados en el mapa
  svg.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const nombre = d.properties.NOMBRE;
      const datos = tasaMap[nombre];
      return datos ? colorScale(datos.tasa) : "#ccc"; // Gris si no hay datos
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMBRE;
      const datos = tasaMap[nombre];
      tooltip
        .html(`
          <strong>${nombre}</strong><br>
          Tasa: ${datos ? datos.tasa.toFixed(2) : "sin datos"}<br>
          Población: ${datos ? datos.poblacion.toLocaleString() : "—"}<br>
          Enfermeras: ${datos ? datos.enfermeras.toLocaleString() : "—"}
        `)
        .style("display", "block");
      d3.select(this).attr("stroke-width", 1.5); // Resalta borde
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("display", "none");
      d3.select(this).attr("stroke-width", 0.5);
    });

}).catch(error => {
  console.error("Error al cargar los datos:", error);
});


// ==============================
// DESCARGAR EL MAPA COMO PNG
// ==============================

document.getElementById("descargar-png").addEventListener("click", function () {
  const svgElement = document.querySelector("#mapa-nacional svg");
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // Establecer dimensiones
  const width = svgElement.viewBox.baseVal.width || svgElement.getBoundingClientRect().width;
  const height = svgElement.viewBox.baseVal.height || svgElement.getBoundingClientRect().height;

  canvas.width = width;
  canvas.height = height;

  // Crear imagen y dibujar en canvas
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = function () {
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL("image/png");

    // Crear enlace de descarga y activar
    const a = document.createElement("a");
    a.href = png;
    a.download = "mapa-tasa-enfermeras-mexico.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  image.src = url;
});
