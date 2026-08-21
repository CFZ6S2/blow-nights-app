<div align="center">
  <h1>🍾 Blow Nights & DarkNights Platform</h1>
  <p><strong>Plataforma Multi-Tenant para Venta de Entradas, RRPP y Ocio Nocturno</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-Serverless-FFCA28?logo=firebase)](https://firebase.google.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  
  [Blow Nights](https://blownights.com) • [DarkNights](https://darknights.blownights.com)
</div>

## 📖 Visión General

Este repositorio aloja la infraestructura de **Blow Nights** y **DarkNights**, dos aplicaciones web progresivas (PWAs) que operan bajo un modelo de arquitectura **Multi-Tenant**. Ambas aplicaciones comparten un único backend en Firebase pero presentan experiencias de usuario y lógicas de negocio diferenciadas.

La plataforma permite la gestión integral de ocio nocturno:
- Gestión de locales (Venues).
- Venta de entradas y control de aforos mediante QR (Scanners).
- Organización de eventos independientes.
- Sistema multinivel de Relaciones Públicas (RRPP), City Managers y Ambassadors.
- Suscripciones Premium (SaaS) para locales y usuarios.

---

## 🏗️ Arquitectura Multi-Tenant

El proyecto está diseñado para soportar múltiples marcas (tenants) sobre la misma base de datos. Actualmente operan dos:

1. **Blow Nights** (`/frontend`): Orientado al público LGTBIQ+, fiestas de circuito, saunas y eventos afines. Tema oscuro. Desplegado en `blownights.com`.
2. **DarkNights** (`/frontend-darknights`): Orientado a parejas liberales, swinger, nudismo y público hetero. Tema claro. Desplegado en `darknights.blownights.com`.

> **⚠️ IMPORTANTE:** Para entender a fondo cómo el backend gestiona la lógica financiera separada y evita el cruce de comisiones entre marcas, lee la documentación técnica en [**ARCHITECTURE.md**](ARCHITECTURE.md).

---

## ✨ Características Principales

- **📍 Geolocalización en Tiempo Real**: Mapas interactivos (Mapbox) para ver locales y usuarios cercanos.
- **💬 Mensajería y Chat**: Sistema en tiempo real con notificaciones push.
- **💳 Pasarela de Pagos (Stripe)**: Manejo complejo de _split payments_ (pagos divididos) para redirigir comisiones a RRPP y organizadores al instante.
- **🎟️ Ticketing y Validación QR**: Generación segura de QRs y un módulo especial (`/scanner`) para los porteros de las discotecas.
- **🌍 Internacionalización (i18n)**: Soporte completo para 12 idiomas.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|----------|------------|
| **Frontend** | Next.js 15 (App Router), React, TypeScript |
| **Estilos** | TailwindCSS |
| **Backend / BaaS** | Firebase (Auth, Firestore, Cloud Functions, Storage) |
| **Pagos** | Stripe Connect & Webhooks |
| **Mapas** | Mapbox & GeoFire |
| **Despliegue** | Firebase Hosting |

---

## 🚀 Guía de Desarrollo

### Requisitos Previos
- Node.js 18.x o superior
- Firebase CLI (`npm install -g firebase-tools`)

### Configuración Local

1. **Instalar dependencias globales:**
   ```bash
   npm install
   ```
   *(Nota: Se recomienda usar `npm i` dentro de cada carpeta `/frontend`, `/frontend-darknights` y `/functions` de manera individual para evitar conflictos).*

2. **Variables de Entorno:**
   Cada frontend necesita su propio archivo `.env.local`. Existe un archivo de ejemplo (`.env.example`).
   - Para Blow Nights asegúrate de tener: `NEXT_PUBLIC_APP_PLATFORM=blownights`
   - Para DarkNights asegúrate de tener: `NEXT_PUBLIC_APP_PLATFORM=darknights`

3. **Arrancar en local (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```

---

## ☁️ Comandos de Despliegue (Producción)

Antes de desplegar cualquier frontend, **es obligatorio hacer la build local** (`npm run build`), ya que Firebase Hosting subirá la carpeta `/out`.

**Desplegar Backend (Cloud Functions):**
```bash
firebase deploy --only functions
```

**Desplegar Frontend - Blow Nights:**
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting:blownights-main
```

**Desplegar Frontend - DarkNights:**
```bash
cd frontend-darknights
npm run build
cd ..
firebase deploy --only hosting:darknights
```

---

## 📁 Estructura del Proyecto

```text
blow-nights-app/
├── frontend/               # PWA principal (Blow Nights)
├── frontend-darknights/    # PWA secundaria (DarkNights)
├── functions/              # Backend (Node.js) y Webhooks de Stripe
├── scripts/                # Utilidades para mantenimiento y traducciones (i18n)
├── ARCHITECTURE.md         # Documentación sobre el modelo Multi-Tenant
├── firestore.rules         # Reglas de seguridad de Firebase
└── firebase.json           # Orquestación del despliegue
```
