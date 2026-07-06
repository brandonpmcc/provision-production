/**
 * CompanyCam API client.
 * All calls run server-side via API routes — never expose the token to the browser.
 */

const BASE = "https://api.companycam.com/v2";
const TOKEN = process.env.COMPANYCAM_TOKEN;

if (!TOKEN && typeof window === "undefined") {
  console.warn("[companycam] COMPANYCAM_TOKEN is not set — queries will fail.");
}

async function cc<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`CompanyCam ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface CCProject {
  id: number;
  name: string;
  address: {
    street_address_1: string;
    city: string;
    state: string;
    postal_code: string;
  };
  status: string;
  public_url: string;
  primary_photo_uri: string | null;
  photo_count: number;
}

export interface CCPhoto {
  id: number;
  project_id: number;
  uri: string;
  captured_at: string;
  description: string | null;
}

/** Search projects by address — used to auto-link Airtable deals to CompanyCam projects */
export async function searchProjectsByAddress(query: string): Promise<CCProject[]> {
  const params = new URLSearchParams({ query, per_page: "20" });
  const json = await cc<{ projects: CCProject[] }>(`/projects?${params}`);
  return json.projects || [];
}

/** Get a project's photos */
export async function getProjectPhotos(projectId: string, limit = 24): Promise<CCPhoto[]> {
  const json = await cc<{ photos: CCPhoto[] }>(
    `/projects/${projectId}/photos?per_page=${limit}`,
  );
  return json.photos || [];
}

/** Get a single project */
export async function getProject(projectId: string): Promise<CCProject> {
  return cc<CCProject>(`/projects/${projectId}`);
}
