"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import LockedProfile from "@/components/LockedProfile";
import { profiles, posts as postsApi, privacy, followRequests } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post, UserProfile } from "@/lib/types";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [reqStatus, setReqStatus] = useState("none");
  const [loading, setLoading] = useState(true);

  const isMe = user?.id === id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      profiles.byId(id),
      postsApi.byUser(id, 1, 30),
      profiles.isFollowing(id).catch(() => ({ data: false })),
      privacy.get(id).catch(() => null),
      user?.id ? followRequests.status(user.id, id).catch(() => null) : Promise.resolve(null),
    ])
      .then(([p, posts, follow, priv, st]) => {
        setProfile(p.data);
        setUserPosts(posts.data ?? []);
        setFollowing(Boolean((follow as { data: boolean }).data));
        setIsPrivate(Boolean((priv as { data?: { isPrivate?: boolean } } | null)?.data?.isPrivate));
        setReqStatus((st as { data?: string } | null)?.data ?? "none");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  if (loading || !profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  // Закрытый аккаунт: контент скрыт, пока не подписан / запрос не одобрен.
  const locked = isPrivate && !isMe && !following && reqStatus !== "approved";
  if (locked) return <LockedProfile userId={id} profile={profile} initialStatus={reqStatus} />;

  return (
    <ProfileView userId={id} profile={profile} posts={userPosts} isMe={isMe} isFollowing={following} />
  );
}
