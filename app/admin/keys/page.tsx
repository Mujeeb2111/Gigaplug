"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

const DEFAULT_KEYS = [
  { provider: "Squad", key_name: "SQUAD_SECRET_KEY", label: "Squad Secret Key" },
  { provider: "5sim", key_name: "FIVESIM_API_KEY", label: "5sim API Key" },
  { provider: "ClubKonnect", key_name: "CLUBKONNECT_API_KEY", label: "ClubKonnect API Key" },
  { provider: "ClubKonnect", key_name: "CLUBKONNECT_USER_ID", label: "ClubKonnect User ID" },
  { provider: "Brevo", key_name: "BREVO_API_KEY", label: "Brevo API Key" },
  { provider: "Brevo", key_name: "BREVO_SENDER_EMAIL", label: "Brevo Sender Email" },
];

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [show, setShow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/api-keys")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const k of data.keys || []) map[k.key_name] = k.value;
        setKeys(map);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveKey(keyName: string) {
    const key = DEFAULT_KEYS.find((k) => k.key_name === keyName);
    if (!key) return;
    setSaving(keyName);
    await fetch("/api/admin/api-keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: key.provider, key_name: keyName, value: keys[keyName] || "" }),
    });
    setSaving(null);
  }

  if (loading) return <div className="p-6 text-[var(--muted)] flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API Keys</h1>
      <p className="text-sm text-[var(--muted)]">
        Keys stored here are saved in the Supabase database and take effect immediately. These will override environment variables while the app is running.
      </p>

      <div className="space-y-3">
        {DEFAULT_KEYS.map((k) => (
          <div key={k.key_name} className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-2">
            <label className="text-xs font-bold text-[var(--muted)] uppercase">{k.label}</label>
            <div className="flex gap-2">
              <input
                type={show[k.key_name] ? "text" : "password"}
                value={keys[k.key_name] || ""}
                onChange={(e) => setKeys({ ...keys, [k.key_name]: e.target.value })}
                className="flex-1 bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-2 text-[var(--text)]"
              />
              <button
                onClick={() => setShow({ ...show, [k.key_name]: !show[k.key_name] })}
                className="px-3 rounded-lg bg-[var(--background-2)] text-[var(--muted)]"
              >
                {show[k.key_name] ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                onClick={() => saveKey(k.key_name)}
                disabled={saving === k.key_name}
                className="px-4 rounded-lg bg-[var(--primary)] text-white font-bold flex items-center gap-1"
              >
                {saving === k.key_name ? <Loader2 className="animate-spin" size={16} /> : <Save size={18} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
