"use client";

import { useEffect, useState } from "react";
import { postApi, storyApi, mediaUrl, type Post } from "@/lib/api";
import type { Story } from "@/lib/api/story";
import { useLog, Btn, Avatar, Modal, Input, Icon, fmtDate } from "./ui";

const isImg = (f?: string) => !!f && /\.(png|jpe?g|gif|webp)$/i.test(f);
const isVideo = (f?: string) => !!f && /\.(mp4|webm|mov)$/i.test(f);

/** Медиа поста/рила: картинка или видео. Медиа грузится лениво. */
export function Media({ file, className, eager }: { file?: string; className?: string; eager?: boolean }) {
  if (isVideo(file))
    return <video src={mediaUrl(file)} controls preload="metadata" playsInline className={className} />;
  if (isImg(file))
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(file)} alt="" loading={eager ? "eager" : "lazy"} decoding="async" className={className} />;
  return <div className={"grid place-items-center text-xs text-[#8e8e8e] bg-black/5 dark:bg-white/5 " + (className ?? "")}>нет медиа</div>;
}

/** Плитка поста в сетке. */
export function PostThumb({ post, onClick }: { post: Post; onClick: () => void }) {
  const file = Array.isArray(post.images) ? post.images[0] : (post.images as unknown as string);
  return (
    <button onClick={onClick} className="relative aspect-square overflow-hidden group">
      <Media file={file} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white text-sm gap-4 grid-flow-col font-semibold">
        <span className="flex items-center gap-1.5"><Icon name="heart" size={18} fill /> {post.postLikeCount}</span>
        <span className="flex items-center gap-1.5"><Icon name="comment" size={18} fill /> {post.commentCount}</span>
      </div>
    </button>
  );
}

/** Полноэкранная модалка поста: медиа + лайк/избранное + комментарии. */
export function PostModal({ postId, myId, onClose, onChanged }: { postId: number; myId?: string; onClose: () => void; onChanged?: () => void }) {
  const { run } = useLog();
  const [post, setPost] = useState<Post | null>(null);
  const [text, setText] = useState("");

  const load = () => run("get-post-by-id", () => postApi.getPostById(postId)).then((r) => setPost(r.data)).catch(() => {});

  useEffect(() => {
    run("view-post", () => postApi.viewPost(postId)).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // like-post и add-post-favorite на бэке — переключатели. Меняем состояние
  // оптимистично (мгновенно), запрос шлём в фоне, без перезапроса поста.
  const toggleLike = () => {
    if (!post) return;
    const willUnlike = post.postLike;
    setPost((p) => (p ? { ...p, postLike: !p.postLike, postLikeCount: Math.max(0, p.postLikeCount + (p.postLike ? -1 : 1)) } : p));
    run(willUnlike ? "снять лайк (like-post)" : "лайк (like-post)", () => postApi.likePost(postId)).then(() => onChanged?.()).catch(() => {});
  };
  const toggleFav = () => {
    if (!post) return;
    const willRemove = post.postFavorite;
    setPost((p) => (p ? { ...p, postFavorite: !p.postFavorite } : p));
    run(willRemove ? "убрать из избранного" : "в избранное", () => postApi.addPostFavorite({ postId })).catch(() => {});
  };

  const imgs = post ? (Array.isArray(post.images) ? post.images : [post.images as unknown as string]) : [];

  return (
    <Modal onClose={onClose} wide>
      <div className="grid sm:grid-cols-[1.2fr_1fr] max-h-[90vh]">
        <div className="bg-black flex items-center overflow-x-auto snap-x">
          {imgs.length ? imgs.map((f, i) => <Media key={i} file={f} className="w-full h-full max-h-[90vh] object-contain snap-center shrink-0" />) : <div className="aspect-square w-full" />}
        </div>
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2.5 p-3.5 border-b border-black/[.07] dark:border-white/10">
            <Avatar src={post?.userImage} name={post?.userName ?? ""} size={32} />
            <b className="text-sm">{post?.userName ?? "…"}</b>
            <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100 transition"><Icon name="x" size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {post?.title && <div className="text-sm"><b>{post.title}</b> {post.content}</div>}
            {post?.comments?.length ? (
              post.comments.map((c) => (
                <div key={c.postCommentId} className="flex items-start gap-2 text-sm">
                  <Avatar src={c.userImage} name={c.userName ?? ""} size={26} />
                  <div className="flex-1">
                    <b>@{c.userName ?? "user"}</b> {c.comment}
                    <div className="text-[10px] opacity-40">{fmtDate(c.dateCommented)}</div>
                  </div>
                  {(c.userId === myId) && (
                    <button
                      className="text-xs opacity-50 hover:text-red-500"
                      onClick={() => run("delete-comment", () => postApi.deleteComment(c.postCommentId)).then(load)}
                    >
                      удалить
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs opacity-40">комментариев нет</div>
            )}
          </div>

          <div className="p-3 border-t border-black/[.07] dark:border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center gap-4">
              <button
                className={"transition hover:opacity-70 active:scale-90 " + (post?.postLike ? "text-[#ed4956]" : "")}
                onClick={toggleLike}
              >
                <Icon name="heart" size={24} fill={post?.postLike} />
              </button>
              <button className="transition hover:opacity-70" onClick={() => document.getElementById("pm-comment")?.focus()}>
                <Icon name="comment" size={24} />
              </button>
              <button
                className="transition hover:opacity-70 active:scale-90"
                onClick={toggleFav}
              >
                <Icon name="bookmark" size={24} fill={post?.postFavorite} />
              </button>
              {post?.userId === myId && (
                <button className="ml-auto text-[#ed4956] hover:opacity-70 transition" title="Удалить пост" onClick={() => run("deletePostSafe", () => postApi.deletePostSafe(postId)).then(() => { onChanged?.(); onClose(); })}>
                  <Icon name="trash" size={20} />
                </button>
              )}
            </div>
            <div className="text-sm font-semibold">{post?.postLikeCount ?? 0} отметок «Нравится»</div>
            <div className="flex items-center gap-1.5 text-xs opacity-50">
              <Icon name="eye" size={14} /> {post?.postView ?? 0} просмотров
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                run("add-comment", () => postApi.addComment({ comment: text, postId })).then(() => { setText(""); load(); });
              }}
            >
              <Input id="pm-comment" placeholder="Добавить комментарий…" value={text} onChange={(e) => setText(e.target.value)} className="flex-1" />
              <Btn type="submit" variant="ghost" disabled={!text.trim()}><Icon name="send" size={16} /></Btn>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Просмотр сторис: засчитывает просмотр, можно лайкнуть/удалить. */
export function StoryViewer({ storyId, myId, onClose, onChanged }: { storyId: number; myId?: string; onClose: () => void; onChanged?: () => void }) {
  const { run } = useLog();
  const [story, setStory] = useState<Story | null>(null);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    run("add-story-view", () => storyApi.addStoryView(storyId)).catch(() => {});
    run("GetStoryById", () => storyApi.getStoryById(storyId)).then((r) => { setStory(r.data); setLiked(Boolean(r.data?.viewerDto?.viewLike)); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // LikeStory на бэке — переключатель. Меняем сердце мгновенно.
  const toggleLike = () => {
    const willUnlike = liked;
    setLiked((v) => !v);
    run(willUnlike ? "снять лайк сторис (LikeStory)" : "лайк сторис (LikeStory)", () => storyApi.likeStory(storyId)).catch(() => {});
  };

  return (
    <Modal onClose={onClose}>
      <div className="relative">
        <Media file={story?.fileName} className="w-full max-h-[80vh] object-contain bg-black" />
        <div className="absolute top-0 inset-x-0 p-3.5 flex items-center gap-2.5 bg-gradient-to-b from-black/70 to-transparent text-white">
          <Avatar src={story?.userAvatar} name={story?.userId ?? ""} size={30} />
          <b className="text-sm">{story?.viewerDto?.userName ?? story?.userId?.slice(0, 6)}</b>
          <span className="flex items-center gap-1.5 text-xs opacity-80">
            <Icon name="eye" size={13} /> {story?.viewerDto?.viewCount ?? 0}
            <Icon name="heart" size={13} className="ml-1" /> {story?.viewerDto?.viewLike ?? 0}
          </span>
          <button onClick={onClose} className="ml-auto opacity-80 hover:opacity-100 transition"><Icon name="x" size={22} /></button>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center gap-4 bg-gradient-to-t from-black/70 to-transparent text-white">
          <button className={"hover:opacity-70 transition active:scale-90 " + (liked ? "text-[#ed4956]" : "")} onClick={toggleLike}><Icon name="heart" size={26} fill={liked} /></button>
          {story?.userId === myId && (
            <button className="ml-auto text-[#ed4956] hover:opacity-70 transition" title="Удалить" onClick={() => run("DeleteStory", () => storyApi.deleteStory(storyId)).then(() => { onChanged?.(); onClose(); })}>
              <Icon name="trash" size={22} />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
