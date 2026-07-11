"use client";

import { useEffect, useState, useMemo } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DataPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/data/plans")
      .then((r) => r.json())
      .then((data) => setPlans(data.plans || []))
      .finally(() => setLoading(false));
  }, []);

  const byNetwork = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const p of plans) {
      groups[p.network] = groups[p.network] || [];
      groups[p.network].push(p);
    }
    return groups;
  }, [plans]);

  async function buy() {
    if (!selectedPlan || !phone) return;
    setError("");
    setSuccess("");
    setBuying(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Purchase failed");
      setSuccess("Data purchase successful.");
      setSelectedPlan(null);
      setPhone("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buy Data & Airtime</h1>

      {error && <div className="p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm font-semibold">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-semibold">{success}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted)]">
          <Loader2 className="animate-spin mr-2" /> Loading plans...
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byNetwork).map(([network, list]) => (
            <div key={network}>
              <h2 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wide mb-3">{network}</h2>
              <div className="grid grid-cols-2 gap-3">
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    className={`p-4 rounded-2xl text-left border transition ${
                      selectedPlan?.id === p.id
                        ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                        : "bg-[var(--card)] border-[var(--line)]"
                    }`}
                  >
                    <Smartphone size={18} className="text-[var(--primary)] mb-2" />
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-lg font-bold mt-1">{formatCurrency(p.sell_price)}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-[var(--card)] rounded-3xl p-6 border border-[var(--line)] space-y-4">
            <h2 className="text-xl font-bold">{selectedPlan.name}</h2>
            <p className="text-2xl font-bold">{formatCurrency(selectedPlan.sell_price)}</p>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-3 rounded-xl font-semibold bg-[var(--background-2)] text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={buy}
                disabled={buying || !phone}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"
              >
                {buying ? <Loader2 className="animate-spin" size={18} /> : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
