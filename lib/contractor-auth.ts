/**
 * Contractor login configuration — email → { crewName, pin }
 * Maintained by Miriam as contractors are added/offboarded.
 */

export const CONTRACTOR_LOGINS: Record<string, { crewName: string; pin: string }> = {
  // Example contractors — Miriam populates with real crew emails and PINs
  // "crew1@example.com": { crewName: "Ace Painting Crew", pin: "1234" },
  // "crew2@example.com": { crewName: "Pro Finishers", pin: "5678" },
};

/**
 * Validate contractor credentials (email + PIN).
 * Returns the crew name on success, null on failure.
 */
export function validateContractorCredentials(
  email: string | undefined | null,
  pin: string | undefined | null
): string | null {
  if (!email || !pin) return null;
  const login = CONTRACTOR_LOGINS[email.toLowerCase().trim()];
  if (!login || login.pin !== pin) return null;
  return login.crewName;
}
