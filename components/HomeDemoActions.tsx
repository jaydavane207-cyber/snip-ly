'use client';

import Link from 'next/link';
import { Compass, Play } from 'lucide-react';
import { startHomeTour } from '@/components/ProductTour';

export default function HomeDemoActions() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      <button
        type="button"
        onClick={() => startHomeTour()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm hover:shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <Compass className="w-3.5 h-3.5 text-indigo-600" />
        Take Tour
      </button>

      <Link
        href="/demo"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Play className="w-3.5 h-3.5 fill-white text-white" />
        Live Demo
      </Link>
    </div>
  );
}
