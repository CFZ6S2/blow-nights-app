<div align="center">
  <h1>🏳️‍🌈 Gay Meet</h1>
  <p><strong>The Next-Generation PWA Dating App for the Gay & Bisexual Community</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-Serverless-FFCA28?logo=firebase)](https://firebase.google.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  
  [Live Demo](https://gay-meet-app-mvp-26.web.app) • [Report Bug](#) • [Request Feature](#)
</div>

## 📖 Overview

Gay Meet is a cutting-edge Progressive Web App (PWA) designed specifically for the gay and bisexual dating market. Built with modern web technologies, it bypasses traditional app store fees and restrictions, allowing users to install the app directly from their browser to their home screen.

Designed with performance, scalability, and user experience in mind, Gay Meet offers a premium feel with built-in monetization strategies and a comprehensive admin dashboard.

### Business Value
- **Zero App Store Fees**: 100% of revenue goes directly to you via Stripe.
- **Frictionless Onboarding**: No downloads required. Users tap a link and start connecting.
- **Built-in Viral Growth**: Referral system incentivizes user acquisition.

---

## ✨ Features

- **📍 Real-Time Geolocation**: Interactive map powered by Mapbox showing nearby users.
- **💬 Instant Messaging**: Real-time chat with push notifications.
- **💎 Premium Subscriptions**: Stripe integration for monthly (€9.99) and annual (€69.99) plans.
- **🎁 Growth Hacks**: Automated referral system (3 invites = free Premium) & "First 1000 users get Premium" promo.
- **🛡️ User Verification**: Built-in flow to ensure user authenticity and safety.
- **📱 PWA Ready**: Installable on iOS and Android directly from the browser.
- **🔐 Authentication**: Seamless Google Sign-In and email authentication.
- **📊 Admin Dashboard**: Centralized management at `/admin` for user moderation and metrics.

---

## 🛠 Tech Stack

| Category | Technology | Description |
|----------|------------|-------------|
| **Frontend** | Next.js 15 (App Router) | React framework configured for Static Export. |
| **Styling** | TailwindCSS | Utility-first CSS framework for rapid UI development. |
| **Backend / BaaS** | Firebase | Auth, Firestore, Storage, Hosting, and Cloud Functions. |
| **Payments** | Stripe | Secure payment processing and subscription management. |
| **Mapping** | Mapbox & GeoFire | High-performance interactive maps and geospatial queries. |
| **Deployment** | Firebase Hosting | Global CDN for fast, secure delivery. |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- Firebase CLI installed globally (`npm install -g firebase-tools`)
- Mapbox Developer Account (for API key)
- Stripe Account (for API keys and Webhook secrets)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/gay-meet.git
   cd gay-meet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
   *Make sure to add your Firebase config, Mapbox Token, and Stripe keys.*

4. **Initialize Firebase:**
   ```bash
   firebase login
   firebase use --add
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment

1. **Build the Next.js App:**
   ```bash
   npm run build
   ```
   *(Ensure Next.js is configured for `output: 'export'`)*

2. **Deploy to Firebase Hosting & Functions:**
   ```bash
   firebase deploy
   ```

---

## 📁 Project Structure

```text
gay-meet/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable React components
│   ├── lib/              # Firebase, Stripe, and utility configs
│   ├── hooks/            # Custom React hooks
│   └── styles/           # Tailwind and global CSS
├── functions/            # Firebase Cloud Functions (Node.js)
├── public/               # PWA assets (manifest, icons)
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind configuration
└── firebase.json         # Firebase project configuration
```

> **Para más detalles sobre la arquitectura de doble frontend (Blow Nights vs DarkNights) y el backend unificado, revisa el archivo [ARCHITECTURE.md](ARCHITECTURE.md).**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🇪🇸 Español (Spanish)

<div align="center">
  <h1>🏳️‍🌈 Gay Meet</h1>
  <p><strong>La App de Citas PWA de Nueva Generación para la Comunidad Gay y Bisexual</strong></p>
</div>

### Resumen del Proyecto

Gay Meet es una aplicación web progresiva (PWA) de vanguardia diseñada específicamente para el mercado de citas gay y bisexual. Al ser una PWA, evita las comisiones y restricciones de las tiendas de aplicaciones tradicionales, permitiendo a los usuarios instalar la app directamente desde su navegador.

Ofrece geolocalización en tiempo real, mensajería instantánea, suscripciones premium vía Stripe, y un panel de administración completo. Todo construido sobre Next.js 15 y Firebase.

### Instrucciones de Instalación (Breve)

1. Clona el repositorio: `git clone https://github.com/your-org/gay-meet.git`
2. Instala las dependencias: `npm install`
3. Configura tus variables de entorno copiando `.env.example` a `.env.local`.
4. Inicia el servidor de desarrollo: `npm run dev`
5. Para desplegar en producción, ejecuta `npm run build` seguido de `firebase deploy`.
