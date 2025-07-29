
# 🧩 Guía para colaborar en este proyecto (paso a paso)

## 👋 Bienvenida

Gracias por querer colaborar. Aquí aprenderás cómo enviar tus cambios al proyecto de forma organizada.  
No te preocupes si nunca has usado Git o GitHub, te explicamos paso por paso.

---

## ✅ Requisitos básicos

Antes de empezar, necesitas:

1. Tener instalado **Git** → [Descargar Git](https://git-scm.com/)
2. Tener instalado **Visual Studio Code** → [Descargar VSCode](https://code.visualstudio.com/)
3. Tener una cuenta en **GitHub** y haber aceptado la invitación como colaborador.

---

## 🧭 Glosario simple

| Término         | Significado sencillo |
|-----------------|----------------------|
| **Clonar**      | Descargar el proyecto a tu computadora. |
| **Rama**        | Una copia paralela del proyecto donde puedes trabajar sin afectar el original. |
| **Commit**      | Guardar los cambios que hiciste. |
| **Push**        | Enviar tus cambios a GitHub. |
| **Pull request**| Solicitar que tus cambios sean revisados y agregados al proyecto principal. |

---

## 🔧 Pasos para colaborar

### 1. Clona el repositorio (descargar el proyecto)

Abre VSCode y en la terminal (`Ctrl + ñ`), escribe:

```bash
git clone https://github.com/enfcarloseligio/D3_js_MX_RHE2025.git
cd D3_js_MX_RHE2025
```

---

### 2. Crea una nueva rama (tu espacio de trabajo)

```bash
git checkout -b mi-cambio
```

Ejemplo:

```bash
git checkout -b mapa-veracruz
```

---

### 3. Haz tus cambios

- Edita los archivos necesarios (HTML, CSS, JS o CSV).
- Guarda los archivos como normalmente lo haces.

---

### 4. Guarda tus cambios (commit)

```bash
git add .
git commit -m "Agregué el mapa de Veracruz"
```

---

### 5. Envía los cambios a GitHub (push)

```bash
git push origin mapa-veracruz
```

---

### 6. Crea un Pull Request

1. Entra a GitHub: [https://github.com/enfcarloseligio/D3_js_MX_RHE2025](https://github.com/enfcarloseligio/D3_js_MX_RHE2025)
2. Verás un botón que dice **"Compare & pull request"**
3. Haz clic, añade un título y una breve descripción
4. Haz clic en **"Create pull request"**

Después, el administrador revisará tus cambios y los aprobará si todo está bien ✅

---

## 💡 Consejos importantes

- No trabajes directamente en la rama `main`.
- Crea una nueva rama para cada cambio.
- Usa mensajes de commit claros y específicos.
- Si algo falla, ¡pregunta! Nadie nace sabiendo.

---

## 📩 ¿Dudas?

Envía un mensaje al administrador o comenta dentro del Pull Request.  
Estamos para ayudarte 😊

---

### 🧪 ¿Cómo subir esta guía a GitHub?

Una vez que pegues este texto en Visual Studio Code:

1. Guarda el archivo con `Ctrl + S`.
2. En la terminal integrada escribe:

```bash
git add README_COLABORADORES.md
git commit -m "Agrego guía para colaboradores principiantes"
git push origin main
```

¡Y listo! 🎉
