"use client";

import { Scissors } from "lucide-react";

export default function ScrollToTopButton() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-indigo-900/20 cursor-pointer"
    >
      <Scissors className="w-4 h-4" />
      Get Started Free
    </button>
  );
}
