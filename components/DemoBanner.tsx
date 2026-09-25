'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Sparkles, RotateCcw, Compass, Loader2 } from 'lucide-react';
import { startTour } from '@/components/ProductTour';

export default function DemoBanner() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to seed demo data');
        return;
      }
      toast.success(data.message || 'Demo data seeded successfully with live analytics!');
      router.refresh();
    } catch {
      toast.error('Network error while seeding demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to reset demo state');
        return;
      }
      toast.success(data.message || 'Demo links and cached keys reset successfully!');
      router.refresh();
    } catch {
      toast.error('Network error while resetting demo state');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xl shadow-indigo-100/50"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Interactive Testing Sandbox
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Explore All Features in Action
          </h2>
          <p className="text-sm text-slate-500 max-w-xl">
            Seed realistic demo links complete with 50 live clicks, password protection, smart targeting, and A/B split testing.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding || isResetting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200/60 hover:shadow-lg hover:shadow-indigo-300/60 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Seed Demo Data
          </button>

          <button
            type="button"
            onClick={() => startTour()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Compass className="w-4 h-4 text-indigo-600" />
            Start Guided Tour
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSeeding || isResetting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Reset Demo
          </button>
        </div>
      </div>
    </motion.div>
  );
}
