"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Avatar from "./Avatar";
import {
  HomeIcon,
  HomeFilled,
  SearchIcon,
  ReelsIcon,
  MessageIcon,
  PlusSquare,
  BellIcon,
  MenuIcon,
} from "./Icons";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsedManual, setCollapsedManual] = useState(false);

  const collapsed = collapsedManual;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const showLabels = !collapsed;
  const labelCls = showLabels ? "hidden xl:block" : "hidden";

  // Render helper (plain function, not a component — avoids remounting on render).
  const navLink = (
    href: string,
    label: string,
    Icon: typeof HomeIcon,
    ActiveIcon: typeof HomeIcon,
  ) => {
    // Icon state follows the route only — not the collapsed state — so toggling
    // the menu never swaps filled/outline (which looks like the icon resizing).
    const active = isActive(href);
    const I = active ? ActiveIcon : Icon;
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900 ${
          active ? "font-semibold" : "font-normal"
        }`}
      >
        <I size={26} />
        <span className={labelCls}>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={`sticky top-0 z-50 hidden h-screen w-[72px] shrink-0 flex-col border-r border-line bg-black px-3 py-6 transition-[width] duration-300 ease-out md:flex ${
        collapsed ? "" : "xl:w-64"
      }`}
    >
      {/* Collapse toggle + logo */}
      <div className="mb-8 flex items-center gap-1 px-1.5">
        <button
          onClick={() => setCollapsedManual((o) => !o)}
          aria-label={collapsedManual ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-lg p-2 transition hover:bg-neutral-900"
        >
          <MenuIcon size={24} />
        </button>
        <Link href="/" className={labelCls}>
          <span className="text-2xl font-semibold tracking-tight">Instagram</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navLink("/", "Home", HomeIcon, HomeFilled)}
        {navLink("/explore", "Search", SearchIcon, SearchIcon)}
        {navLink("/reels", "Reels", ReelsIcon, ReelsIcon)}
        {navLink("/messages", "Messages", MessageIcon, MessageIcon)}
        {navLink("/notifications", "Notifications", BellIcon, BellIcon)}
        {navLink("/create", "Create", PlusSquare, PlusSquare)}
      </nav>

      {/* Profile pinned to the bottom, showing the user's avatar. */}
      <Link
        href="/profile"
        className={`mt-2 flex items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900 ${
          isActive("/profile") && !collapsed ? "font-semibold" : "font-normal"
        }`}
      >
        <Avatar src={user?.image} name={user?.userName} size={26} />
        <span className={labelCls}>Profile</span>
      </Link>
    </aside>
  );
}
