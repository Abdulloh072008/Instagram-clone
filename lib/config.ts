// Central config for the Instagram clone frontend.
// Backend: https://instagram-api.softclub.tj/swagger/index.html

export const API_BASE = process.env.NEXT_PUBLIC_API_URL;
export const IMAGE_BASE = `${API_BASE}/images`;

/** Build a full URL for an image filename returned by the API. */
export function imageUrl(name?: string | null): string {
  if (!name) return "";
  if (name.startsWith("http")) return name;
  return `${IMAGE_BASE}/${name}`;
}

export const TOKEN_KEY = "ig_token";
