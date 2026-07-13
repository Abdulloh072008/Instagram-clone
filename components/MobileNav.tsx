"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Avatar from "./Avatar";
import { HomeIcon, HomeFilled, SearchIcon, ReelsIcon, PlusSquare, MessageIcon } from "./Icons";

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const active = (h: string) => (h === "/" ? pathname === "/" : pathname.startsWith(h));

  return (
    <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-line bg-black/95 py-2.5 backdrop-blur md:hidden">
      <Link href="/">{active("/") ? <HomeFilled size={26} /> : <HomeIcon size={26} />}</Link>
      <Link href="/explore">
        <SearchIcon size={26} />
      </Link>
      <Link href="/reels">
        <ReelsIcon size={26} />
      </Link>
      <Link href="/create">
        <PlusSquare size={26} />
      </Link>
      <Link href="/messages">
        <MessageIcon size={26} />
      </Link>
      <Link href="/profile">
        <div className={active("/profile") ? "rounded-full ring-2 ring-white" : ""}>
          <Avatar name={user?.userName} size={26} />
        </div>
      </Link>
    </nav>
  );
}
