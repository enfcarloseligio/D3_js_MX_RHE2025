// scripts/componentes/zoom-controles.js
// Componente reutilizable de controles de zoom para todos los mapas

import { activarZoomConBotones } from "../utils/config-mapa.js";

/**
 * Renderiza controles de zoom (±, reset y home) y los conecta al mapa.
 *
 * @param {string|Element} mountSelector - Selector o nodo donde insertar el UI.
 * @param {object} opts
 *   - svg:        selección D3 del SVG (OBLIGATORIO)
 *   - g:          selección D3 del <g> que se transforma (OBLIGATORIO)
 *   - showHome:   bool, si debe mostrar botón Home (default: false)
 *   - homeHref:   string, URL del botón Home (default: "../entidades/republica-mexicana.html")
 *   - idsPrefix:  string, prefijo único para los IDs de botones (default: "zc")
 *   - zoom:       instancia d3.zoom() personalizada (opcional)
 *   - escalaMin / escalaMax / paso: límites y paso del zoom (opcional)
 */
export function renderZoomControles(mountSelector, opts = {}) {
  const {
    svg,
    g,
    showHome = false,
    homeHref = "../entidades/republica-mexicana.html",
    idsPrefix = "zc",
    zoom = null,               // si lo pasas, se usa en lugar del zoom genérico
    escalaMin = 1,
    escalaMax = 8,
    paso = 0.5,
  } = opts;

  if (!svg || !g) {
    console.warn("[zoom-controles] svg y g son obligatorios.");
    return;
  }

  const mount =
    typeof mountSelector === "string"
      ? document.querySelector(mountSelector)
      : mountSelector;

  if (!mount) {
    console.warn("[zoom-controles] No se encontró el contenedor de montaje:", mountSelector);
    return;
  }

  // Crea contenedor raíz si hace falta
  let cont = mount.querySelector(".zoom-controles");
  if (!cont) {
    cont = document.createElement("div");
    cont.className = "zoom-controles";
    mount.appendChild(cont);
  }

  // IDs únicos por prefijo
  const idIn = `${idsPrefix}-zoom-in`;
  const idOut = `${idsPrefix}-zoom-out`;
  const idReset = `${idsPrefix}-zoom-reset`;
  const idHome = `${idsPrefix}-zoom-home`;

  // Crea un botón si no existe (evita duplicados)
  const ensureBtn = (id, label, title) => {
    let btn = cont.querySelector(`#${id}`);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = id;
      btn.className = "boton";
      btn.textContent = label;
      btn.title = title;
      btn.setAttribute("aria-label", title);
      cont.appendChild(btn);
    }
    return btn;
  };

  const btnIn = ensureBtn(idIn, "+", "Acercar");
  const btnOut = ensureBtn(idOut, "–", "Alejar");
  const btnReset = ensureBtn(idReset, "⟳", "Restablecer");

  let btnHome = null;
  if (showHome) {
    btnHome = ensureBtn(idHome, "🏠", "Volver al mapa nacional");
    btnHome.addEventListener("click", () => (window.location.href = homeHref));
  } else {
    // Si existe de antes, lo oculto (por si reuso layouts)
    const old = cont.querySelector(`#${idHome}`);
    if (old) old.remove();
  }

  // Si nos pasaron un d3.zoom() personalizado, lo usamos
  if (zoom) {
    // Asegura límites si no vinieron en la instancia
    zoom.scaleExtent([escalaMin, escalaMax]);

    // Vincula zoom personalizado al SVG (si no se hizo antes)
    // Nota: llamar varias veces .call(zoom) está bien, no duplica listeners
    svg.call(zoom);

    // Conectar botones a TU instancia de zoom
    btnIn.addEventListener("click", () => {
      svg.transition().call(zoom.scaleBy, 1 + paso);
    });

    btnOut.addEventListener("click", () => {
      svg.transition().call(zoom.scaleBy, 1 - paso);
    });

    btnReset.addEventListener("click", () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity);
    });

    return { idIn, idOut, idReset, idHome: showHome ? idHome : null, usingCustomZoom: true };
  }

  // Si no, uso el helper genérico (aplica transform al <g>)
  activarZoomConBotones(svg, g, {
    selectorZoomIn: `#${idIn}`,
    selectorZoomOut: `#${idOut}`,
    selectorZoomReset: `#${idReset}`,
    escalaMin,
    escalaMax,
    paso,
  });

  return { idIn, idOut, idReset, idHome: showHome ? idHome : null, usingCustomZoom: false };
}
