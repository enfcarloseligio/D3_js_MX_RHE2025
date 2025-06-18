// ==============================
// CONFIGURACIÓN DEL MAPA DE NAYARIT
// ==============================

const width = 960;
const height = 600;

const svg = d3.select("#mapa-nayarit")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background-color", "#e6f0f8");

const projection = d3.geoMercator()
  .scale(50)
  .center([-104.8, 22.5])
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

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
// CARGA DE DATOS Y RENDERIZADO
// ==============================

let colorScale;

Promise.all([
  d3.json("../data/entidades/mapa-nayarit.json"),
  d3.csv("../data/tasas/tasas-enfermeras-nayarit.csv")
]).then(([geoData, tasas]) => {

  const tasaMap = {};
  tasas.forEach(d => {
    tasaMap[d.municipio] = {
      tasa: +d.tasa,
      poblacion: +d.población,
      enfermeras: +d.enfermeras
    };
  });

  const tasasArray = tasas.map(d => +d.tasa);
  const minTasa = d3.min(tasasArray);
  const maxTasa = d3.max(tasasArray);

  colorScale = d3.scaleLinear()
    .domain([0.76, 1.56, 2.06, 3.45, 5.32])
    .range(['#e6d194', '#f7944d', '#d63c4f', '#9b2247', '#004d00']);

  svg.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const nombre = d.properties.NOMGEO;
      const datos = tasaMap[nombre];
      return datos ? colorScale(datos.tasa) : "#ccc";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const nombre = d.properties.NOMGEO;
      const datos = tasaMap[nombre];
      tooltip
        .html(`
          <strong>${nombre}</strong><br>
          Tasa: ${datos ? datos.tasa.toFixed(2) : "sin datos"}<br>
          Población: ${datos ? datos.poblacion.toLocaleString() : "—"}<br>
          Enfermeras: ${datos ? datos.enfermeras.toLocaleString() : "—"}
        `)
        .style("display", "block");
      d3.select(this).attr("stroke-width", 1.5);
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

  // ==============================
  // LEYENDA FIJA POR CUARTILES
  // ==============================

  const legendWidth = 20;
  const legendHeight = 200;

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

  linearGradient.selectAll("stop")
    .data([
      { offset: "0%", color: '#e6d194' },
      { offset: "25%", color: '#f7944d' },
      { offset: "50%", color: '#d63c4f' },
      { offset: "75%", color: '#9b2247' },
      { offset: "100%", color: '#004d00' }
    ])
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  svg.append("rect")
    .attr("x", 30)
    .attr("y", 50)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  const legendScale = d3.scaleLinear()
    .domain([0.76, 5.32])
    .range([legendHeight + 50, 50]);

  const legendAxis = d3.axisRight(legendScale)
    .tickValues([0.76, 1.56, 2.06, 3.45, 5.32])
    .tickFormat(d3.format(".2f"));

  svg.append("g")
    .attr("transform", `translate(${30 + legendWidth}, 0)`)
    .call(legendAxis);

}).catch(error => {
  console.error("Error al cargar datos del mapa de Nayarit:", error);
});

// ==============================
// BOTÓN PARA DESCARGAR PNG
// ==============================

document.getElementById("descargar-png").addEventListener("click", function () {
  const svgElement = document.querySelector("#mapa-nayarit svg");
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const width = svgElement.viewBox?.baseVal.width || svgElement.getBoundingClientRect().width;
  const height = svgElement.viewBox?.baseVal.height || svgElement.getBoundingClientRect().height;

  canvas.width = width;
  canvas.height = height;

  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = function () {
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = png;
    a.download = "mapa-enfermeras-nayarit.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  image.src = url;
});
