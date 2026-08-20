'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface RRPPFooterProps {
  saldoQRs?: number;
  unreadMessages?: number;
}

export default function RRPPFooter({ saldoQRs = 0, unreadMessages = 0 }: RRPPFooterProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [balance, setBalance] = useState(saldoQRs);
  const [unread, setUnread] = useState(unreadMessages);
  const { t } = useTranslation();

  // Hook to fetch the user's actual QR balance and unread messages from support
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to user doc for balance
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid), 
      (snapshot) => {
        if (snapshot.exists()) {
          setBalance(snapshot.data()?.qr_quota || 0);
        }
      },
      () => {}
    );

    // For unread messages we would ideally query the chat doc if there's an unread count
    // or just leave it static for now as per the user's template until read receipts are fully implemented.
    
    return () => {
      unsubscribeUser();
    };
  }, [user?.uid]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-4 py-2">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {/* 1. Mis Fiestas */}
        <Link
          href="/rrpp"
          className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
            pathname === '/rrpp' || pathname.includes('/dashboard')
              ? 'text-fuchsia-400 font-bold bg-fuchsia-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">📋</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">{t('rrpp_nav.parties')}</span>
        </Link>

        {/* 2. Comprar QRs / Saldo */}
        <Link
          href="/rrpp/comprar-creditos"
          className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
            pathname.includes('/comprar-creditos')
              ? 'text-fuchsia-400 font-bold bg-fuchsia-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <span className="text-lg">🪙</span>
            {balance > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-emerald-500 text-black text-[9px] font-black px-1 rounded-full">
                {balance}
              </span>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">{t('rrpp_nav.qr_balance')}</span>
        </Link>

        {/* 3. Chat Operativo con Admin */}
        <Link
          href="/rrpp/chat"
          className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
            pathname.includes('/rrpp/chat')
              ? 'text-fuchsia-400 font-bold bg-fuchsia-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <span className="text-lg">💬</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-2 bg-fuchsia-500 text-white text-[9px] font-black px-1 rounded-full animate-pulse">
                {unread}
              </span>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">{t('rrpp_nav.support')}</span>
        </Link>

        {/* 4. Perfil Profesional */}
        <Link
          href="/rrpp/perfil"
          className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
            pathname.includes('/perfil')
              ? 'text-fuchsia-400 font-bold bg-fuchsia-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">👤</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">{t('rrpp_nav.account')}</span>
        </Link>
      </div>
    </footer>
  );
}
