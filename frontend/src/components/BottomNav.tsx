"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

import { useAuth } from "@/context/AuthContext"
import { useCity } from "@/context/CityContext"

import { useTranslation } from "react-i18next"

export function BottomNav() {
  const { user, isAdmin, isSuperAdmin, isCityAdmin, isVenueManager } = useAuth()
  const { citySlug } = useCity()
  const pathname = usePathname()
  const { t } = useTranslation()

  const c = citySlug || 'madrid';

  const allItems = [
    { href: `/${c}`, label: t('nav.map', 'Mapa'), icon: "explore", match: `/${c}` },
    { href: `/${c}/venues`, label: t('nav.venues', 'Locales'), icon: "nightlife", match: `/${c}/venues` },
    { href: `/${c}/chills`, label: t('nav.chills', 'Chills'), icon: "local_fire_department", match: `/${c}/chills` },
    { href: `/${c}/wallet`, label: t('nav.wallet', 'Cartera'), icon: "confirmation_number", match: `/${c}/wallet` },
    { href: `/${c}/chat`, label: t('nav.chat', 'Chats'), icon: "chat", match: `/${c}/chat` },
    { href: `/${c}/profile`, label: t('nav.profile', 'Perfil'), icon: "person", match: `/${c}/profile` },
  ]

  const superAdminHidden = ['chills', 'wallet', 'profile'];
  let items = isSuperAdmin
    ? allItems.filter(item => !superAdminHidden.some(h => item.match.endsWith(`/${h}`)))
    : [...allItems]
  if (isVenueManager) {
    items.push({ href: "/venue-admin", label: "Mi Local", icon: "storefront", match: "/venue-admin" })
  }
  if (isAdmin) {
    items.push({ href: "/admin", label: "Admin", icon: "admin_panel_settings", match: "/admin" })
  }

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  if (!user) return null;
  const hideOnPaths = ['/login', '/setup-profile'];
  if (hideOnPaths.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto flex justify-around py-4 px-4 relative">
        {items.map((item) => {
          const isHome = item.match === `/${c}`;
          const active = isHome
            ? pathname === `/${c}` || pathname === `/${c}/`
            : pathname.startsWith(item.match);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={triggerHaptic}
              className="relative flex flex-col items-center gap-1 group w-16"
            >
              <motion.div
                whileTap={{ scale: 0.8 }}
                className="relative z-10"
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <span
                  className={`material-icons text-2xl block transition-colors duration-300 ${
                    active ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(192,38,211,0.5)]" : "text-slate-500"
                  }`}
                >
                  {item.icon}
                </span>

                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-4 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-fuchsia-400/80 blur-[2px]"
                    transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  />
                )}
              </motion.div>

              <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-300 ${active ? "text-fuchsia-400" : "text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  )
}
