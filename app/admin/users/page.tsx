"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet, Copy, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  async function adjustWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !amount) return;
    setAdjusting(true);
    const res = await fetch("/api/admin/wallet-adjustment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: selected.id, amount: Number(amount), type, reason }),
    });
    setAdjusting(false);
    if (res.ok) {
      setSelected(null);
      setAmount("");
      setReason("");
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>

      {loading ? (
        <div className="text-[var(--muted)] flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[var(--muted)]" />
                  <p className="font-semibold text-sm">{u.email}</p>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">Balance: {formatCurrency(u.walletBalance)}</p>
                {u.virtualAccount && (
                  <p className="text-xs text-[var(--muted)] font-mono">VA: {u.virtualAccount.account_number}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(u)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-bold"
              >
                <Wallet size={16} /> Adjust
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <form onSubmit={adjustWallet} className="w-full max-w-sm bg-[var(--card)] rounded-3xl p-6 border border-[var(--line)] space-y-4">
            <h2 className="text-xl font-bold">Adjust Wallet</h2>
            <p className="text-sm text-[var(--muted)]">{selected.email}</p>
            <input
              type="number"
              min={1}
              required
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)]"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)]"
            >
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <input
              type="text"
              placeholder="Reason / audit note"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)]"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 py-3 rounded-xl font-semibold bg-[var(--background-2)] text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white"
              >
                {adjusting ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Adjust"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
