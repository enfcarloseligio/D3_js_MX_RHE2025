// scripts/utils/enlaces.js
// ========================================================
// Enlaces centralizados para entidades y clínicas
// ========================================================

/** Slug básico para URLs (acentos, espacios, etc.) */
export function slugify(str = "") {
  return String(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // separa por guiones
    .replace(/^-+|-+$/g, "");      // recorta guiones extremos
}

/** Mapa de enlaces para las 32 entidades
 *  (ajusta rutas si tu estructura cambia)
 */
export const ENLACES_ENTIDAD = {
  "Aguascalientes": "../entidades/aguascalientes.html",
  "Baja California": "../entidades/baja-california.html",
  "Baja California Sur": "../entidades/baja-california-sur.html",
  "Campeche": "../entidades/campeche.html",
  "Chiapas": "../entidades/chiapas.html",
  "Chihuahua": "../entidades/chihuahua.html",
  "Ciudad de México": "../entidades/ciudad-de-mexico.html",
  "Coahuila de Zaragoza": "../entidades/coahuila.html",
  "Colima": "../entidades/colima.html",
  "Durango": "../entidades/durango.html",
  "Estado de México": "../entidades/estado-de-mexico.html",
  "Guanajuato": "../entidades/guanajuato.html",
  "Guerrero": "../entidades/guerrero.html",
  "Hidalgo": "../entidades/hidalgo.html",
  "Jalisco": "../entidades/jalisco.html",
  "Michoacán": "../entidades/michoacan.html",
  "Morelos": "../entidades/morelos.html",
  "Nayarit": "../entidades/nayarit.html",
  "Nuevo León": "../entidades/nuevo-leon.html",
  "Oaxaca": "../entidades/oaxaca.html",
  "Puebla": "../entidades/puebla.html",
  "Querétaro": "../entidades/queretaro.html",
  "Quintana Roo": "../entidades/quintana-roo.html",
  "San Luis Potosí": "../entidades/san-luis-potosi.html",
  "Sinaloa": "../entidades/sinaloa.html",
  "Sonora": "../entidades/sonora.html",
  "Tabasco": "../entidades/tabasco.html",
  "Tamaulipas": "../entidades/tamaulipas.html",
  "Tlaxcala": "../entidades/tlaxcala.html",
  "Veracruz de Ignacio de la Llave": "../entidades/veracruz.html",
  "Yucatán": "../entidades/yucatan.html",
  "Zacatecas": "../entidades/zacatecas.html"
};

/** URL para una entidad; usa el mapa anterior y, si no encuentra,
 *  hace fallback a slug en ../entidades/<slug>.html
 */
export function urlEntidad(nombreEntidad) {
  const limpio = (nombreEntidad || "").trim();
  if (!limpio) return null;
  if (ENLACES_ENTIDAD[limpio]) return ENLACES_ENTIDAD[limpio];

  // Fallback por si agregas entidades/variantes nuevas
  return `../entidades/${slugify(limpio)}.html`;
}

/** URL para una clínica.
 *  Preferimos CLUES si existe (estable y único).
 *  Estructura sugerida: ../clinicas/clinica-<clues>.html
 *  Fallback: ../clinicas/clinica-<slug-unidad>-<slug-entidad>.html
 */
export function urlClinica(d = {}, opts = {}) {
  const base = opts.base || "../clinicas";
  const clues = (d.clues || d.CLUES || "").trim().toUpperCase();
  if (clues) return `${base}/clinica-${clues}.html`;

  const unidad = (d.unidad || d.NOMBRE_UNIDAD || "").trim();
  const entidad = (d.entidad || d.Entidad || "").trim();
  if (!unidad && !entidad) return null;

  return `${base}/clinica-${slugify(unidad)}-${slugify(entidad)}.html`;
}
