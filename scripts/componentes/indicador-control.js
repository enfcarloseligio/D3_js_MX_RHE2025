// ==============================
// Componente: Control de Métrica
// ==============================

export function renderIndicadorControl(selector, { defaultValue = "tasa_total" } = {}) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = `
    <div class="control-metrica" style="margin:8px">
      <label for="sel-metrica"><strong>Indicador:</strong></label>
      <select id="sel-metrica">
        <option value="tasa_total">Tasa total</option>
        <option value="poblacion">Población</option>
        <option value="tasa_primer">Tasa 1er nivel</option>
        <option value="tasa_segundo">Tasa 2º nivel</option>
        <option value="tasa_tercer">Tasa 3er nivel</option>
        <option value="tasa_apoyo">Tasa en establecimientos de apoyo</option>
        <option value="tasa_escuelas">Tasa en escuelas</option>
        <option value="tasa_no_aplica">Tasa no aplica</option>
        <option value="tasa_no_asignado">Tasa no asignado</option>
      </select>
    </div>
  `;

  // Seleccionar valor inicial
  const sel = container.querySelector("#sel-metrica");
  if (sel && defaultValue) {
    sel.value = defaultValue;
  }
}
