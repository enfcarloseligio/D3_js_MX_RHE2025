// scripts/componentes/marcadores-control.js
// ===================================================
// Renderiza un selector multi de marcadores reutilizable
// ===================================================

/**
 * renderMarcadoresControl(host, { items, label, placeholder })
 * - host: selector o nodo donde inyectar el control
 * - items: [{ value: "CATETER", label: "Clínicas de catéteres" }, ...]
 * - label: texto del label (default "Marcadores")
 * - placeholder: texto inicial (default "Selecciona uno o varios marcadores.")
 *
 * Retorna API: { getSelected, setSelected, onChange }
 */
export function renderMarcadoresControl(
  host,
  { items = [], label = "Marcadores", placeholder = "Selecciona uno o varios marcadores." } = {}
) {
  const container =
    typeof host === "string" ? document.querySelector(host) : host;
  if (!container) throw new Error("Host no encontrado para marcadores-control");

  // Mapa value -> label (para mostrar nombres bonitos en el trigger)
  const labelByValue = new Map(items.map(it => [String(it.value), String(it.label)]));

  // Limpia contenedor
  container.innerHTML = "";

  // Envoltura principal (igual estilo a Indicador)
  const row = document.createElement("div");
  row.className = "mc-row";

  // Label
  const lbl = document.createElement("label");
  lbl.className = "mc-label";
  lbl.textContent = label + ":";
  row.appendChild(lbl);

  // Campo
  const field = document.createElement("div");
  field.className = "mc-field";
  row.appendChild(field);

  // Botón disparador (imitando <select>)
  const trigger = document.createElement("div");
  trigger.className = "mc-trigger is-placeholder";
  trigger.textContent = placeholder;
  field.appendChild(trigger);

  // Menú desplegable
  const menu = document.createElement("div");
  menu.className = "mc-menu";
  field.appendChild(menu);

  // Opciones
  items.forEach(({ value, label }) => {
    const opt = document.createElement("div");
    opt.className = "mc-option";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = value;
    chk.className = "mc-check";

    const span = document.createElement("span");
    span.textContent = label;

    opt.appendChild(chk);
    opt.appendChild(span);
    menu.appendChild(opt);
  });

  container.appendChild(row);

  // Estado
  function getSelected() {
    return Array.from(menu.querySelectorAll("input:checked")).map(c => c.value);
  }

  function setSelected(values = []) {
    const set = new Set(values.map(v => String(v)));
    menu.querySelectorAll("input").forEach(c => {
      c.checked = set.has(String(c.value));
    });
    updateTrigger();
  }

  function updateTrigger() {
    const selected = getSelected();
    if (selected.length === 0) {
      trigger.textContent = placeholder;
      trigger.classList.add("is-placeholder");
    } else {
      // 🔧 Ahora usamos el mapa value->label (no nextSibling)
      const labels = selected.map(v => labelByValue.get(String(v)) || String(v));
      trigger.textContent = labels.join(", ");
      trigger.classList.remove("is-placeholder");
    }
  }

  function onChange(handler) {
    menu.addEventListener("change", () => {
      updateTrigger();
      handler(getSelected());
    });
  }

  // Eventos
  trigger.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!field.contains(e.target)) {
      menu.classList.remove("open");
    }
  });

  return { getSelected, setSelected, onChange };
}
