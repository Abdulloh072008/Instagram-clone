"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  HomeIcon,
  HomeFilled,
  SearchIcon,
  ReelsIcon,
  MessageIcon,
  ProfileIcon,
  PlusSquare,
  MenuIcon,
  SettingsIcon,
} from "./Icons";
import Avatar from "./Avatar";

const items = [
  { href: "/", label: "Home", icon: HomeIcon, active: HomeFilled },
  { href: "/explore", label: "Search", icon: SearchIcon, active: SearchIcon },
  { href: "/reels", label: "Reels", icon: ReelsIcon, active: ReelsIcon },
  { href: "/messages", label: "Messages", icon: MessageIcon, active: MessageIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon, active: ProfileIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col border-r border-line px-3 py-6 md:flex xl:w-64">
      <Link href="/" className="mb-8 px-3">
        <span className="hidden text-2xl font-semibold tracking-tight xl:block">Instagram</span>
        <span className="text-2xl xl:hidden">◈</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((it) => {
          const Active = isActive(it.href);
          const Icon = Active ? it.active : it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900 ${
                Active ? "font-semibold" : "font-normal"
              }`}
            >
              <Icon size={26} />
              <span className="hidden xl:block">{it.label}</span>
            </Link>
          );
        })}

        <Link
          href="/create"
          className="flex items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900"
        >
          <PlusSquare size={26} />
          <span className="hidden xl:block">Create</span>
        </Link>
      </nav>

      <div className="relative mt-auto">
        {menuOpen && (
          <div className="animate-fade absolute bottom-14 left-0 w-56 overflow-hidden rounded-xl border border-line bg-elevated py-2 shadow-xl">
            <button
              onClick={() => {
                setMenuOpen(false);
                router.push("/profile/edit");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-neutral-800"
            >
              <SettingsIcon size={18} /> Settings
            </button>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ig-red hover:bg-neutral-800"
            >
              Log out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900"
        >
          <MenuIcon size={26} />
          <span className="hidden xl:block">More</span>
        </button>
        <Link
          href="/profile"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-900"
        >
          <Avatar name={user?.userName} size={26} />
          <span className="hidden truncate text-sm xl:block">{user?.userName}</span>
        </Link>
      </div>
    </aside>
  );
}
