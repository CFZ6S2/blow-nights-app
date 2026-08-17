'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface NotificationContextType {
  notifications: any[];
  addNotification: (notification: any) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  const addNotification = useCallback((notification: any) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, ...notification }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationUI = () => useContext(NotificationContext);
