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
  MenuIcon,
} from "./Icons";

type Panel = "search" | "notifications" | null;

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [rendered, setRendered] = useState<Panel>(null);
  const [unread, setUnread] = useState(0);
  const [collapsedManual, setCollapsedManual] = useState(false);

  // Keep the panel content mounted while it slides out, so closing animates too.
  useEffect(() => {
    if (panel) setRendered(panel);
  }, [panel]);

  // Collapsed when the user toggles it, or while a slide-out panel is open.
  const collapsed = collapsedManual || panel !== null;

  // Poll the unread notification count. The extra API (onrender free tier) can be asleep or
  // unreachable (ERR_CONNECTION_CLOSED) — back off after a few failures so it doesn't spam.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    let fails = 0;
    let t: ReturnType<typeof setInterval>;
    const load = () =>
      notifApi
        .unreadCount(uid)
        .then((res) => {
          if (!alive) return;
          fails = 0;
          setUnread(Number(res.data) || 0);
        })
        .catch(() => {
          if (++fails >= 3) clearInterval(t);
        });
    load();
    t = setInterval(load, 30_000);
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

  // Render helpers (plain functions, not components — avoids remounting on render).
  const navLink = (
    href: string,
    label: string,
    Icon: typeof HomeIcon,
    ActiveIcon: typeof HomeIcon,
  ) => {
    const active = isActive(href) && !collapsed;
    const I = active ? ActiveIcon : Icon;
    return (
      <Link
        key={href}
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

  const navButton = (p: Panel, label: string, Icon: typeof HomeIcon, badge?: number) => (
    <button
      key={label}
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
          <Link href="/" onClick={closePanel} className={labelCls}>
            <span className="text-2xl font-semibold tracking-tight">Instagram</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navLink("/", "Home", HomeIcon, HomeFilled)}
          {navButton("search", "Search", SearchIcon)}
          {navLink("/reels", "Reels", ReelsIcon, ReelsIcon)}
          {navLink("/messages", "Messages", MessageIcon, MessageIcon)}
          {navButton("notifications", "Notifications", BellIcon, unread)}
          {navLink("/profile", "Profile", ProfileIcon, ProfileIcon)}
          {navLink("/create", "Create", PlusSquare, PlusSquare)}
        </nav>

        {/* Slide-out panel — absolute so it tracks the (centered) sidebar
            instead of the viewport edge, at any screen width. Stays mounted so
            open and close both animate; content clears once it's fully closed. */}
        <div
          onTransitionEnd={() => !panel && setRendered(null)}
          className={`absolute left-full top-0 z-40 hidden h-screen w-[397px] max-w-[calc(100vw-72px)] overflow-hidden rounded-r-2xl border-r border-line bg-black shadow-2xl transition-all duration-300 ease-out md:block ${
            panel ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"
          }`}
        >
          {rendered === "search" ? (
            <SearchPanel onNavigate={closePanel} />
          ) : rendered === "notifications" ? (
            <NotificationsPanel onNavigate={closePanel} />
          ) : null}
        </div>
      </aside>

      {/* click-away backdrop (desktop only) */}
      {panel && <div className="fixed inset-0 z-30 hidden md:block" onClick={closePanel} />}
    </>
  );
}
