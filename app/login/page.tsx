"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [mode, setMode]         = useState<"choose" | "passphrase">("choose");

  async function handlePassphrase(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Wrong email or passphrase. Ask Brandon for the team passphrase.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-provision-gray p-6">
      <div className="bg-white rounded-xl shadow-card-hover p-8 max-w-sm w-full text-center">

        {/* Logo */}
        <div className="w-14 h-14 rounded-xl bg-provision-orange flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4">
          P
        </div>
        <h1 className="text-xl font-semibold text-provision-charcoal-dark">
          ProVision Production
        </h1>
        <p className="text-sm text-provision-gray-text mt-1 mb-6">
          Sign in with your ProVision account
        </p>

        {mode === "choose" && (
          <div className="space-y-3">
            {/* Google button — only shown if configured */}
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-provision-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-provision-orange-dark transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-2">
              <hr className="flex-1 border-provision-gray-mid" />
              <span className="text-xs text-provision-gray-text">or</span>
              <hr className="flex-1 border-provision-gray-mid" />
            </div>

            <button
              onClick={() => setMode("passphrase")}
              className="w-full rounded-md border border-provision-gray-mid px-4 py-2.5 text-sm font-medium text-provision-charcoal hover:bg-provision-gray transition"
            >
              Sign in with team passphrase
            </button>
          </div>
        )}

        {mode === "passphrase" && (
          <form onSubmit={handlePassphrase} className="space-y-3 text-left">
            <div>
              <label className="block text-xs text-provision-gray-text mb-1">
                Your @provisionpaints.com email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brandon@provisionpaints.com"
                required
                className="w-full border border-provision-gray-mid rounded-md px-3 py-2 text-sm focus:outline-none focus:border-provision-orange focus:ring-1 focus:ring-provision-orange/20"
              />
            </div>
            <div>
              <label className="block text-xs text-provision-gray-text mb-1">
                Team passphrase
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-provision-gray-mid rounded-md px-3 py-2 text-sm focus:outline-none focus:border-provision-orange focus:ring-1 focus:ring-provision-orange/20"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-provision-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-provision-orange-dark transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sign in
            </button>

            <button
              type="button"
              onClick={() => { setMode("choose"); setError(""); }}
              className="w-full text-xs text-provision-gray-text hover:text-provision-charcoal transition"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-xs text-provision-gray-text mt-5">
          Access is limited to ProVision team members.
        </p>
      </div>
    </div>
  );
}
