"use client";

import { useEffect } from "react";
import { initSentry, Sentry } from "@/lib/sentry";
import { useAuth } from "@/context/AuthContext";

let initialized = false;

export default function SentryInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (!initialized) {
      initSentry();
      initialized = true;
    }
  }, []);

  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.uid, email: user.email || undefined });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
