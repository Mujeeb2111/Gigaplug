"use client";

import { useEffect, useState } from "react";
import { LogOut, User, Mail, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { setUser(data.user); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[var(--muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--line)] flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] flex items-center justify-center">
          <User size={28} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-lg">{user?.name || user?.email}</p>
          <p className="text-sm text-[var(--muted)]">{user?.email}</p>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--line)] overflow-hidden">
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 px-5 py-4 text-[var(--danger)] font-semibold"
        >
          <LogOut size={20} />
          Log out
        </a>
      </div>
    </div>
  );
}
