"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function ContractorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("contractor", {
      email,
      pin,
      redirect: false,
      callbackUrl: "/contractor",
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/contractor");
      router.refresh();
    } else {
      setError("Wrong email or PIN. Please try again.");
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
          ProVision Crew Portal
        </h1>
        <p className="text-sm text-provision-gray-text mt-1 mb-8">
          Sign in with your crew email and PIN
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-provision-charcoal mb-1.5">
              Crew Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="crew@example.com"
              required
              autoFocus
              className="w-full border border-provision-gray-mid rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-provision-orange focus:ring-1 focus:ring-provision-orange/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-provision-charcoal mb-1.5">
              PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
              maxLength={4}
              className="w-full border border-provision-gray-mid rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-provision-orange focus:ring-1 focus:ring-provision-orange/20"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-provision-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-provision-orange-dark transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sign In
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-provision-gray-mid">
          <p className="text-xs text-provision-gray-text mb-3">
            Team member?
          </p>
          <Link
            href="/login"
            className="text-xs text-provision-orange hover:text-provision-orange-dark transition font-medium"
          >
            Sign in with team passphrase →
          </Link>
        </div>

        <p className="text-xs text-provision-gray-text mt-6">
          Contact Miriam at{" "}
          <a
            href="mailto:miriam@provisionpaints.com"
            className="text-provision-orange hover:text-provision-orange-dark"
          >
            miriam@provisionpaints.com
          </a>
          {" "}for login issues.
        </p>
      </div>
    </div>
  );
}
