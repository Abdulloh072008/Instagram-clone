"use client";

import { useEffect, useState } from "react";
import ProfileView from "@/components/ProfileView";
import { ProfileSkeleton } from "@/components/Skeleton";
import { profiles, posts as postsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post, UserProfile } from "@/lib/types";

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([profiles.me(), postsApi.mine()])
      .then(([p, posts]) => {
        setProfile(p.data);
        setMyPosts(posts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile || !user) return <ProfileSkeleton />;

  return <ProfileView userId={user.id} profile={profile} posts={myPosts} isMe />;
}
