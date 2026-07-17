"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { timeAgo } from "@/lib/utils";
import { posts as postsApi, profiles, commentReplies, type CommentReplyDto } from "@/lib/services";
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
  const [replies, setReplies] = useState<Record<number, CommentReplyDto[]>>({});
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Ответы на комменты (треды) — одним запросом на пост, группируем по комменту.
  useEffect(() => {
    commentReplies
      .byPost(postId)
      .then((res) => {
        const map: Record<number, CommentReplyDto[]> = {};
        for (const r of res.data ?? []) (map[r.postCommentId] ??= []).push(r);
        setReplies(map);
      })
      .catch(() => {});
  }, [postId]);

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

    // Ответ в тред.
    if (replyTo && user) {
      const parent = replyTo.postCommentId;
      const temp: CommentReplyDto = {
        id: Date.now(), postId, postCommentId: parent,
        userId: user.id, userName: user.userName, userImage: user.image ?? null,
        text, createdAt: new Date().toISOString(),
      };
      setReplies((r) => ({ ...r, [parent]: [...(r[parent] ?? []), temp] }));
      setExpanded((e2) => new Set(e2).add(parent));
      setDraft("");
      setReplyTo(null);
      try {
        await commentReplies.add(postId, parent, user.id, user.userName, user.image ?? null, text);
      } catch {
        setReplies((r) => ({ ...r, [parent]: (r[parent] ?? []).filter((x) => x.id !== temp.id) }));
      } finally {
        setSending(false);
      }
      return;
    }

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
            .map((c) => {
              const rs = replies[c.postCommentId] ?? [];
              const open = expanded.has(c.postCommentId);
              return (
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
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500">
                      <span>{timeAgo(c.dateCommented)}</span>
                      <button onClick={() => setReplyTo(c)} className="font-semibold hover:text-neutral-300">Reply</button>
                    </div>

                    {rs.length > 0 && (
                      <button
                        onClick={() =>
                          setExpanded((e) => {
                            const n = new Set(e);
                            if (n.has(c.postCommentId)) n.delete(c.postCommentId);
                            else n.add(c.postCommentId);
                            return n;
                          })
                        }
                        className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-300"
                      >
                        <span className="h-px w-6 bg-neutral-700" />
                        {open ? "Hide replies" : `View ${rs.length} ${rs.length === 1 ? "reply" : "replies"}`}
                      </button>
                    )}

                    {open &&
                      rs.map((r) => (
                        <div key={r.id} className="mt-2 flex gap-2">
                          <Link href={`/u/${r.userId}`} className="shrink-0">
                            <Avatar src={r.userImage} name={r.userName} size={26} />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <p>
                              <Link href={`/u/${r.userId}`} className="mr-1.5 font-semibold hover:opacity-70">
                                {r.userName}
                              </Link>
                              {r.text}
                            </p>
                            <span className="text-xs text-neutral-500">{timeAgo(r.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div className="border-t border-line">
        {replyTo && (
          <div className="flex items-center justify-between px-4 pt-2 text-xs text-neutral-400">
            <span>Replying to <b>{replyTo.userName}</b></span>
            <button onClick={() => setReplyTo(null)} className="hover:text-white">✕</button>
          </div>
        )}
        <form onSubmit={submit} className="flex items-center gap-2 px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.userName}…` : "Add a comment…"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="text-sm font-semibold text-ig-blue disabled:opacity-40"
          >
            {replyTo ? "Reply" : "Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
