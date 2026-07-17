"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a9aae 0%, #05C3DE 50%, #04afc9 100%)" }}>

      {/* Wave decoration — bottom left, matches doorkocking app */}
      <svg
        className="absolute bottom-0 left-0 w-80 opacity-20"
        viewBox="0 0 320 200"
        fill="white"
        preserveAspectRatio="none"
      >
        <path d="M0,200 L0,80 Q40,20 80,60 Q120,100 160,50 Q200,0 240,40 Q280,80 320,30 L320,200 Z" />
      </svg>
      <svg
        className="absolute top-0 right-0 w-64 opacity-10 rotate-180"
        viewBox="0 0 320 200"
        fill="white"
        preserveAspectRatio="none"
      >
        <path d="M0,200 L0,80 Q40,20 80,60 Q120,100 160,50 Q200,0 240,40 Q280,80 320,30 L320,200 Z" />
      </svg>

      {/* Left side — Huey + branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative z-10">
        {/* Huey mascot */}
        <div className="relative">
          <Image
            src="/huey-mascot.png"
            alt="Huey — Pro-Vision Painting mascot"
            width={320}
            height={360}
            className="drop-shadow-2xl"
            priority
            unoptimized
          />
        </div>

        {/* Brand text */}
        <div className="text-center mt-4">
          <div className="font-display font-black text-4xl text-white uppercase tracking-wide leading-tight drop-shadow-lg">
            Pro-Vision
          </div>
          <div className="text-white/70 text-sm uppercase tracking-widest font-bold mt-1">
            Production Management
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-8 text-center">
          <p className="text-white/80 text-base font-medium max-w-xs leading-relaxed">
            "Let&apos;s get painting — <span className="text-white font-bold">Huey&apos;s got jobs to run.</span>"
          </p>
        </div>
      </div>

      {/* Right side — Login card */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">

          {/* Mobile: show Huey small */}
          <div className="flex lg:hidden justify-center mb-4">
            <Image
              src="/huey-mascot.png"
              alt="Huey"
              width={80}
              height={90}
              className="drop-shadow-md"
              unoptimized
            />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="font-display font-black text-2xl text-provision-navy uppercase tracking-tight">
              Pro-Vision
            </div>
            <div className="text-provision-teal text-xs font-bold uppercase tracking-widest mt-0.5">
              Production App
            </div>
            <p className="text-provision-gray-text text-sm mt-2">
              Sign in to your team account
            </p>
          </div>

          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #D14124, #e05e3a)" }}
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
                className="w-full rounded-xl border-2 border-provision-teal px-4 py-3 text-sm font-bold text-provision-teal hover:bg-provision-teal-light transition-all active:scale-95"
              >
                Sign in with team passphrase
              </button>
            </div>
          )}

          {mode === "passphrase" && (
            <form onSubmit={handlePassphrase} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-provision-gray-text uppercase tracking-wide mb-1.5">
                  Your @provisionpaints.com email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="brandon@provisionpaints.com"
                  required
                  className="w-full border-2 border-provision-gray-mid rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-provision-teal transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-provision-gray-text uppercase tracking-wide mb-1.5">
                  Team passphrase
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border-2 border-provision-gray-mid rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-provision-teal transition"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #D14124, #e05e3a)" }}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Sign In
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

          <p className="text-xs text-provision-gray-muted text-center mt-5">
            Team access only · Pro-Vision Painting
          </p>
        </div>
      </div>
    </div>
  );
}
