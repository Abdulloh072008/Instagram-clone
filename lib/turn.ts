// TURN via metered.ca (free tier). STUN alone can't traverse different NATs
// (home ↔ mobile) — a TURN relay is what makes call audio/video actually flow
// across networks. This endpoint returns a ready RTCIceServer[] with fresh TURN
// credentials, keyed by the API key (the subdomain is irrelevant).
//
// The key is a free-tier TURN quota key and ends up in the client bundle either
// way; hardcoding it means teammates get working TURN without any env setup.
// Override via NEXT_PUBLIC_METERED_CREDENTIALS_URL if the key/account changes.
const CREDENTIALS_URL =
  process.env.NEXT_PUBLIC_METERED_CREDENTIALS_URL ??
  "https://gdhooooood.metered.live/api/v1/turn/credentials?apiKey=04efe08f15e432a58015c59d1114beab9e7a";

let cached: RTCIceServer[] | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;

/** Fetch TURN/STUN servers (cached; concurrent callers share one request). */
export async function fetchTurnServers(): Promise<RTCIceServer[]> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch(CREDENTIALS_URL)
      .then((r) => (r.ok ? r.json() : []))
      .then((s: unknown) => (cached = Array.isArray(s) ? (s as RTCIceServer[]) : []))
      .catch(() => [] as RTCIceServer[])
      .finally(() => (inflight = null));
  }
  return inflight;
}
