"use client";

import { usePathname } from "next/navigation";
import { SessionUser } from "@/lib/session";
import BottomNav from "@/components/BottomNav";
import AdminTopNav from "@/components/AdminTopNav";
import { useEffect } from "react";

export default function ClientLayout({
  session,
  children,
}: {
  session: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  const isLoginPage = pathname === "/";

  useEffect(() => {
    if (session) {
      // Keep the session fresh in a shared window property for client-side fetch helpers
      (window as any).__GIGAPLUG_SESSION = session;
    }
  }, [session]);

  return (
    <div className="flex flex-col min-h-screen">
      {!isLoginPage && session?.role === "admin" && <AdminTopNav />}
      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 pb-24 pt-4 sm:pb-4">
        {children}
      </main>
      {!isLoginPage && session?.role === "user" && <BottomNav />}
    </div>
  );
}
