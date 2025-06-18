document.addEventListener("DOMContentLoaded", () => {
  // Inyectar header
  fetch("../componentes/header.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("afterbegin", html);

      // Inyectar banner justo antes del <main>
      fetch("../componentes/banner.html")
        .then(res => res.text())
        .then(banner => {
          const main = document.querySelector("main");
          if (main) {
            main.insertAdjacentHTML("beforebegin", banner);
          }
        });
    });

  // Inyectar footer
  fetch("../componentes/footer.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("beforeend", html);
    });
});
