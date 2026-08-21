# Guía de Contribución

¡Gracias por interesarte en contribuir a la plataforma **Blow Nights / DarkNights**!

Este documento detalla las normas de estilo, la estructura de ramas y cómo ejecutar los tests locales para garantizar la estabilidad del proyecto.

## 🌿 Flujo de Ramas (Git Flow)

La rama `main` está protegida. **No se permite hacer push directo a `main`**.

1. Crea una rama desde `main` con un nombre descriptivo:
   - Funcionalidades: `feat/nombre-de-la-funcionalidad`
   - Correcciones: `fix/nombre-del-bug`
   - Refactorización: `refactor/nombre-del-refactor`
   - Tareas técnicas: `chore/nombre-de-la-tarea`
2. Realiza tus cambios y asegúrate de que los tests pasen (ver sección de tests).
3. Abre una **Pull Request (PR)** hacia `main`.
4. La PR requerirá al menos 1 aprobación y que todos los checks de CI (GitHub Actions) pasen con éxito.

## 🧪 Ejecución de Tests en Local

### 1. Tests del Frontend (Next.js)

Usamos Vitest para pruebas unitarias de hooks y componentes.

```bash
cd frontend
npm run test
```

### 2. Tests del Backend (Cloud Functions)

Usamos Jest para probar las reglas financieras y de tickets.

```bash
cd functions
# Tests que no requieren emulador:
npm test

# Tests de reglas de seguridad de Firestore (requiere emulador):
npm run test:rules
```

## 🏗️ Arquitectura Multi-Tenant

Antes de modificar componentes globales, ten en cuenta que este repositorio sirve a dos aplicaciones distintas. 
Lee obligatoriamente el archivo [**ARCHITECTURE.md**](ARCHITECTURE.md) para entender cómo funciona la variable `platform` (`blownights` vs `darknights`).

## 🎨 Guía de Estilos

- **TypeScript:** Usa tipado estricto en el frontend. Evita `any` en la medida de lo posible.
- **Componentes React:** Usa _Functional Components_ y _Hooks_.
- **Estilos:** Usa TailwindCSS. No añadas clases CSS manuales a menos que sea estrictamente necesario en `globals.css`.
- **Traducciones (i18n):** Todo el texto visible para el usuario debe pasar por el hook `useTranslation`. Nunca escribas strings "hardcoded" (a fuego) en los componentes. Usa las herramientas de la carpeta `/scripts` para sincronizar idiomas.

¡Feliz código! 🚀
