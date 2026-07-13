import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
  </svg>
);

export const HomeFilled = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-4v-6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v6H4a1 1 0 0 1-1-1V9.5Z" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const ReelsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M3 8h18M8 3l2.5 5M13 3l2.5 5" />
    <path d="m10.5 11 4 2.5-4 2.5V11Z" fill="currentColor" stroke="none" />
  </svg>
);

export const MessageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);

export const ProfileIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.6-10-9.2C.6 8 1.7 4.5 5 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.3 0 4.4 3.5 3 6.3C19.5 15.4 12 20 12 20Z" />
  </svg>
);

export const HeartFilled = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 20s-7.5-4.6-10-9.2C.6 8 1.7 4.5 5 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.3 0 4.4 3.5 3 6.3C19.5 15.4 12 20 12 20Z" />
  </svg>
);

export const CommentIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);

export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 6 4.5Z" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const RepostIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 12V10a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 12v2a4 4 0 0 1-4 4H3" />
  </svg>
);

export const BookmarkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
  </svg>
);

export const BookmarkFilled = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
  </svg>
);

export const MoreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
);

export const PlusSquare = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const BackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9Z" />
  </svg>
);

export const VideoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m22 8-6 4 6 4V8Z" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

export const TaggedIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M8 17a4 4 0 0 1 8 0" />
  </svg>
);

export const SoundOn = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  </svg>
);

export const SoundOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="m17 9 5 5M22 9l-5 5" />
  </svg>
);
