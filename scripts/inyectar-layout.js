// scripts/inyectar-layout.js
// ========================================
// Inyectar Layout Global (Header, Banner, Footer)
// ========================================
(async function inyectarLayout() {
  try {
    // Calcular la ruta base en función de la profundidad actual del path
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const depth = pathParts.length;
    const basePath = depth > 1 ? "../".repeat(depth - 1) : "";

    // Inyectar Header
    const headerHtml = await fetch(`${basePath}componentes/header.html`).then(res => res.text());
    document.body.insertAdjacentHTML("afterbegin", headerHtml);

    // Ajustar rutas relativas en <a data-rel="">
    ajustarRutasRelativas(basePath);

    // Inyectar Banner antes del <main>
    const bannerHtml = await fetch(`${basePath}componentes/banner.html`).then(res => res.text());
    const main = document.querySelector("main");
    if (main) {
      main.insertAdjacentHTML("beforebegin", bannerHtml);
    }

    // Inyectar Footer
    const footerHtml = await fetch(`${basePath}componentes/footer.html`).then(res => res.text());
    document.body.insertAdjacentHTML("beforeend", footerHtml);

  } catch (error) {
    console.error("❌ Error al inyectar layout:", error);
  }
})();

// ========================================
// Insertar favicon institucional
// ========================================
(function insertarFavicon() {
  const faviconUrl = "https://framework-gb.cdn.gob.mx/applications/cms/favicon.png";

  const link1 = document.createElement("link");
  link1.rel = "shortcut icon";
  link1.href = faviconUrl;

  const link2 = document.createElement("link");
  link2.rel = "icon";
  link2.href = faviconUrl;
  link2.type = "image/png";

  document.head.appendChild(link1);
  document.head.appendChild(link2);
})();

// ========================================
// Función para ajustar <a data-rel="...">
// ========================================
function ajustarRutasRelativas(basePath) {
  document.querySelectorAll("a[data-rel]").forEach(link => {
    const relPath = link.getAttribute("data-rel");
    link.setAttribute("href", `${basePath}${relPath}`);
  });
}
