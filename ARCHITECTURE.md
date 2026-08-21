# 🏗️ Arquitectura Multi-Tenant (Blow Nights y DarkNights)

Este repositorio contiene el código fuente de dos aplicaciones web progresivas (PWAs) que operan bajo un **modelo Multi-Tenant** (múltiples inquilinos) compartiendo la misma infraestructura de backend en Firebase, pero sirviendo a dos marcas y públicos distintos.

## 🚀 Las Dos Aplicaciones

1. **Blow Nights (`/frontend`)**
   - **Dominio:** `blownights.com`
   - **Enfoque:** Público LGTBIQ+, fiestas de circuito, saunas, cruising y eventos afines.
   - **Variables de Entorno:** `NEXT_PUBLIC_APP_PLATFORM=blownights`
   - **Diseño:** Tema oscuro (Dark Mode), colores morados, neón.

2. **DarkNights (`/frontend-darknights`)**
   - **Dominio:** `darknights.blownights.com` (apunta a `darknights.web.app`)
   - **Enfoque:** Público hetero, parejas liberales, nudismo, locales swinger, etc.
   - **Variables de Entorno:** `NEXT_PUBLIC_APP_PLATFORM=darknights`
   - **Diseño:** Tema claro (Light Mode), diseño más limpio, enfocado a otro público (en desarrollo/rebranding).

Ambas carpetas contienen **código Next.js independiente**. Esto permite tener versiones completamente distintas del diseño, el copywriting, y la experiencia de usuario, pero evitando tener que mantener dos bases de datos.

---

## 💾 Backend Unificado (Firebase)

En lugar de tener dos bases de datos y dos paneles de Stripe, ambas aplicaciones se conectan al **mismo proyecto de Firebase** y usan las mismas **Cloud Functions (`/functions`)**.

### ¿Cómo sabe el backend de dónde viene cada acción?
Al crear un usuario, un evento, o al procesar un pago (vía Stripe), el frontend inyecta una variable llamada `platform` en la base de datos o en los metadatos de la sesión de pago. 

```typescript
// Ejemplo en el frontend al registrar un usuario
await setDoc(doc(db, 'users', user.uid), {
  ...datos,
  platform: process.env.NEXT_PUBLIC_APP_PLATFORM || 'blownights'
});
```

### 💸 Gestión Financiera y Comisiones
La separación por la etiqueta `platform` permite tener **reglas de negocio diferentes**:

- **Blow Nights**: Se ejecuta la función `territorialSplit` que reparte comisiones automáticamente a los "City Managers" y "Ambassadors" por cada venta o suscripción de los locales de su zona.
- **DarkNights**: Se omite (se bloquea) el reparto de comisiones de `territorialSplit`. La plataforma retiene el 100% de la venta, **excepto** en el caso de la venta directa de entradas a través del enlace de un **RRPP (Relaciones Públicas) independiente**, cuya comisión sí se respeta en ambas plataformas.

---

## 🧹 Estructura del Repositorio

- `/frontend`: Código fuente de la app Blow Nights (Next.js).
- `/frontend-darknights`: Código fuente de la app DarkNights (Next.js).
- `/functions`: Lógica de backend y pasarela de pago (Node.js).
- `/scripts`: Scripts de mantenimiento, migraciones, traducciones (i18n) y auditoría.
- `firebase.json`: Configuración de despliegue donde se mapea `/frontend/out` al target `blownights-main` y `/frontend-darknights/out` al target `darknights`.

## 🌐 Comandos de Despliegue

**Desplegar Blow Nights:**
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting:blownights-main
```

**Desplegar DarkNights:**
```bash
cd frontend-darknights
npm run build
cd ..
firebase deploy --only hosting:darknights
```

**Desplegar Backend:**
```bash
firebase deploy --only functions
```
