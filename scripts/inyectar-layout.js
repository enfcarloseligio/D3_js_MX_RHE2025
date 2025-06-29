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
