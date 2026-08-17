"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

import { useAuth } from "@/context/AuthContext"

const defaultItems = [
  { href: "/", label: "Mapa", icon: "explore" },
  { href: "/venues", label: "Locales", icon: "nightlife" },
  { href: "/chills", label: "Chills", icon: "local_fire_department" },
  { href: "/wallet", label: "Cartera", icon: "confirmation_number" },
  { href: "/chat", label: "Chats", icon: "chat" },
  { href: "/profile", label: "Perfil", icon: "person" },
]

export function BottomNav() {
  const { isAdmin, isCityAdmin, isVenueManager } = useAuth()
  const pathname = usePathname()

  let items = [...defaultItems]
  if (isVenueManager) {
    items.push({ href: "/venue-admin", label: "Mi Local", icon: "storefront" })
  }
  if (isAdmin) {
    items.push({ href: "/admin", label: "Admin", icon: "admin_panel_settings" })
  }

  // Vibración háptica suave para móvil
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // No mostrar en la pantalla de login o setup inicial
  const hideOnPaths = ['/login', '/setup-profile'];
  if (hideOnPaths.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto flex justify-around py-4 px-4 relative">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
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
