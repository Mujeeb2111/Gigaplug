"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Smartphone, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((data) => setBalance(data.balance || 0))
      .finally(() => setLoading(false));
  }, []);

  const actions = [
    { href: "/wallet", label: "Fund Wallet", icon: Wallet, color: "var(--accent)" },
    { href: "/data", label: "Buy Data", icon: Smartphone, color: "var(--primary)" },
    { href: "/otp", label: "Get OTP Number", icon: ShieldCheck, color: "var(--gold)" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card-2)] rounded-3xl p-6 border border-[var(--line)] neon-glow">
        <p className="text-[var(--muted)] text-sm font-medium">Wallet Balance</p>
        <h2 className="text-4xl font-extrabold mt-2 neon-text">
          {loading ? "..." : formatCurrency(balance)}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] active:scale-95 transition"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: `rgba(${hexToRgb(a.color)}, 0.15)` }}
              >
                <Icon size={22} style={{ color: a.color }} />
              </div>
              <span className="text-xs font-semibold text-center text-[var(--text)]">{a.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Recent Activity</h3>
        <TransactionsList />
      </div>
    </div>
  );
}

function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet/transactions?limit=10")
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[var(--muted)]">Loading...</div>;
  if (!transactions.length) return <div className="text-[var(--muted)]">No transactions yet.</div>;

  return (
    <div className="space-y-2">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]"
        >
          <div>
            <p className="font-semibold text-sm">{t.description}</p>
            <p className="text-xs text-[var(--muted)]">{new Date(t.created_at).toLocaleDateString()}</p>
          </div>
          <span
            className={`font-bold ${
              ["funding", "manual_credit", "refund"].includes(t.type) ? "text-[var(--accent)]" : "text-[var(--text)]"
            }`}
          >
            {["funding", "manual_credit", "refund"].includes(t.type) ? "+" : "-"}
            {formatCurrency(t.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function hexToRgb(hex: string) {
  const h = hex.replace("var(--", "").replace(")", "");
  const map: Record<string, string> = {
    accent: "31, 209, 165",
    primary: "91, 124, 255",
    gold: "255, 194, 75",
  };
  return map[h] || "255,255,255";
}
