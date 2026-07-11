"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, Database, LogOut, Key } from "lucide-react";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/otp", label: "OTP Rules", icon: Settings },
  { href: "/admin/data", label: "Data Plans", icon: Database },
  { href: "/admin/keys", label: "API Keys", icon: Key },
];

export default function AdminTopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur border-b border-[var(--line)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-bold text-lg neon-text">
          GigaPlug Admin
        </Link>
        <nav className="flex items-center gap-2 overflow-x-auto">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                  active ? "bg-[var(--card)] text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <a
            href="/api/auth/logout"
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-[var(--danger)]"
          >
            <LogOut size={16} />
          </a>
        </nav>
      </div>
    </header>
  );
}
