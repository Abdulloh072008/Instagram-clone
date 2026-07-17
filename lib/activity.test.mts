import { test } from "node:test";
import assert from "node:assert/strict";
import { buildActivity, groupActivity } from "./activity.ts";
import type { Post } from "./types.ts";

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function post(over: Partial<Post>): Post {
  return {
    postId: 1,
    userId: "me",
    userName: "me",
    userImage: null,
    datePublished: ago(0),
    images: ["img.jpg"],
    postLike: false,
    postLikeCount: 0,
    userLikes: null,
    commentCount: 0,
    comments: [],
    postView: 0,
    userViews: null,
    postFavorite: false,
    userFavorite: null,
    title: null,
    content: null,
    ...over,
  };
}

function comment(over: Partial<Post["comments"][number]>) {
  return {
    postCommentId: 1,
    userId: "alex",
    userName: "alex",
    userImage: null,
    dateCommented: ago(0),
    comment: "nice",
    ...over,
  };
}

test("buildActivity turns comments on my posts into activity items", () => {
  const items = buildActivity(
    [post({ postId: 7, images: ["p7.jpg"], comments: [comment({ comment: "great shot" })] })],
    "me",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].fromUserName, "alex");
  assert.equal(items[0].text, "commented: great shot");
  assert.equal(items[0].postId, 7);
  assert.equal(items[0].postImage, "p7.jpg");
});

test("buildActivity skips my own comments on my own posts", () => {
  const items = buildActivity(
    [post({ comments: [comment({ userId: "me" }), comment({ postCommentId: 2, userId: "alex" })] })],
    "me",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].fromUserId, "alex");
});

test("buildActivity sorts newest first across posts", () => {
  const items = buildActivity(
    [
      post({ postId: 1, comments: [comment({ postCommentId: 1, dateCommented: ago(60_000) })] }),
      post({ postId: 2, comments: [comment({ postCommentId: 2, dateCommented: ago(1_000) })] }),
    ],
    "me",
  );
  assert.deepEqual(
    items.map((i) => i.postId),
    [2, 1],
  );
});

test("buildActivity handles a post with no comments", () => {
  assert.deepEqual(buildActivity([post({ comments: [] })], "me"), []);
});

test("groupActivity buckets by recency and drops empty sections", () => {
  const items = buildActivity(
    [
      post({ postId: 1, comments: [comment({ postCommentId: 1, dateCommented: ago(1_000) })] }),
      post({ postId: 2, comments: [comment({ postCommentId: 2, dateCommented: ago(9 * 86_400_000) })] }),
    ],
    "me",
  );
  const groups = groupActivity(items);
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Today", "Earlier"],
  );
});
