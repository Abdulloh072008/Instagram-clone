"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { ProfileSkeleton } from "@/components/Skeleton";
import { profiles, posts as postsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post, UserProfile } from "@/lib/types";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMe = user?.id === id;

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

  if (loading || !profile) return <ProfileSkeleton />;

  return (
    <ProfileView
      userId={id}
      profile={profile}
      posts={userPosts}
      isMe={isMe}
      isFollowing={following}
    />
  );
}
