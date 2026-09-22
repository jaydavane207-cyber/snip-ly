import { Zap, BarChart3, ShieldCheck, Code2, ClipboardPaste, Scissors, Share2 } from "lucide-react";
import ShortenForm from "@/components/ShortenForm";
import RecentLinks from "@/components/RecentLinks";
import { Badge } from "@/components/ui/Badge";
import ScrollToTopButton from "@/components/ScrollToTopButton";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Redis-powered caching delivers sub-10ms redirects globally.",
    gradient: "from-yellow-400 to-orange-500",
    bg: "bg-yellow-50",
  },
  {
    icon: BarChart3,
    title: "Real Analytics",
    desc: "Track clicks by country, device, and browser in real time.",
    gradient: "from-indigo-500 to-violet-600",
    bg: "bg-indigo-50",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    desc: "Set expiry windows. Your links, your rules.",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Code2,
    title: "Developer API",
    desc: "Simple REST API with JSON — integrate in minutes.",
    gradient: "from-pink-500 to-rose-600",
    bg: "bg-pink-50",
  },
];

const steps = [
  { icon: ClipboardPaste, title: "Paste your URL", desc: "Drop in any long URL — no account needed.", step: "01" },
  { icon: Scissors, title: "Click Shorten", desc: "Get a clean short link instantly with optional alias.", step: "02" },
  { icon: Share2, title: "Share & Track", desc: "Share everywhere. Watch your analytics in real time.", step: "03" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="grid-bg pt-16 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            Fast · Secure · Analytics
          </div>

          {/* H1 */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
            Shorten Links.{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Track Everything.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create short links with QR codes and real-time analytics.
            Fast, simple, and reliable — no account required.
          </p>

          {/* Form */}
          <div className="max-w-2xl mx-auto">
            <ShortenForm />
          </div>
        </div>
      </section>

      {/* ── RECENT LINKS ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <RecentLinks />
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section
        id="features"
        className="py-20 bg-slate-50 border-t border-slate-100"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="info" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Everything you need
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Built for speed, reliability, and insights — all in one clean interface.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 hover:shadow-xl hover:shadow-slate-200/70 hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}
                >
                  <div
                    className={`bg-gradient-to-br ${f.gradient} w-10 h-10 rounded-xl flex items-center justify-center`}
                  >
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4">Simple</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            How it works
          </h2>
          <p className="text-slate-500">Three steps to your perfect short link.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.step} className="text-center relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-indigo-200 to-violet-200" />
              )}
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/60 mx-auto">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 flex items-center justify-center shadow-sm">
                  {s.step}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-16 text-center text-white shadow-2xl shadow-indigo-300/40">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to shorten your first link?
          </h2>
          <p className="text-indigo-100 mb-8 text-base">
            Join thousands of users tracking their links in real-time. Free, forever.
          </p>
          <ScrollToTopButton />
        </div>
      </section>
    </div>
  );
}
