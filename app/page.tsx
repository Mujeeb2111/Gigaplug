"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Zap, ShieldCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"email" | "otp" | "admin">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      if (data.role === "admin") {
        router.push("/admin");
      } else {
        setMode("otp");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdmin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-72 h-72 rounded-full bg-[var(--primary)]/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm bg-[var(--card)] rounded-3xl p-8 border border-[var(--line)] neon-glow">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] grid place-items-center">
            <Zap className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-extrabold">GigaPlug</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm font-semibold">
            {error}
          </div>
        )}

        {mode === "email" && (
          <form onSubmit={handleEmail} className="space-y-4">
            <p className="text-[var(--muted)] text-center text-sm">
              Enter your email to receive a one-time login code.
            </p>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Send Login Code"}
            </button>
            <button
              type="button"
              onClick={() => setMode("admin")}
              className="w-full flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ShieldCheck size={16} /> Admin login
            </button>
          </form>
        )}

        {mode === "admin" && (
          <form onSubmit={handleAdmin} className="space-y-4">
            <p className="text-[var(--muted)] text-center text-sm">Admin dashboard access.</p>
            <input
              type="email"
              required
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
            <input
              type="password"
              required
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Admin Login"}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="w-full text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Back to user login
            </button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={handleOtp} className="space-y-4">
            <p className="text-[var(--muted)] text-center text-sm">
              We sent a 6-digit code to <strong className="text-[var(--text)]">{email}</strong>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-[var(--background-2)] border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text)] text-center tracking-[0.5em] text-xl focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="w-full text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
