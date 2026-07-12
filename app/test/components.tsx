"use client";

import { useEffect, useState } from "react";
import { postApi, storyApi, mediaUrl, type Post } from "@/lib/api";
import type { Story } from "@/lib/api/story";
import { useLog, Btn, Avatar, Modal, Input, fmtDate } from "./ui";

const isImg = (f?: string) => !!f && /\.(png|jpe?g|gif|webp)$/i.test(f);
const isVideo = (f?: string) => !!f && /\.(mp4|webm|mov)$/i.test(f);

/** Медиа поста/рила: картинка или видео. */
export function Media({ file, className }: { file?: string; className?: string }) {
  if (isVideo(file))
    return <video src={mediaUrl(file)} controls className={className} />;
  if (isImg(file))
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(file)} alt="" className={className} />;
  return <div className={"grid place-items-center text-xs opacity-40 bg-black/5 dark:bg-white/5 " + (className ?? "")}>нет медиа</div>;
}

/** Плитка поста в сетке. */
export function PostThumb({ post, onClick }: { post: Post; onClick: () => void }) {
  const file = Array.isArray(post.images) ? post.images[0] : (post.images as unknown as string);
  return (
    <button onClick={onClick} className="relative aspect-square overflow-hidden group">
      <Media file={file} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white text-sm gap-3 grid-flow-col">
        <span>❤️ {post.postLikeCount}</span>
        <span>💬 {post.commentCount}</span>
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

  const imgs = post ? (Array.isArray(post.images) ? post.images : [post.images as unknown as string]) : [];

  return (
    <Modal onClose={onClose} wide>
      <div className="grid sm:grid-cols-[1.2fr_1fr] max-h-[90vh]">
        <div className="bg-black flex items-center overflow-x-auto snap-x">
          {imgs.length ? imgs.map((f, i) => <Media key={i} file={f} className="w-full h-full max-h-[90vh] object-contain snap-center shrink-0" />) : <div className="aspect-square w-full" />}
        </div>
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 p-3 border-b border-black/10 dark:border-white/10">
            <Avatar src={post?.userImage} name={post?.userName ?? ""} size={32} />
            <b className="text-sm">@{post?.userName ?? "…"}</b>
            <button onClick={onClose} className="ml-auto text-xl leading-none">×</button>
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

          <div className="p-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-lg">
              <button onClick={() => run("like-post", () => postApi.likePost(postId)).then(() => { load(); onChanged?.(); })}>
                {post?.postLike ? "❤️" : "🤍"}
              </button>
              <span className="text-sm">{post?.postLikeCount ?? 0}</span>
              <button className="ml-2" onClick={() => run("add-post-favorite", () => postApi.addPostFavorite({ postId })).then(load)}>
                {post?.postFavorite ? "🔖" : "🏷️"}
              </button>
              <span className="text-sm opacity-60">👁 {post?.postView ?? 0}</span>
              {post?.userId === myId && (
                <button className="ml-auto text-xs text-red-500" onClick={() => run("deletePostSafe", () => postApi.deletePostSafe(postId)).then(() => { onChanged?.(); onClose(); })}>
                  удалить пост
                </button>
              )}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                run("add-comment", () => postApi.addComment({ comment: text, postId })).then(() => { setText(""); load(); });
              }}
            >
              <Input placeholder="добавить комментарий…" value={text} onChange={(e) => setText(e.target.value)} className="flex-1" />
              <Btn type="submit">Отпр.</Btn>
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

  useEffect(() => {
    run("add-story-view", () => storyApi.addStoryView(storyId)).catch(() => {});
    run("GetStoryById", () => storyApi.getStoryById(storyId)).then((r) => setStory(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  return (
    <Modal onClose={onClose}>
      <div className="relative">
        <Media file={story?.fileName} className="w-full max-h-[80vh] object-contain bg-black" />
        <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent text-white">
          <Avatar src={story?.userAvatar} name={story?.userId ?? ""} size={30} />
          <b className="text-sm">{story?.viewerDto?.userName ?? story?.userId?.slice(0, 6)}</b>
          <span className="text-xs opacity-80">👁 {story?.viewerDto?.viewCount ?? 0} · ❤️ {story?.viewerDto?.viewLike ?? 0}</span>
          <button onClick={onClose} className="ml-auto text-2xl leading-none">×</button>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3 flex gap-3 bg-gradient-to-t from-black/60 to-transparent text-white text-lg">
          <button onClick={() => run("LikeStory", () => storyApi.likeStory(storyId))}>❤️ лайк</button>
          {story?.userId === myId && (
            <button className="ml-auto text-red-400 text-sm" onClick={() => run("DeleteStory", () => storyApi.deleteStory(storyId)).then(() => { onChanged?.(); onClose(); })}>
              удалить
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
