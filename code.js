// ==============================
// INSERCIÓN DE AÑO DINÁMICO GLOBAL
// ==============================

export function insertarAñoDinamico() {
  const currentYear = new Date().getFullYear();
  document.querySelectorAll(".year").forEach(el => {
    el.textContent = currentYear;
  });
}
