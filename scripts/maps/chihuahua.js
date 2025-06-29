<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{{descripcion}}" />
  <meta name="author" content="Secretaría de Salud - Dirección General de Calidad y Educación en Salud - Dirección de Enfermería" />
  <meta name="keywords" content="enfermería, salud, SIARHE, enfermeras, México, distribución, mapa, 2025" />
  <title>{{titulo}}</title>

  <!-- Estilos -->
  <link rel="stylesheet" href="../styles.css" />
  <link rel="stylesheet" href="../styles/mapas.css" />

  <!-- Librerías externas -->
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

  <!-- Scripts internos -->
  <script src="../scripts/inyectar-layout.js" defer></script>
  {{scriptEntidad}}
</head>

<body>
<main id="contenido-principal">
  <!-- Aquí se insertará el contenido específico de cada entidad -->
</main>

<script type="module">
  import { generarTablaMunicipios, habilitarDescargaExcel } from '../scripts/utils/tabla-municipios.js';

  const entidad = location.pathname.split("/").pop().replace(".html", "");
  generarTablaMunicipios(`../data/tasas/tasas-enfermeras-${entidad}.csv`);
  habilitarDescargaExcel(`enfermeras-${entidad}.xlsx`);
</script>

</body>
</html>
