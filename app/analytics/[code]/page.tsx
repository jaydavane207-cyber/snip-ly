"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  MousePointerClick,
  Globe,
  Monitor,
  Smartphone,
  Copy,
  ExternalLink,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface StatsData {
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  totalClicks: number;
  clicksLast7Days: { date: string; count: number }[];
  byCountry: { name: string; value: number }[];
  byBrowser: { name: string; value: number }[];
  byDevice: { name: string; value: number }[];
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#818cf8",
  "#4f46e5",
  "#7c3aed",
  "#ddd6fe",
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-slate-100 animate-pulse rounded w-20" />
        <div className="h-7 bg-slate-100 animate-pulse rounded w-16" />
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code;

  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const shortUrl = code ? `${baseUrl}/s/${code}` : "";

  const fetchStats = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/links/${code}/stats`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch stats");
      }
      const data = await res.json();
      setStats(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/links/${code}/stats`);
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to fetch stats");
        }
        const data = await res.json();
        if (!ignore) {
          setStats(data);
        }
      } catch (e: unknown) {
        if (!ignore) {
          const msg = e instanceof Error ? e.message : "Something went wrong";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [code]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const noData = !isLoading && stats?.totalClicks === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Back + refresh */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              fetchStats();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/60 shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">
              Analytics{" "}
              {code && (
                <Badge variant="info" className="ml-2 align-middle text-xs">
                  /s/{code}
                </Badge>
              )}
            </h1>
            {stats && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 truncate max-w-xs">
                  {stats.originalUrl}
                </span>
              </div>
            )}
          </div>
          {shortUrl && (
            <div className="sm:ml-auto flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
                {shortUrl}
              </span>
              <button
                onClick={() => copy(shortUrl)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Open link"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <Card className="text-center py-16">
            <p className="text-slate-500 mb-4">{error}</p>
            <Button variant="primary" onClick={fetchStats}>
              Try Again
            </Button>
          </Card>
        )}

        {!error && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {isLoading ? (
                [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
              ) : stats ? (
                <>
                  <StatCard
                    icon={MousePointerClick}
                    label="Total Clicks"
                    value={stats.totalClicks}
                    sub="All time"
                    gradient="from-indigo-500 to-violet-600"
                  />
                  <StatCard
                    icon={Globe}
                    label="Top Country"
                    value={stats.byCountry[0]?.name ?? "—"}
                    sub={
                      stats.byCountry[0]
                        ? `${stats.byCountry[0].value} clicks`
                        : "No data"
                    }
                    gradient="from-emerald-500 to-teal-600"
                  />
                  <StatCard
                    icon={Monitor}
                    label="Top Browser"
                    value={stats.byBrowser[0]?.name ?? "—"}
                    sub={
                      stats.byBrowser[0]
                        ? `${stats.byBrowser[0].value} clicks`
                        : "No data"
                    }
                    gradient="from-sky-500 to-blue-600"
                  />
                  <StatCard
                    icon={Smartphone}
                    label="Top Device"
                    value={stats.byDevice[0]?.name ?? "—"}
                    sub={
                      stats.byDevice[0]
                        ? `${stats.byDevice[0].value} clicks`
                        : "No data"
                    }
                    gradient="from-pink-500 to-rose-600"
                  />
                </>
              ) : null}
            </div>

            {/* No clicks message */}
            {noData && (
              <Card className="text-center py-16 mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MousePointerClick className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">No clicks yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Share your link to start seeing analytics.
                </p>
              </Card>
            )}

            {/* Area chart */}
            {!noData && (
              <Card className="mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Clicks — Last 7 Days
                  </h2>
                  {stats && (
                    <Badge variant="info">
                      <MousePointerClick className="w-3 h-3" />
                      {stats.clicksLast7Days.reduce((s, d) => s + d.count, 0)} this week
                    </Badge>
                  )}
                </div>
                {isLoading ? (
                  <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
                ) : stats ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={stats.clicksLast7Days}
                      margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          fontSize: 13,
                          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                        }}
                        formatter={(v) => [v as number, "Clicks"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#areaGrad)"
                        dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#6366f1" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </Card>
            )}

            {/* Pie charts */}
            {!noData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Country */}
                <Card>
                  <h2 className="text-base font-semibold text-slate-900 mb-6">
                    Clicks by Country
                  </h2>
                  {isLoading ? (
                    <div className="h-52 bg-slate-100 animate-pulse rounded-xl" />
                  ) : stats && stats.byCountry.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats.byCountry}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {stats.byCountry.map((_, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            fontSize: 13,
                          }}
                          formatter={(v) => [v as number, "Clicks"]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-52 flex items-center justify-center text-sm text-slate-400">
                      No country data
                    </div>
                  )}
                </Card>

                {/* By Browser */}
                <Card>
                  <h2 className="text-base font-semibold text-slate-900 mb-6">
                    Clicks by Browser & Device
                  </h2>
                  {isLoading ? (
                    <div className="h-52 bg-slate-100 animate-pulse rounded-xl" />
                  ) : stats && stats.byBrowser.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats.byBrowser}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {stats.byBrowser.map((_, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            fontSize: 13,
                          }}
                          formatter={(v) => [v as number, "Clicks"]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-52 flex items-center justify-center text-sm text-slate-400">
                      No browser data
                    </div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
