document.addEventListener("DOMContentLoaded", () => {
  // Inyectar header
  fetch("../componentes/header.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("afterbegin", html);
    });

  // Inyectar footer
  fetch("../componentes/footer.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("beforeend", html);
    });
});