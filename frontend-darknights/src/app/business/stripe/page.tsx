'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

function StripeOnboardingContent() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [venue, setVenue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/business/login');
      return;
    }
    fetchVenue();
  }, [user, loading]);

  const fetchVenue = async () => {
    try {
      if (!profile?.venueId) {
        setError(t('business.stripe.error.no_venue'));
        setIsLoading(false);
        return;
      }
      const venueSnap = await getDoc(doc(db, 'venues', profile.venueId));
      if (venueSnap.exists()) {
        setVenue({ id: venueSnap.id, ...venueSnap.data() });
      } else {
        setError(t('business.stripe.error.venue_not_found'));
      }
    } catch (err: any) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleConnectStripe = async () => {
    setIsLinking(true);
    setError('');
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');

      // 1. Create or get Stripe Express Account
      const createAccount = httpsCallable(functions, 'createStripeConnectAccount');
      const res1: any = await createAccount({ venueId: venue.id });
      const accountId = res1.data.accountId;

      // 2. Generate Account Link
      const createLink = httpsCallable(functions, 'createStripeAccountLink');
      const res2: any = await createLink({
        accountId,
        origin: window.location.origin
      });

      if (res2.data?.url) {
        window.location.href = res2.data.url;
      } else {
        setError(t('business.stripe.error.no_link'));
        setIsLinking(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(t('business.stripe.error.connect_error') + err.message);
      setIsLinking(false);
    }
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-900">{t('common.loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-900 p-6">
      <header className="mb-10 text-center pt-8">
        <h1 className="text-3xl font-black mb-2 uppercase tracking-widest text-slate-800">{t('business.stripe.title')}</h1>
        <p className="text-slate-500 text-sm">{t('business.stripe.subtitle')}</p>
      </header>

      <main className="max-w-xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-900/50 text-red-300 p-4 rounded-xl border border-red-500/50">
            {error}
          </div>
        )}

        {searchParams.get('refresh') && (
          <div className="bg-yellow-900/50 text-yellow-300 p-4 rounded-xl border border-yellow-500/50 mb-4">
            {t('business.stripe.message.cancelled')}
          </div>
        )}

        {searchParams.get('return') && (
          <div className="bg-green-900/50 text-green-300 p-4 rounded-xl border border-green-500/50 mb-4">
            {t('business.stripe.message.success')}
          </div>
        )}

        {venue && (
          <div className="bg-[#11131f] border border-[#23273f] p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-slate-900 text-[10px] font-black px-4 py-1 rounded-bl-2xl uppercase">
              Powered by Stripe Connect
            </div>

            <h2 className="text-xl font-bold mb-4">{venue.name}</h2>

            {venue.stripeAccountId ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-green-400 bg-green-400/10 p-4 rounded-xl border border-green-400/20">
                  <span className="material-icons">check_circle</span>
                  <div>
                    <p className="font-bold">{t('business.stripe.account_linked')}</p>
                    <p className="text-xs text-green-400/70">ID: {venue.stripeAccountId}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {t('business.stripe.description_linked')}
                </p>
                <button
                  onClick={handleConnectStripe}
                  disabled={isLinking}
                  className="w-full bg-[#1c1f38] hover:bg-[#23273f] text-slate-900 font-bold py-3 rounded-xl transition-all mt-4 border border-[#3b3f68]"
                >
                  {isLinking ? t('common.loading') : t('business.stripe.update_bank_details')}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <span className="bg-fuchsia-500/20 text-slate-800 p-2 rounded-lg">1</span>
                    <p className="text-sm text-slate-600">{t('business.stripe.step_1')}</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="bg-fuchsia-500/20 text-slate-800 p-2 rounded-lg">2</span>
                    <p className="text-sm text-slate-600">{t('business.stripe.step_2')}</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="bg-fuchsia-500/20 text-slate-800 p-2 rounded-lg">3</span>
                    <p className="text-sm text-slate-600">{t('business.stripe.step_3')}</p>
                  </div>
                </div>

                <button
                  onClick={handleConnectStripe}
                  disabled={isLinking}
                  className="w-full bg-[#635BFF] hover:bg-[#4B45FF] text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isLinking ? (
                    t('business.stripe.connecting')
                  ) : (
                    <>
                      <span className="material-icons text-xl">account_balance</span>
                      {t('business.stripe.setup_bank_account')}
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-500 mt-2">
                  {t('business.stripe.footer_note')}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function StripeOnboardingPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-900">{t('common.loading')}</div>}>
      <StripeOnboardingContent />
    </Suspense>
  );
}
