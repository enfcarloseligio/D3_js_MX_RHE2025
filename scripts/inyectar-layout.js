(async function inyectarLayout() {
  try {
    // Inyectar header
    const headerHtml = await fetch("../componentes/header.html").then(res => res.text());
    document.body.insertAdjacentHTML("afterbegin", headerHtml);

    // Inyectar banner justo antes del <main>
    const bannerHtml = await fetch("../componentes/banner.html").then(res => res.text());
    const main = document.querySelector("main");
    if (main) {
      main.insertAdjacentHTML("beforebegin", bannerHtml);
    }

    // Inyectar footer
    const footerHtml = await fetch("../componentes/footer.html").then(res => res.text());
    document.body.insertAdjacentHTML("beforeend", footerHtml);

  } catch (error) {
    console.error("Error al inyectar layout:", error);
  }
})();

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
