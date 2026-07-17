"use client";

import { useEffect, useState } from "react";
import { blocks, reportsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { MoreIcon } from "./Icons";

/** ⋯ на чужом профиле: заблокировать/разблокировать и пожаловаться. */
export default function ProfileActions({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (user && user.id !== userId) {
      blocks.isBlocked(user.id, userId).then((r) => setBlocked(Boolean(r.data))).catch(() => {});
    }
  }, [user?.id, userId]);

  if (!user || user.id === userId) return null;

  const toggleBlock = () => {
    const next = !blocked;
    setBlocked(next);
    (next ? blocks.add(user.id, userId) : blocks.remove(user.id, userId)).catch(() => setBlocked(!next));
  };

  const report = () => {
    const reason = typeof window !== "undefined" ? window.prompt("Report reason:", "Inappropriate content") : null;
    if (reason?.trim()) reportsApi.add(user.id, "user", userId, reason.trim()).catch(() => {});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="More options" className="rounded-lg bg-neutral-800 p-1.5 hover:bg-neutral-700">
        <MoreIcon size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={report} className="font-semibold">Report</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggleBlock} className="font-semibold text-ig-red">
          {blocked ? "Unblock" : "Block"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
