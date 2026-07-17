"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { timeAgo } from "@/lib/utils";
import { posts as postsApi, profiles } from "@/lib/services";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import type { PostComment } from "@/lib/types";
import { CloseIcon } from "./Icons";

/** Scrollable comment list (account photo + name + text) with an add-comment box. */
export default function CommentsPanel({
  postId,
  initial,
  onClose,
}: {
  postId: number;
  initial: PostComment[];
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostComment[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Always refetch on mount so comments added in a previous open (persisted server-side but
  // not reflected in the parent's stale `initial`) show up again. Merge to keep any name/photo
  // the feed already embedded — get-post-by-id returns comments without them.
  useEffect(() => {
    let alive = true;
    postsApi
      .byId(postId)
      .then((res) => {
        const fetched = res.data?.comments;
        if (!alive || !fetched?.length) return;
        setComments((prev) => {
          const known = new Map(prev.map((c) => [c.postCommentId, c]));
          return fetched.map((c) => {
            const had = known.get(c.postCommentId);
            return had ? { ...c, userName: c.userName ?? had.userName, userImage: c.userImage ?? had.userImage } : c;
          });
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [postId]);

  // get-post-by-id returns comments without name/photo — fill them from each commenter's profile.
  // ponytail: one profile fetch per unique commenter; batch endpoint if threads get large.
  useEffect(() => {
    const ids = [...new Set(comments.filter((c) => !c.userName).map((c) => c.userId))];
    if (!ids.length) return;
    let alive = true;
    Promise.all(
      ids.map((id) =>
        profiles
          .byId(id)
          .then((r) => [id, r.data] as const)
          .catch(() => null),
      ),
    ).then((pairs) => {
      if (!alive) return;
      const map = new Map(pairs.filter((p): p is NonNullable<typeof p> => !!p));
      if (!map.size) return; // nothing resolved — don't churn the array and re-trigger
      setComments((cs) =>
        cs.map((c) => {
          const p = map.get(c.userId);
          return p ? { ...c, userName: p.userName, userImage: p.image } : c;
        }),
      );
    });
    return () => {
      alive = false;
    };
  }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const temp: PostComment = {
      postCommentId: Date.now(),
      userId: user?.id ?? "me",
      userName: user?.userName ?? "You",
      userImage: user?.image ?? null,
      dateCommented: new Date().toISOString(),
      comment: text,
    };
    setComments((c) => [temp, ...c]);
    setDraft("");
    try {
      await postsApi.addComment(postId, text);
    } catch {
      setComments((c) => c.filter((x) => x.postCommentId !== temp.postCommentId));
      toast("Couldn't post your comment");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {onClose && (
        <div className="relative flex items-center justify-center border-b border-line px-4 py-3">
          <span className="font-semibold">Comments</span>
          <button onClick={onClose} aria-label="Close" className="absolute left-4">
            <CloseIcon size={22} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No comments yet</p>
        ) : (
          [...comments]
            .sort((a, b) => +new Date(b.dateCommented) - +new Date(a.dateCommented))
            .map((c) => (
            <div key={c.postCommentId} className="flex gap-3 py-2.5">
              <Link href={`/u/${c.userId}`} className="shrink-0">
                <Avatar src={c.userImage} name={c.userName} size={36} />
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <Link href={`/u/${c.userId}`} className="mr-1.5 font-semibold hover:opacity-70">
                    {c.userName}
                  </Link>
                  {c.comment}
                </p>
                <span className="text-xs text-neutral-500">{timeAgo(c.dateCommented)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="text-sm font-semibold text-ig-blue disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </div>
  );
}
