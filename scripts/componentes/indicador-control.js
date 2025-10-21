// scripts/componentes/indicador-control.js
// ==============================
// Componente: Control de Métrica
// (mismo layout que Marcadores)
// ==============================

export function renderIndicadorControl(selector, { defaultValue = "tasa_total" } = {}) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = `
    <div class="ic-row">
      <label for="sel-metrica" class="ic-label">Indicador:</label>
      <select id="sel-metrica" class="ic-select">
        <option value="tasa_total">Tasa total</option>
        <option value="poblacion">Población</option>
        <option value="tasa_primer">Tasa 1er nivel</option>
        <option value="tasa_segundo">Tasa 2º nivel</option>
        <option value="tasa_tercer">Tasa 3er nivel</option>
        <option value="tasa_apoyo">Tasa en establecimientos de apoyo</option>
        <option value="tasa_escuelas">Tasa en escuelas</option>
        <option value="tasa_administrativas">Tasa en áreas administrativas</option>
        <option value="tasa_no_aplica">Tasa no aplica</option>
        <option value="tasa_no_asignado">Tasa no asignado</option>
      </select>
    </div>
  `;

  const sel = container.querySelector("#sel-metrica");
  if (sel && defaultValue) sel.value = defaultValue;
}
