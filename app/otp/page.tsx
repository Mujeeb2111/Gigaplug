"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, RefreshCw, Copy, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function OtpPage() {
  const [countries, setCountries] = useState<any[]>([]);
  const [services, setServices] = useState<Record<string, any>>({});
  const [tiers, setTiers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [service, setService] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/otp/countries"), fetch("/api/admin/settings").then((r) => r.json())])
      .then(async ([cRes, settings]) => {
        const cData = await cRes.json();
        setCountries(cData.countries || []);
        setTiers(settings.config.otp_tiers || []);
      })
      .finally(() => setLoading(false));
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!country) {
      setServices({});
      return;
    }
    fetch(`/api/otp/services?country=${country}`)
      .then((r) => r.json())
      .then((data) => setServices(data.products || {}));
  }, [country]);

  useEffect(() => {
    if (!country || !service || !tier) {
      setPricing(null);
      return;
    }
    fetch(`/api/otp/pricing?country=${country}&product=${service}&tier=${tier}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.cost) setPricing(data);
        else setPricing(null);
      });
  }, [country, service, tier]);

  async function fetchOrders() {
    // No user orders endpoint yet; using a full GET from admin? Let's add /api/otp/orders
    fetch("/api/otp/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {});
  }

  async function buy() {
    if (!country || !service || !tier) return;
    setError("");
    setBuying(true);
    try {
      const res = await fetch("/api/otp/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, product: service, tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Purchase failed");
      await fetchOrders();
      setService("");
      setTier(null);
      setPricing(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBuying(false);
    }
  }

  async function checkOrderStatus(fivesimId: string) {
    const res = await fetch(`/api/otp/status/${fivesimId}`);
    const data = await res.json();
    if (res.ok) fetchOrders();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">OTP Number</h1>

      {error && <div className="p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm font-semibold">{error}</div>}

      {loading ? (
        <div className="text-[var(--muted)] flex items-center gap-2 py-20">
          <Loader2 className="animate-spin" /> Loading...
        </div>
      ) : (
        <div className="space-y-4">
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setService(""); setTier(null); setPricing(null); }}
            className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)]"
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.country}>{c.name}</option>
            ))}
          </select>

          {country && (
            <select
              value={service}
              onChange={(e) => { setService(e.target.value); setTier(null); setPricing(null); }}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)]"
            >
              <option value="">Select service</option>
              {Object.entries(services).map(([name, info]: [string, any]) => (
                <option key={name} value={name}>{info?.Name || name}</option>
              ))}
            </select>
          )}

          {service && (
            <div className="grid grid-cols-3 gap-3">
              {tiers.map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`p-3 rounded-xl font-bold text-sm border ${
                    tier === t ? "bg-[var(--primary)]/10 border-[var(--primary)]" : "bg-[var(--card)] border-[var(--line)]"
                  }`}
                >
                  {formatCurrency(t)}
                </button>
              ))}
            </div>
          )}

          {pricing && (
            <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--line)] space-y-2">
              <p className="text-sm text-[var(--muted)]">Live cost: <strong className="text-[var(--text)]">{formatCurrency(pricing.cost)}</strong></p>
              <p className="text-sm text-[var(--muted)]">Profit: <strong className="text-[var(--text)]">{formatCurrency(pricing.profit)}</strong></p>
              <button
                onClick={buy}
                disabled={buying}
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"
              >
                {buying ? <Loader2 className="animate-spin" size={18} /> : "Buy Number"}
              </button>
            </div>
          )}

          <div className="space-y-3 pt-6">
            <h3 className="text-lg font-bold">My OTP Numbers</h3>
            {orders.length === 0 ? (
              <p className="text-[var(--muted)]">No active numbers.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{o.country} · {o.service}</p>
                        <p className="text-xs text-[var(--muted)]">{o.phone || "Waiting for number"}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded bg-[var(--background-2)]">{o.status}</span>
                    </div>
                    {o.sms_code && (
                      <div className="flex items-center justify-between bg-[var(--background-2)] rounded-xl p-3">
                        <span className="font-mono font-bold">{o.sms_code}</span>
                        <button onClick={() => copyCode(o.sms_code)} className="text-[var(--muted)]">
                          <Copy size={16} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => checkOrderStatus(o.fivesim_order_id)}
                      className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]"
                    >
                      <RefreshCw size={14} /> Check for SMS
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
