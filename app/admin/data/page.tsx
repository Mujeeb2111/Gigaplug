"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Save, Trash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminDataPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newPlan, setNewPlan] = useState({ network: "MTN", plan_code: "", name: "", cost_price: "", sell_price: "", enabled: true });
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    const res = await fetch("/api/admin/data-plans");
    const data = await res.json();
    setPlans(data.plans || []);
    setLoading(false);
  }

  async function sync() {
    setSyncing(true);
    await fetch("/api/admin/data-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sync: true }),
    });
    await fetchPlans();
    setSyncing(false);
  }

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/data-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newPlan,
        cost_price: Number(newPlan.cost_price),
        sell_price: Number(newPlan.sell_price),
      }),
    });
    if (res.ok) {
      setNewPlan({ network: "MTN", plan_code: "", name: "", cost_price: "", sell_price: "", enabled: true });
      fetchPlans();
    } else {
      const err = await res.json();
      alert(err.message);
    }
  }

  async function saveEdit() {
    const res = await fetch(`/api/admin/data-plans/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: editing.network,
        plan_code: editing.plan_code,
        name: editing.name,
        cost_price: Number(editing.cost_price),
        sell_price: Number(editing.sell_price),
        enabled: editing.enabled,
      }),
    });
    if (res.ok) {
      setEditing(null);
      fetchPlans();
    } else {
      const err = await res.json();
      alert(err.message);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/admin/data-plans/${id}`, { method: "DELETE" });
    fetchPlans();
  }

  if (loading) return <div className="p-6 text-[var(--muted)] flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Data Plans</h1>
        <button onClick={sync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-bold">
          {syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Sync from ClubKonnect
        </button>
      </div>

      <form onSubmit={addPlan} className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--line)] space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select
            value={newPlan.network}
            onChange={(e) => setNewPlan({ ...newPlan, network: e.target.value })}
            className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
          >
            {["MTN", "Glo", "9mobile", "Airtel"].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input placeholder="Plan code" value={newPlan.plan_code} onChange={(e) => setNewPlan({ ...newPlan, plan_code: e.target.value })} className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
          <input placeholder="Name" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
          <input type="number" placeholder="Cost price" value={newPlan.cost_price} onChange={(e) => setNewPlan({ ...newPlan, cost_price: e.target.value })} className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
          <input type="number" placeholder="Sell price" value={newPlan.sell_price} onChange={(e) => setNewPlan({ ...newPlan, sell_price: e.target.value })} className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
        </div>
        <button type="submit" className="w-full py-2 rounded-xl font-bold bg-[var(--primary)] text-white flex items-center justify-center gap-2"><Plus size={18} /> Add Plan</button>
      </form>

      <div className="space-y-2">
        {plans.map((p) => (
          <div key={p.id} className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-[var(--muted)]">{p.network} · {p.plan_code}</p>
              <p className="text-sm font-bold mt-1">{formatCurrency(p.sell_price)} <span className="text-xs text-[var(--muted)] font-normal">(cost {formatCurrency(p.cost_price)})</span></p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(p)} className="px-3 py-2 rounded-lg bg-[var(--background-2)] text-[var(--text)] text-sm font-bold">Edit</button>
              <button onClick={() => deletePlan(p.id)} className="text-[var(--danger)]"><Trash size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-[var(--card)] rounded-3xl p-6 border border-[var(--line)] space-y-4">
            <h2 className="text-xl font-bold">Edit Plan</h2>
            <div className="space-y-3">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
              <input type="number" value={editing.cost_price} onChange={(e) => setEditing({ ...editing, cost_price: e.target.value })} className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
              <input type="number" value={editing.sell_price} onChange={(e) => setEditing({ ...editing, sell_price: e.target.value })} className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]" />
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
                Enabled
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl font-semibold bg-[var(--background-2)] text-[var(--text)]">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"><Save size={18} /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
