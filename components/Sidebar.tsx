"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { notifications as notifApi } from "@/lib/services";
import SearchPanel from "./SearchPanel";
import NotificationsPanel from "./NotificationsPanel";
import {
  HomeIcon,
  HomeFilled,
  SearchIcon,
  ReelsIcon,
  MessageIcon,
  ProfileIcon,
  PlusSquare,
  BellIcon,
} from "./Icons";
import Avatar from "./Avatar";

type Panel = "search" | "notifications" | null;

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [unread, setUnread] = useState(0);

  const collapsed = panel !== null;

  // Poll the unread notification count (no-op if the backend endpoint isn't live).
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    const load = () =>
      notifApi
        .unreadCount(uid)
        .then((res) => alive && setUnread(Number(res.data) || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user?.id]);

  // Opening the notifications panel clears the badge.
  useEffect(() => {
    if (panel === "notifications") setUnread(0);
  }, [panel]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const closePanel = () => setPanel(null);
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const showLabels = !collapsed;
  const labelCls = showLabels ? "hidden xl:block" : "hidden";

  // Link nav item that also closes any open panel.
  const NavLink = ({
    href,
    label,
    Icon,
    ActiveIcon,
  }: {
    href: string;
    label: string;
    Icon: typeof HomeIcon;
    ActiveIcon: typeof HomeIcon;
  }) => {
    const active = isActive(href) && !collapsed;
    const I = active ? ActiveIcon : Icon;
    return (
      <Link
        href={href}
        onClick={closePanel}
        className={`flex items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900 ${
          active ? "font-semibold" : "font-normal"
        }`}
      >
        <I size={26} />
        <span className={labelCls}>{label}</span>
      </Link>
    );
  };

  // Button nav item that toggles a slide-out panel.
  const NavButton = ({
    p,
    label,
    Icon,
    badge,
  }: {
    p: Panel;
    label: string;
    Icon: typeof HomeIcon;
    badge?: number;
  }) => (
    <button
      onClick={() => togglePanel(p)}
      className={`flex w-full items-center gap-4 rounded-lg px-3 py-3 transition hover:bg-neutral-900 ${
        panel === p ? "font-semibold" : "font-normal"
      }`}
    >
      <span className="relative">
        <Icon size={26} />
        {!!badge && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ig-red px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className={labelCls}>{label}</span>
    </button>
  );

  return (
    <>
      <aside
        className={`sticky top-0 z-50 hidden h-screen w-[72px] shrink-0 flex-col border-r border-line bg-black px-3 py-6 md:flex ${
          collapsed ? "" : "xl:w-64"
        }`}
      >
        <Link href="/" onClick={closePanel} className="mb-8 px-3">
          {collapsed ? (
            <span className="text-2xl">◈</span>
          ) : (
            <>
              <span className="hidden text-2xl font-semibold tracking-tight xl:block">Instagram</span>
              <span className="text-2xl xl:hidden">◈</span>
            </>
          )}
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink href="/" label="Home" Icon={HomeIcon} ActiveIcon={HomeFilled} />
          <NavButton p="search" label="Search" Icon={SearchIcon} />
          <NavLink href="/reels" label="Reels" Icon={ReelsIcon} ActiveIcon={ReelsIcon} />
          <NavLink href="/messages" label="Messages" Icon={MessageIcon} ActiveIcon={MessageIcon} />
          <NavButton p="notifications" label="Notifications" Icon={BellIcon} badge={unread} />
          <NavLink href="/profile" label="Profile" Icon={ProfileIcon} ActiveIcon={ProfileIcon} />
          <NavLink href="/create" label="Create" Icon={PlusSquare} ActiveIcon={PlusSquare} />
        </nav>

        <div className="mt-auto">
          <Link
            href="/profile"
            onClick={closePanel}
            className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-neutral-900"
          >
            <Avatar name={user?.userName} size={26} />
            <span className={`truncate text-sm ${labelCls}`}>{user?.userName}</span>
          </Link>
        </div>
        {/* Slide-out panel — absolute so it tracks the (centered) sidebar
            instead of the viewport edge, at any screen width. */}
        {panel && (
          <div className="animate-fade absolute left-full top-0 z-40 hidden h-screen w-[397px] max-w-[calc(100vw-72px)] overflow-hidden rounded-r-2xl border-r border-line bg-black shadow-2xl md:block">
            {panel === "search" ? (
              <SearchPanel onNavigate={closePanel} />
            ) : (
              <NotificationsPanel onNavigate={closePanel} />
            )}
          </div>
        )}
      </aside>

      {/* click-away backdrop (desktop only) */}
      {panel && <div className="fixed inset-0 z-30 hidden md:block" onClick={closePanel} />}
    </>
  );
}
