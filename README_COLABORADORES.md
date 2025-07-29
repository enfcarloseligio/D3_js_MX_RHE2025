
# 🛡️ Reglas de colaboración y protección del repositorio

Este repositorio está protegido para asegurar la calidad y trazabilidad del trabajo colaborativo. A continuación, se detallan las reglas establecidas para la rama principal (`main`).

---

## 🔐 Protección de la rama `main`

- No se permiten modificaciones directas.
- Todo cambio debe hacerse mediante **Pull Request (PR)**.
- Se requiere al menos **1 aprobación** antes de fusionar un PR.
- Cada nuevo commit **revoca aprobaciones anteriores**.
- El historial debe ser **lineal** (sin commits con merge automáticos).
- Están **bloqueados los push forzados y eliminaciones** de la rama.
- Solo administradores pueden hacer push directo (para correcciones urgentes).

---

## 🔁 Flujo de trabajo para colaborar

1. Crea una nueva rama:
   ```bash
   git checkout -b nombre-de-tu-cambio
   ```

2. Realiza tus cambios y haz commit:
   ```bash
   git add .
   git commit -m "Descripción clara del cambio"
   ```

3. Envía tus cambios a GitHub:
   ```bash
   git push origin nombre-de-tu-cambio
   ```

4. Abre un Pull Request hacia `main`.
5. Espera revisión y aprobación.

---

## 👤 Rol del administrador

- Puede aprobar y hacer merge de PR.
- Tiene permisos para hacer push directo a `main` si es necesario.
- Revisa los PR y resuelve conflictos.

---

## 📣 Recomendaciones

- Nombres de ramas claros: `feature/mapa-tabasco`, `fix/leyenda-escala`
- Mensajes de commit explicativos
- No trabajar en `main`, ni para pruebas
- Solicitar ayuda si algo no funciona

---

¿Tienes dudas? Comenta en tu PR o escribe al admin del proyecto.
