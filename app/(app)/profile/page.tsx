"use client";

import { useEffect, useState } from "react";
import ProfileView from "@/components/ProfileView";
import { profiles, posts as postsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post, UserProfile } from "@/lib/types";

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([profiles.me(), postsApi.mine(1, 30)])
      .then(([p, posts]) => {
        setProfile(p.data);
        setMyPosts(posts.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return <ProfileView userId={user.id} profile={profile} posts={myPosts} isMe />;
}
