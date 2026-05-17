import { resolveApiBaseUrl } from "./network";

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

export type PublicAppRelease = {
  id: string;
  app_type: "user" | "rider";
  version_name: string;
  version_code?: string | null;
  release_notes?: string | null;
  file_name: string;
  file_size: number;
  sha256: string;
  download_path: string;
  download_url: string;
  uploaded_at: string;
  uploaded_by?: string | null;
};

export type LatestAppReleases = {
  user: PublicAppRelease | null;
  rider: PublicAppRelease | null;
};

export const getLatestAppReleases = async (): Promise<LatestAppReleases> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/app-releases/latest`);
  if (!response.ok) {
    throw new Error(`Unable to load app downloads (${response.status})`);
  }
  return response.json();
};
