import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { validateContractorCredentials, CONTRACTOR_LOGINS } from "./contractor-auth";

const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Google OAuth (used in production when credentials are configured) ──
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── Team passphrase login (always available as fallback) ───────────────
    // Use your @provisionpaints.com email + the TEAM_PASSPHRASE from .env.local
    CredentialsProvider({
      id: "credentials",
      name: "Team Access",
      credentials: {
        email:    { label: "Your @provisionpaints.com email", type: "email",    placeholder: "you@provisionpaints.com" },
        password: { label: "Team passphrase",                 type: "password", placeholder: "Enter team passphrase" },
      },
      async authorize(credentials) {
        const passphrase = process.env.TEAM_PASSPHRASE;
        if (!passphrase) return null; // no passphrase set → disabled
        const email = credentials?.email?.toLowerCase().trim();
        if (!email || !credentials?.password) return null;
        if (credentials.password !== passphrase) return null;
        // Email must be on the allowlist (or allowlist is empty = dev mode)
        if (allowedEmails.length > 0 && !allowedEmails.includes(email)) return null;
        return { id: email, email, name: email.split("@")[0] };
      },
    }),

    // ── Contractor login (crew portal with email + PIN) ────────────────────
    CredentialsProvider({
      id: "contractor",
      name: "Crew Portal",
      credentials: {
        email: { label: "Crew email", type: "email", placeholder: "crew@example.com" },
        pin:   { label: "PIN",        type: "password", placeholder: "Enter PIN" },
      },
      async authorize(credentials) {
        const crewName = validateContractorCredentials(credentials?.email, credentials?.pin);
        if (!crewName) return null;
        const email = credentials!.email!.toLowerCase().trim();
        return { id: email, email, name: crewName };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Google sign-in: enforce allowlist
      if (account?.provider === "google") {
        if (allowedEmails.length === 0) return true;
        return allowedEmails.includes(email);
      }
      // Credentials sign-in: already validated in authorize()
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { email?: string; role?: string }).email = token.email as string;
        (session.user as { email?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      if (user?.email) token.role = roleFor(user.email);
      return token;
    },
  },

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error:  "/login",
  },
};

// ─── PM / role helpers ────────────────────────────────────────────────────────

const PM_RECORD_IDS: Record<string, string> = {
  "nico@provisionpaints.com":  "recIWuHhrhcJvOCIM",
  "tyler@provisionpaints.com": "recsAsvt9rVtOdN7w",
  // TODO: replace with Ali's real email + Airtable record ID once confirmed
  "ali@provisionpaints.com":   "recAliPlaceholder0001",
};

export const PM_NAME_TO_RECORD_ID: Record<string, string> = {
  "Nico Lawler":     "recIWuHhrhcJvOCIM",
  "Tyler Grodivant": "recsAsvt9rVtOdN7w",
  // Ali's full name as it appears in DripJobs — confirmed from live DJ Jobs data
  "Ali Ubeda Jr":    "recAliPlaceholder0001",  // TODO: confirm Ali's real Airtable People record ID
  // Colin Colby left the company but still has active jobs in DripJobs
  "Colin Colby":     "recBDt9RI3r4k4H7e",
  // Jacob Wright appears in DJ Jobs as PM on some older records
  "Jacob Wright":    "reco9oLBCchHcTW1u",
};

export function pmRecordId(email: string | undefined | null): string | null {
  if (!email) return null;
  return PM_RECORD_IDS[email.toLowerCase()] || null;
}

export function pmRecordIdByName(name: string | undefined | null): string | null {
  if (!name) return null;
  return PM_NAME_TO_RECORD_ID[name] || null;
}

export function roleFor(email: string | undefined | null):
  | "coordinator"
  | "manager"
  | "pm"
  | "contractor"
  | "unknown" {
  if (!email) return "unknown";
  const e = email.toLowerCase();
  if (e === "miriam@provisionpaints.com") return "coordinator";
  if (e === "jacob@provisionpaints.com" || e === "brandon@provisionpaints.com") return "manager";
  if (
    e === "nico@provisionpaints.com"  ||
    e === "tyler@provisionpaints.com" ||
    e === "ali@provisionpaints.com"
  ) {
    return "pm";
  }
  // Check if email is a contractor
  if (e in CONTRACTOR_LOGINS) return "contractor";
  return "unknown";
}
