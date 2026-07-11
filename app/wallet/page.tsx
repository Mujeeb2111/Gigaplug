"use client";

import { useEffect, useState } from "react";
import { Copy, Wallet, ArrowDownUp, CircleCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [va, setVa] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((data) => {
        setBalance(data.balance || 0);
        setVa(data.virtualAccount || null);
      });
    fetch("/api/wallet/transactions?limit=20")
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  function copyNumber() {
    if (va?.account_number) {
      navigator.clipboard.writeText(va.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card-2)] rounded-3xl p-6 border border-[var(--line)] neon-glow">
        <p className="text-[var(--muted)] text-sm font-medium">Available Balance</p>
        <h2 className="text-4xl font-extrabold mt-2 neon-text">{formatCurrency(balance)}</h2>
      </div>

      <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--line)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <ArrowDownUp size={18} />
          <span className="font-semibold text-sm">Fund by bank transfer</span>
        </div>
        {va ? (
          <>
            <div className="flex items-center justify-between bg-[var(--background-2)] rounded-xl p-3">
              <div>
                <p className="text-lg font-mono font-bold">{va.account_number}</p>
                <p className="text-xs text-[var(--muted)]">{va.bank_name || "Squad"} - {va.account_name || "Gigaplug"}</p>
              </div>
              <button
                onClick={copyNumber}
                className="p-2 rounded-lg bg-[var(--card-2)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                {copied ? <CircleCheck size={18} className="text-[var(--accent)]" /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Transfer to this account to credit your wallet. Funds are usually credited automatically.
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">Your dedicated account is being generated.</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">History</h3>
        {loading ? (
          <p className="text-[var(--muted)]">Loading...</p>
        ) : !transactions.length ? (
          <p className="text-[var(--muted)]">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]"
              >
                <div>
                  <p className="font-semibold text-sm">{t.description}</p>
                  <p className="text-xs text-[var(--muted)]">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span
                  className={`font-bold ${
                    ["funding", "manual_credit", "refund"].includes(t.type)
                      ? "text-[var(--accent)]"
                      : "text-[var(--text)]"
                  }`}
                >
                  {["funding", "manual_credit", "refund"].includes(t.type) ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
