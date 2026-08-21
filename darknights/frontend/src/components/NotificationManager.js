'use client';

import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationManager() {
  useNotifications();
  return null;
}
