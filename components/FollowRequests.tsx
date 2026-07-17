"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { followRequests, type FollowRequestDto } from "@/lib/services";
import { useAuth } from "@/lib/auth";

/** Входящие запросы на подписку (для приватного аккаунта) — подтвердить/удалить. */
export default function FollowRequests() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<FollowRequestDto[]>([]);

  const load = () => { if (user?.id) followRequests.incoming(user.id).then((r) => setReqs(r.data ?? [])).catch(() => {}); };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (reqs.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-line bg-elevated p-4">
      <h2 className="mb-3 text-sm font-semibold">Follow requests</h2>
      {reqs.map((r) => (
        <div key={r.id} className="flex items-center gap-3 py-1.5">
          <Link href={`/u/${r.requesterId}`} className="shrink-0">
            <Avatar src={r.requesterImage} name={r.requesterName} size={40} />
          </Link>
          <Link href={`/u/${r.requesterId}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:opacity-70">
            {r.requesterName}
          </Link>
          <button
            onClick={() => followRequests.approve(r.id).then(load).catch(() => {})}
            className="rounded-md bg-ig-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-ig-blue-hover"
          >
            Confirm
          </button>
          <button
            onClick={() => { setReqs((x) => x.filter((y) => y.id !== r.id)); followRequests.decline(r.id).catch(() => {}); }}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-700"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
