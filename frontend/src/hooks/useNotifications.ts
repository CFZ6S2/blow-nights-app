'use client';

import { useEffect } from 'react';
import { messaging, db } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useNotificationUI } from '@/context/NotificationContext';

export function useNotifications() {
  const { user } = useAuth();
  const notificationCtx = useNotificationUI();
  const addNotification = notificationCtx?.addNotification;

  const toggleNotifications = async () => {
    if (!user || !messaging) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
        });

        if (token) {
          await updateDoc(doc(db, 'users', user.uid), {
            fcmToken: token,
            notificationsEnabled: true
          });
          return true;
        }
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: false
        });
        return false;
      }
    } catch (error) {
      console.error('Error al gestionar notificaciones:', error);
    }
  };

  useEffect(() => {
    if (!user || !messaging || !addNotification) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      addNotification({
        title: payload.notification?.title ?? '',
        body: payload.notification?.body ?? '',
        data: payload.data
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    });

    return () => unsubscribe();
  }, [user, addNotification]);

  return { toggleNotifications };
}
