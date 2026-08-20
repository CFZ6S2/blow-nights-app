import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import NotificationManager from "@/components/NotificationManager";
import NotificationToast from "@/components/NotificationToast";
import ViewerToast from "@/components/ViewerToast";
import { NotificationProvider } from "@/context/NotificationContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import CookieBanner from "@/components/CookieBanner";
import { I18nProvider } from "@/providers/I18nProvider";
import LanguageSelector from "@/components/LanguageSelector";
import SentryInit from "@/components/SentryInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DarkNights - Tu Circuito Nocturno",
  description: "Locales, entradas y planes en vivo para la comunidad Liberal.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DarkNights',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#020617" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DarkNights" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192.png" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <I18nProvider>
          <AuthProvider>
            <CityProvider>
            <NotificationProvider>
              <SentryInit />
              <LanguageSelector />
              <NotificationManager />
              <NotificationToast />
              <ViewerToast />
              <div className="flex-1 pb-20">
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
              <BottomNav />
              <PWAInstallPrompt />
              <CookieBanner />
            </NotificationProvider>
            </CityProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
