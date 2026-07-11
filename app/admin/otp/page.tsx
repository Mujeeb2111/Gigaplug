"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash } from "lucide-react";

export default function AdminOtpPage() {
  const [config, setConfig] = useState<any>({});
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTier, setNewTier] = useState("");
  const [newCountry, setNewCountry] = useState({ country: "", name: "", is_eu: false, min_profit: "500", max_profit: "3000", enabled: true });

  useEffect(() => {
    Promise.all([fetch("/api/admin/settings"), fetch("/api/admin/otp-countries")])
      .then(async ([sRes, cRes]) => {
        const sData = await sRes.json();
        const cData = await cRes.json();
        setConfig(sData.config || {});
        setCountries(cData.countries || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp_tiers: config.otp_tiers }),
    });
    setSaving(false);
  }

  function addTier() {
    const val = Number(newTier);
    if (!val || config.otp_tiers?.includes(val)) return;
    setConfig((c: any) => ({ ...c, otp_tiers: [...(c.otp_tiers || []), val].sort((a: number, b: number) => a - b) }));
    setNewTier("");
  }

  function removeTier(idx: number) {
    const tiers = [...config.otp_tiers];
    tiers.splice(idx, 1);
    setConfig((c: any) => ({ ...c, otp_tiers: tiers }));
  }

  async function addCountry(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/otp-countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newCountry,
        min_profit: Number(newCountry.min_profit),
        max_profit: Number(newCountry.max_profit) || null,
      }),
    });
    if (res.ok) {
      setNewCountry({ country: "", name: "", is_eu: false, min_profit: "500", max_profit: "3000", enabled: true });
      const data = await fetch("/api/admin/otp-countries").then((r) => r.json());
      setCountries(data.countries || []);
    }
  }

  async function updateCountry(id: string, updates: any) {
    const res = await fetch(`/api/admin/otp-countries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await fetch("/api/admin/otp-countries").then((r) => r.json());
      setCountries(data.countries || []);
    }
  }

  async function deleteCountry(id: string) {
    if (!confirm("Delete this country rule?")) return;
    await fetch(`/api/admin/otp-countries/${id}`, { method: "DELETE" });
    const data = await fetch("/api/admin/otp-countries").then((r) => r.json());
    setCountries(data.countries || []);
  }

  if (loading) return <div className="p-6 text-[var(--muted)] flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">OTP Price Tiers</h1>

      <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--line)] space-y-4">
        <div className="flex flex-wrap gap-2">
          {config.otp_tiers?.map((t: number, i: number) => (
            <div key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--background-2)]">
              <span className="font-bold">₦{t.toLocaleString()}</span>
              <button onClick={() => removeTier(i)} className="text-[var(--danger)]"><Trash size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="New tier"
            value={newTier}
            onChange={(e) => setNewTier(e.target.value)}
            className="flex-1 bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
          />
          <button onClick={addTier} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-bold"><Plus size={18} /></button>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Tiers</>}
        </button>
      </div>

      <h1 className="text-2xl font-bold">OTP Countries & Rules</h1>

      <form onSubmit={addCountry} className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--line)] space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Country slug (e.g. usa)"
            value={newCountry.country}
            onChange={(e) => setNewCountry({ ...newCountry, country: e.target.value })}
            className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
          />
          <input
            placeholder="Name"
            value={newCountry.name}
            onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
            className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
          />
          <input
            type="number"
            placeholder="Min profit"
            value={newCountry.min_profit}
            onChange={(e) => setNewCountry({ ...newCountry, min_profit: e.target.value })}
            className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
          />
          <input
            type="number"
            placeholder="Max profit (EU)"
            value={newCountry.max_profit}
            onChange={(e) => setNewCountry({ ...newCountry, max_profit: e.target.value })}
            className="bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={newCountry.is_eu} onChange={(e) => setNewCountry({ ...newCountry, is_eu: e.target.checked })} />
          EU / US country (apply max profit ceiling)
        </label>
        <button type="submit" className="w-full py-2 rounded-xl font-bold bg-[var(--primary)] text-white">Add Country Rule</button>
      </form>

      <div className="space-y-2">
        {countries.map((c) => (
          <div key={c.id} className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-between">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-[var(--muted)]">min ₦{Number(c.min_profit).toLocaleString()} · max {c.max_profit ? `₦${Number(c.max_profit).toLocaleString()}` : "none"} · {c.is_eu ? "EU/US" : "Other"}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <input type="checkbox" checked={c.enabled} onChange={(e) => updateCountry(c.id, { enabled: e.target.checked })} />
                Enabled
              </label>
              <button onClick={() => deleteCountry(c.id)} className="text-[var(--danger)]"><Trash size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
