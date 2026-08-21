'use client';

import { useState, useEffect } from 'react';
import { useCityRouter } from '@/hooks/useCityRouter';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useChillRequests, requestChillAccess, respondChillRequest, endChill } from '@/hooks/useChills';
import { AnimatePresence } from 'framer-motion';
import { Chill } from '@/types';
import ProfileOverlay from '@/components/ProfileOverlay';
import ChillPaywall from '@/components/ChillPaywall';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  id: string;
  uid: string;
  nick: string;
  foto: string;
  text: string;
  created_at: any;
}

export default function ChillDetailClient({ chillId }: { chillId: string }) {
  const { t } = useTranslation();
  const { cityPath, router } = useCityRouter();
  const { user, profile, hasChillAccess } = useAuth();

  const [chill, setChill] = useState<Chill | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const { requests } = useChillRequests(chillId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgText, setMsgText] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tab, setTab] = useState<'info' | 'requests' | 'chat'>('info');
  const [exactAddress, setExactAddress] = useState<string | null>(null);

  const isHost = chill?.host_uid === user?.uid;
  const isAccepted = chill?.accepted_users?.includes(user?.uid || '');
  const isPending = chill?.pending_users?.includes(user?.uid || '');
  const isDenied = chill?.denied_users?.includes(user?.uid || '');
  const canSeeAddress = isHost || isAccepted;
  const canChat = isHost || isAccepted;

  useEffect(() => {
    if (!chillId) return;
    const unsub = onSnapshot(doc(db, 'chills', chillId), (snap) => {
      if (snap.exists()) {
        setChill({ id: snap.id, ...snap.data() } as Chill);
      } else {
        setChill(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [chillId]);

  useEffect(() => {
    if (!chillId || !canSeeAddress) return;
    getDoc(doc(db, 'chills', chillId, 'private', 'info')).then((snap) => {
      if (snap.exists()) {
        setExactAddress(snap.data().exact_address || null);
      }
    }).catch(() => {
      // Fallback: read from chill doc itself (legacy data before migration)
      if (chill?.exact_address) setExactAddress(chill.exact_address);
    });
  }, [chillId, canSeeAddress, chill?.exact_address]);

  useEffect(() => {
    if (!chillId || !canChat) return;
    const q = query(
      collection(db, 'chills', chillId, 'messages'),
      orderBy('created_at', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return unsub;
  }, [chillId, canChat]);

  const handleRequest = async () => {
    if (!user) return router.push('/login');
    setRequesting(true);
    setError('');
    try {
      await requestChillAccess(chillId);
    } catch (e: any) {
      setError(e.message || t('chill.error_requesting'));
    } finally {
      setRequesting(false);
    }
  };

  const handleRespond = async (userId: string, action: 'accept' | 'deny') => {
    try {
      await respondChillRequest(chillId, userId, action);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleEnd = async () => {
    if (!confirm(t('chill.confirm_close'))) return;
    try {
      await endChill(chillId);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !user || !profile) return;
    const text = msgText.trim();
    setMsgText('');
    await addDoc(collection(db, 'chills', chillId, 'messages'), {
      uid: user.uid,
      nick: profile.nick || t('chill.anon'),
      foto: profile.fotoUrl || '',
      text,
      created_at: serverTimestamp(),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chill) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-slate-700 mb-4">explore_off</span>
        <h1 className="text-xl font-black mb-2">{t('chill.not_found')}</h1>
        <p className="text-slate-500 text-sm mb-6">{t('chill.expired_or_deleted')}</p>
        <button onClick={() => router.push(cityPath('/chills'))} className="px-6 py-3 bg-amber-600 rounded-xl font-bold text-sm">
          {t('chill.back_to_radar')}
        </button>
      </div>
    );
  }

  const spots = chill.max_capacity - chill.accepted_users.length;

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-500 hover:text-white mb-4 transition-colors">
          <span className="material-icons text-sm">arrow_back</span>
          <span className="text-xs font-bold">{t('chill.back')}</span>
        </button>

        <div className="bg-slate-900/80 border border-slate-200 rounded-3xl p-6 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-500/40 flex-shrink-0 cursor-pointer"
              onClick={() => setSelectedProfile(chill.host_uid)}>
              {chill.host_foto ? (
                <img src={chill.host_foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-800/40 flex items-center justify-center">
                  <span className="material-icons text-amber-400">person</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black leading-tight mb-1">{chill.title}</h1>
              <p className="text-xs text-slate-500 font-bold">
                {t('chill.organized_by')} <span className="text-amber-400">{chill.host_nick}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                chill.status === 'ended' ? 'bg-slate-700 text-slate-400'
                : spots <= 0 ? 'bg-red-500/20 text-red-400'
                : 'bg-green-500/20 text-green-400'
              }`}>
                {chill.status === 'ended' ? t('chill.status_closed') : spots <= 0 ? t('chill.status_full') : `${spots} ${t('chill.spots')}`}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">
                {chill.accepted_users.length}/{chill.max_capacity}
              </span>
            </div>
          </div>

          {chill.description && (
            <p className="text-sm text-slate-300 mb-4">{chill.description}</p>
          )}

          {chill.tags && chill.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {chill.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {canSeeAddress ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-icons text-green-400 mt-0.5">location_on</span>
              <div>
                <p className="text-xs font-bold text-green-400 mb-1 uppercase tracking-widest">{t('chill.address')}</p>
                <p className="text-sm text-white font-bold">{exactAddress || t('chill.loading')}</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-icons text-slate-600 mt-0.5">lock</span>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">{t('chill.location')}</p>
                <p className="text-xs text-slate-500">{t('chill.location_hidden')}</p>
              </div>
            </div>
          )}
        </div>

        {chill.status !== 'ended' && !isHost && (
          <div className="mb-4">
            {isAccepted ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
                <span className="material-icons text-green-400 text-3xl mb-1">check_circle</span>
                <p className="text-green-400 font-black text-sm">{t('chill.has_pass')}</p>
              </div>
            ) : isDenied ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                <span className="material-icons text-red-400 text-3xl mb-1">block</span>
                <p className="text-red-400 font-bold text-sm">{t('chill.request_denied')}</p>
              </div>
            ) : isPending ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
                <span className="material-icons text-yellow-400 text-3xl mb-1 animate-pulse">hourglass_top</span>
                <p className="text-yellow-400 font-bold text-sm">{t('chill.waiting_approval')}</p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (!hasChillAccess) {
                      setShowPaywall(true);
                    } else {
                      handleRequest();
                    }
                  }}
                  disabled={requesting || chill.status === 'full'}
                  className="w-full py-5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-black text-lg shadow-[0_0_40px_-10px_rgba(192,38,211,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-icons">{requesting ? 'sync' : hasChillAccess ? 'vpn_key' : 'lock'}</span>
                  {requesting ? t('chill.requesting') : hasChillAccess ? t('chill.request_pass') : t('chill.unlock_access')}
                </button>
                {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
              </>
            )}
          </div>
        )}

        {isHost && chill.status !== 'ended' && (
          <button
            onClick={handleEnd}
            className="w-full py-3 bg-red-900/30 text-red-400 border border-red-500/20 hover:bg-red-900/50 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 mb-4"
          >
            <span className="material-icons text-sm">cancel</span>
            {t('chill.close_chill')}
          </button>
        )}

        {(isHost || isAccepted) && (
          <>
            <div className="flex gap-2 mb-4">
              {(['info', ...(isHost ? ['requests'] as const : []), ...(canChat ? ['chat'] as const : [])] as const).map((tabType) => (
                <button
                  key={tabType}
                  onClick={() => setTab(tabType as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                    tab === tabType
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}
                >
                  {t(tabType === 'info' ? 'chill.tab_info' : tabType === 'requests' ? 'chill.tab_requests' : 'chill.tab_chat')}
                  {tabType === 'requests' && requests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] font-black flex items-center justify-center">
                      {requests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'requests' && isHost && (
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="material-icons text-4xl text-slate-700 mb-2 block">inbox</span>
                    <p className="text-slate-500 text-sm font-bold">{t('chill.no_requests')}</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="bg-slate-900/80 border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 cursor-pointer"
                          onClick={() => setSelectedProfile(req.user_uid)}
                        >
                          {req.user_foto ? (
                            <img src={req.user_foto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <span className="material-icons text-slate-600">person</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm">{req.user_nick}</p>
                          {req.user_edad && <p className="text-[10px] text-slate-500 font-bold">{req.user_edad} {t('chill.years_old')}</p>}
                          {req.user_bio && <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{req.user_bio}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRespond(req.user_uid, 'accept')}
                          className="py-3 bg-green-600 hover:bg-green-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                          {t('chill.accept')}
                        </button>
                        <button
                          onClick={() => handleRespond(req.user_uid, 'deny')}
                          className="py-3 bg-red-900/40 text-red-400 border border-red-500/20 hover:bg-red-900/60 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                          {t('chill.deny')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'chat' && canChat && (
              <div className="flex flex-col" style={{ height: 'calc(100dvh - 420px)', minHeight: '300px' }}>
                <div className="flex-1 overflow-y-auto space-y-2 mb-3 px-1">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="material-icons text-4xl text-slate-700 mb-2 block">forum</span>
                      <p className="text-slate-500 text-sm font-bold">{t('chill.no_messages')}</p>
                      <p className="text-slate-600 text-xs">{t('chill.start_conversation')}</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.uid === user?.uid;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 cursor-pointer"
                              onClick={() => setSelectedProfile(msg.uid)}>
                              {msg.foto ? (
                                <img src={msg.foto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                  <span className="material-icons text-slate-600 text-xs">person</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && <p className="text-[10px] text-amber-400 font-bold mb-0.5 px-1">{msg.nick}</p>}
                            <div className={`px-3 py-2 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-amber-600 text-white rounded-br-sm'
                                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={t('chill.write_message')}
                    className="flex-1 bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!msgText.trim()}
                    className="w-12 h-12 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 flex items-center justify-center transition-all"
                  >
                    <span className="material-icons text-white">send</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedProfile && (
        <ProfileOverlay
          id={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}

      <AnimatePresence>
        {showPaywall && (
          <ChillPaywall onClose={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
