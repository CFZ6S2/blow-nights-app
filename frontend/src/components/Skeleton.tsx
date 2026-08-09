'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-shimmer rounded-2xl ${className}`} />
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl">
      <Skeleton className="w-14 h-14 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="w-24 h-4 rounded-lg" />
          <Skeleton className="w-10 h-3 rounded-lg" />
        </div>
        <Skeleton className="w-full h-3 rounded-lg opacity-60" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <Skeleton className="h-[60vh] w-full rounded-none" />
      <div className="px-6 -mt-20 relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 space-y-8">
          <div className="space-y-4">
            <Skeleton className="w-48 h-10 rounded-2xl" />
            <Skeleton className="w-32 h-4 rounded-xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="w-20 h-8 rounded-xl" />
            <Skeleton className="w-24 h-8 rounded-xl" />
            <Skeleton className="w-16 h-8 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="w-20 h-4 rounded-lg" />
            <Skeleton className="w-full h-20 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
