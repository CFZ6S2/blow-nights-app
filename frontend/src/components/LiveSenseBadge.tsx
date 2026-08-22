'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface LiveSenseData {
  current_count: number;
  capacity?: number | null;
  venue_name: string;
  venue_type: string;
  updated_at: any;
  hourly_entries?: Record<string, number>;
}

function getOccupancyLevel(count: number, capacity?: number | null): 'low' | 'medium' | 'high' | 'full' {
  if (!capacity) return count > 50 ? 'high' : count > 15 ? 'medium' : 'low';
  const ratio = count / capacity;
  if (ratio >= 0.95) return 'full';
  if (ratio >= 0.65) return 'high';
  if (ratio >= 0.3) return 'medium';
  return 'low';
}

const levelConfig = {
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', dot: 'bg-emerald-400', label: 'Ambiente tranquilo' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', ring: 'ring-yellow-500/30', dot: 'bg-yellow-400', label: 'Medio lleno' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/15', ring: 'ring-orange-500/30', dot: 'bg-orange-400', label: 'Buen ambiente' },
  full: { color: 'text-red-400', bg: 'bg-red-500/15', ring: 'ring-red-500/30', dot: 'bg-red-400', label: 'Aforo completo' },
};

export function LiveSenseBadge({ venueId, compact = false }: { venueId: string; compact?: boolean }) {
  const [data, setData] = useState<LiveSenseData | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'live_sense', venueId), (snap) => {
      if (snap.exists()) setData(snap.data() as LiveSenseData);
    });
    return unsub;
  }, [venueId]);

  if (!data || data.current_count === 0) return null;

  const level = getOccupancyLevel(data.current_count, data.capacity);
  const cfg = levelConfig[level];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
        {data.current_count}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
      <span>{data.current_count} dentro</span>
      {data.capacity && <span className="text-white/30">/ {data.capacity}</span>}
    </div>
  );
}

export function LiveSenseBar({ venueId }: { venueId: string }) {
  const [data, setData] = useState<LiveSenseData | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'live_sense', venueId), (snap) => {
      if (snap.exists()) setData(snap.data() as LiveSenseData);
    });
    return unsub;
  }, [venueId]);

  if (!data) return null;

  const level = getOccupancyLevel(data.current_count, data.capacity);
  const cfg = levelConfig[level];
  const fillPct = data.capacity ? Math.min(100, (data.current_count / data.capacity) * 100) : null;

  const hours = data.hourly_entries || {};
  const currentHour = new Date().getHours();
  const barHours = Array.from({ length: 6 }, (_, i) => {
    const h = (currentHour - 5 + i + 24) % 24;
    return { hour: h, entries: hours[`h${h}`] || 0 };
  });
  const maxEntries = Math.max(1, ...barHours.map(b => b.entries));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} animate-pulse`} />
          <span className={`text-sm font-black ${cfg.color}`}>{data.current_count} personas dentro</span>
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase">{cfg.label}</span>
      </div>

      {fillPct !== null && (
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${level === 'full' ? 'bg-red-500' : level === 'high' ? 'bg-orange-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${fillPct}%` }} />
        </div>
      )}

      <div className="flex items-end gap-1 h-8">
        {barHours.map((b) => (
          <div key={b.hour} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full rounded-sm bg-white/10 relative" style={{ height: '24px' }}>
              <div
                className={`absolute bottom-0 w-full rounded-sm transition-all ${cfg.dot.replace('bg-', 'bg-')}/60`}
                style={{ height: `${(b.entries / maxEntries) * 100}%` }}
              />
            </div>
            <span className="text-[8px] text-slate-600">{b.hour}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}
