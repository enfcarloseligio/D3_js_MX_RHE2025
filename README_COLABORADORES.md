
# 🧩 Guía para colaborar en este proyecto (paso a paso)

## 👋 Bienvenida

Gracias por colaborar en este proyecto. Aquí aprenderás cómo trabajar desde Visual Studio Code y contribuir correctamente al repositorio sin afectar la rama principal (`main`).

---

## ✅ Requisitos básicos

1. Tener instalado **Git** → [https://git-scm.com](https://git-scm.com)
2. Tener instalado **Visual Studio Code** → [https://code.visualstudio.com](https://code.visualstudio.com)
3. Tener cuenta en **GitHub**
4. Aceptar la invitación como colaborador del repositorio

---

## 🧭 Glosario rápido

| Término         | Significado sencillo |
|-----------------|----------------------|
| **Clonar**      | Descargar el proyecto a tu computadora |
| **Rama**        | Una copia paralela del proyecto donde puedes trabajar sin afectar la versión principal |
| **Commit**      | Guardar un cambio realizado |
| **Push**        | Enviar tus cambios a GitHub |
| **Pull Request (PR)** | Solicitar que tus cambios sean revisados y añadidos al proyecto principal |

---

## 🔧 Flujo de trabajo desde Visual Studio Code

### 🔐 Antes de comenzar: Configura tu nombre y correo

Solo la primera vez, en la terminal escribe:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tunombre@ejemplo.com"
```

Esto es necesario para que tus commits queden registrados con tu nombre.

---

### 1. Clona el repositorio (solo la primera vez)

Abre la terminal integrada en VSCode (`Ctrl + ñ`) y ejecuta:

```bash
git clone https://github.com/enfcarloseligio/D3_js_MX_RHE2025.git
cd D3_js_MX_RHE2025
```

---

### 2. Crea una nueva rama

En la terminal escribe:

```bash
git checkout -b nombre-de-tu-rama
```

Ejemplo:

```bash
git checkout -b feature/mapa-tabasco
```

---

### 3. Realiza tus cambios

Edita los archivos del proyecto (HTML, CSS, JS, CSV, etc.) desde el editor normalmente.

---

### 4. Guarda y haz commit (desde VSCode)

1. Ve a la vista de **Control de Código Fuente** (icono de ramas en la barra izquierda).
2. Escribe un mensaje claro en el campo que aparece arriba.
3. Da clic en el botón `✓` (Commit) o en los tres puntos `⋮` y selecciona **Commit**.

---

### 5. Envía tus cambios a GitHub (Push desde VSCode)

- Luego del commit, aparecerá una notificación o botón **"Sync Changes"** o **"Push"** en la barra inferior.
- Haz clic para subir tus cambios.

---

### 6. Crea el Pull Request (desde VSCode)

Después del push, VSCode sugerirá crear un Pull Request.  
Si no aparece:

1. Ve a la vista de **Control de Código Fuente**
2. Clic en `⋮` (arriba a la derecha)
3. Selecciona **"Create Pull Request"**
4. Escribe un título y descripción
5. Asegúrate de que sea hacia `main`
6. Haz clic en **"Create"**

---

## 📣 Buenas prácticas

- No trabajes directamente en la rama `main`
- Usa nombres descriptivos para tus ramas (`feature/mapa`, `fix/título`)
- Escribe mensajes de commit claros y breves
- Solicita ayuda si tienes dudas

---

## 📩 ¿Dudas?

Comenta dentro de tu Pull Request o contacta al administrador del proyecto.
