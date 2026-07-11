"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, ArrowRightLeft, TrendingUp, Database, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((data) => setOverview(data))
      .finally(() => setLoading(false));
    fetch("/api/admin/logs?limit=20")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []));
  }, []);

  if (loading) return <div className="p-6 text-[var(--muted)] flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>;

  const stats = [
    { label: "Users", value: overview?.userCount || 0, icon: Users },
    { label: "Transactions", value: overview?.transactionCount || 0, icon: ArrowRightLeft },
    { label: "Total Profit", value: formatCurrency(overview?.totalProfit || 0), icon: TrendingUp },
    { label: "Data Orders", value: overview?.dataOrderCount || 0, icon: Database },
    { label: "OTP Orders", value: overview?.otpOrderCount || 0, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]">
              <Icon size={20} className="text-[var(--primary)] mb-2" />
              <p className="text-xs text-[var(--muted)]">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Recent API Logs</h3>
        <div className="space-y-2">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase">{log.provider}</span>
                <span className={`px-2 py-0.5 rounded ${log.status >= 200 && log.status < 300 ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"}`}>{log.status}</span>
              </div>
              <p className="text-[var(--muted)] truncate mt-1">{log.endpoint}</p>
              <p className="text-[var(--muted)]">{log.duration_ms}ms · {new Date(log.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
