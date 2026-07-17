"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import LockedProfile from "@/components/LockedProfile";
import { ProfileSkeleton } from "@/components/Skeleton";
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

  // Profile + posts от softclub — только это блокирует показ профиля.
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      profiles.byId(id),
      postsApi.byUser(id, 1, 30),
      profiles.isFollowing(id).catch(() => false),
    ])
      .then(([p, posts, follow]) => {
        setProfile(p.data);
        setUserPosts(posts.data ?? []);
        setFollowing(follow);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Приватность/статус запроса — доп-бэк (Render), НЕ блокирует показ профиля:
  // если бэкенд «спит», профиль всё равно открывается сразу.
  useEffect(() => {
    if (!id) return;
    privacy.get(id).then((r) => setIsPrivate(Boolean(r.data?.isPrivate))).catch(() => {});
    if (user?.id) followRequests.status(user.id, id).then((r) => setReqStatus(r.data ?? "none")).catch(() => {});
  }, [id, user?.id]);

  if (loading || !profile) return <ProfileSkeleton />;

  // Закрытый аккаунт: контент скрыт, пока не подписан / запрос не одобрен.
  const locked = isPrivate && !isMe && !following && reqStatus !== "approved";
  if (locked) return <LockedProfile userId={id} profile={profile} initialStatus={reqStatus} />;

  return (
    <ProfileView userId={id} profile={profile} posts={userPosts} isMe={isMe} isFollowing={following} />
  );
}
