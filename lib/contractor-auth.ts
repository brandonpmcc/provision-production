/**
 * Contractor / Sub crew login configuration — email → { crewName, pin, token }
 *
 * LOGIN:  email + PIN at /contractor-login
 * SECRET LINK: /crew/[token]  (no login needed — just share the URL)
 *
 * Logins auto-generated for all 47 crews in Airtable Crews table.
 * PIN format: 4 digits, memorable per crew.
 * Email format: [shortname]@provision.app (internal portal only)
 */

export interface ContractorLogin {
  crewName: string;
  pin: string;
  /** Unique token for secret-link access — share /crew/[token] with the sub */
  token: string;
}

export const CONTRACTOR_LOGINS: Record<string, ContractorLogin> = {
  // ── Active crews ──────────────────────────────────────────────────────────
  "charros@provision.app":          { crewName: "Charros Construction",              pin: "4821", token: "charros-cc-8fx2" },
  "silva@provision.app":            { crewName: "Silva Rennovations",                pin: "3759", token: "silva-rn-9kp1" },
  "aandb@provision.app":            { crewName: "A&A Painting",                      pin: "6204", token: "aandb-pt-3mq7" },
  "acma@provision.app":             { crewName: "ACMA Painting",                     pin: "1537", token: "acma-pt-5rj4" },
  "blancos@provision.app":          { crewName: "Blancos Painting",                  pin: "9063", token: "blancos-pt-7hn8" },
  "jandjpainting@provision.app":    { crewName: "J&J Painting",                     pin: "2891", token: "jandj-pt-2wx6" },
  "sapro@provision.app":            { crewName: "S&A Pro Painting",                  pin: "7415", token: "sapro-pt-4dl9" },
  "freshstart@provision.app":       { crewName: "Fresh Start Painting",              pin: "5328", token: "freshstart-pt-6yc3" },
  "smj@provision.app":              { crewName: "SMJ painting Group Llc",            pin: "8946", token: "smj-pt-1bv5" },
  "primeglow@provision.app":        { crewName: "Prime Glow Painting",               pin: "3172", token: "primeglow-pt-8nz2" },
  "mkl@provision.app":              { crewName: "MKL Services",                      pin: "6509", token: "mkl-sv-3kg7" },
  "rodez@provision.app":            { crewName: "RODEZ CONSTRUCTION LLC",            pin: "1784", token: "rodez-cn-9xp4" },
  "ebenezer@provision.app":         { crewName: "Ebenezer BJ Painting",              pin: "4923", token: "ebenezer-pt-5mf1" },
  "frpainting@provision.app":       { crewName: "FR Painting and Drywall LLC",       pin: "7651", token: "fr-pt-7wq8" },
  "yago@provision.app":             { crewName: "Yago",                              pin: "2038", token: "yago-pt-2jd6" },
  "jaxnopressure@provision.app":    { crewName: "Jax No Pressure",                   pin: "8374", token: "jaxnp-sv-4ck3" },
  "acosta@provision.app":           { crewName: "Acosta Quality Painting",           pin: "5917", token: "acosta-pt-6hm9" },
  "firstcoast@provision.app":       { crewName: "First Coast Painting",              pin: "3486", token: "firstcoast-pt-1tn5" },
  "northfloridahi@provision.app":   { crewName: "North Florida Home Improvement",    pin: "9021", token: "nfhi-sv-8rb2" },
  "wall4homes@provision.app":       { crewName: "Wall 4 Homes",                      pin: "6748", token: "wall4h-pt-3fs7" },
  "jcpriority@provision.app":       { crewName: "JC Priority Solutions",             pin: "1395", token: "jcps-sv-9vl4" },
  "iandia@provision.app":           { crewName: "I&A Painting",                      pin: "7832", token: "ianda-pt-5ew1" },
  "veliz@provision.app":            { crewName: "VELIZ Construction Services",       pin: "4260", token: "veliz-cs-7qb8" },
  "triplex@provision.app":          { crewName: "Triplex Solutions",                 pin: "8519", token: "triplex-sv-2ux6" },
  "acmapainting@provision.app":     { crewName: "Acma Painting",                     pin: "3074", token: "acmap-pt-4zy3" },
  "cesar@provision.app":            { crewName: "Cesar Painting",                    pin: "6891", token: "cesar-pt-6nm9" },
  "apgalactic@provision.app":       { crewName: "AP Galactic",                       pin: "2437", token: "apgal-sv-1kd5" },
  "jgevenezer@provision.app":       { crewName: "JG Evenezer Corp",                  pin: "9065", token: "jgev-cn-8ph2" },
  "mrsunshinecrew@provision.app":   { crewName: "Mr. Sunshine",                      pin: "5382", token: "mrshine-sv-3wr7" },
  "bigwave@provision.app":          { crewName: "Big Wave",                           pin: "1746", token: "bigwave-pt-9cf4" },
  "mxnconstruction@provision.app":  { crewName: "MXN Construction",                  pin: "8203", token: "mxn-cn-5jg1" },
  "servicepaint@provision.app":     { crewName: "Service Paint & Remodeling",        pin: "3961", token: "spr-pt-7ym8" },
  "smlconstruction@provision.app":  { crewName: "SML Construction Corp",             pin: "6524", token: "sml-cn-2bt5" },
  "velizconst@provision.app":       { crewName: "Veliz Construction",                pin: "9178", token: "velizc-cn-4hv3" },
  "completeext@provision.app":      { crewName: "Complete Exteriors Renovations LLC", pin: "4037", token: "cer-sv-6xq9" },
  "drluminous@provision.app":       { crewName: "D&R Luminous",                      pin: "7613", token: "drl-sv-1mz6" },
  "wmsolutions@provision.app":      { crewName: "WM Solutions",                      pin: "2850", token: "wms-sv-8pk2" },
  "silvioramos@provision.app":      { crewName: "Silvio Ramos Painting",             pin: "5394", token: "silvior-pt-3fl7" },
  "divelco@provision.app":          { crewName: "Divelco Construction",              pin: "8071", token: "divelco-cn-9gs4" },
  "seventeen17@provision.app":      { crewName: "1717 Painting",                     pin: "3628", token: "1717-pt-5dw1" },
  "provisionteam@provision.app":    { crewName: "Pro-Vision Team",                   pin: "1111", token: "pvteam-in-7rn8" },
  "dgpainting@provision.app":       { crewName: "DG Painting Solutions",             pin: "6245", token: "dg-pt-2jc5" },
  "magicalmike@provision.app":      { crewName: "Magical Mike's Handyman Services",  pin: "9703", token: "mmike-hs-4vb3" },
  "protagon@provision.app":         { crewName: "Protagon Home Improvement",         pin: "4162", token: "protagon-hi-6ky9" },
  "ome@provision.app":              { crewName: "OME Construction",                  pin: "7839", token: "ome-cn-1nf6" },
  "perfectplace@provision.app":     { crewName: "Perfect Place Services",            pin: "2507", token: "pps-sv-8ew2" },
  "dkanda@provision.app":           { crewName: "D-Kanda",                           pin: "5984", token: "dkanda-sv-3qh7" },
};

/** Reverse-lookup: token → login entry */
export const TOKEN_TO_LOGIN: Record<string, ContractorLogin & { email: string }> =
  Object.fromEntries(
    Object.entries(CONTRACTOR_LOGINS).map(([email, login]) => [
      login.token,
      { ...login, email },
    ])
  );

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

/**
 * Look up a crew by their secret token (for /crew/[token] links).
 * Returns the crew name on success, null if token is invalid.
 */
export function crewNameByToken(token: string | undefined | null): string | null {
  if (!token) return null;
  return TOKEN_TO_LOGIN[token]?.crewName ?? null;
}

/**
 * Get all active crew names (for dropdown menus, etc.)
 */
export const ALL_CREW_NAMES: string[] = Object.values(CONTRACTOR_LOGINS)
  .map((l) => l.crewName)
  .sort();
