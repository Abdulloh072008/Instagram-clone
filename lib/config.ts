// Central config for the Instagram clone frontend.
// Backend: https://instagram-api.softclub.tj/swagger/index.html

// Overridable via env, with safe defaults so the app works without a .env file.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://instagram-api.softclub.tj";
export const IMAGE_BASE = `${API_BASE}/images`;

// Companion backend (C#) for features missing in the main API — no JWT,
// controllers take userId explicitly. Hosts Notification/Call/Reaction/Repost/Location.
export const EXTRA_API_BASE =
  process.env.NEXT_PUBLIC_EXTRA_API_URL?.replace(/\/$/, "") ?? "https://instagramextraapi.onrender.com";

// Rich social backend (FastAPI, own JWT auth) for chat, notifications,
// comment/message reactions and recommendations. Base path is /api.
export const INSTA2_BASE =
  (process.env.NEXT_PUBLIC_INSTA2_URL?.replace(/\/$/, "") ?? "https://backend-insta-jma5.onrender.com") +
  "/api";

/** Build a full URL for an image filename returned by the API. */
export function imageUrl(name?: string | null): string {
  if (!name) return "";
  if (name.startsWith("http")) return name;
  return `${IMAGE_BASE}/${name}`;
}

export const TOKEN_KEY = "ig_token";
